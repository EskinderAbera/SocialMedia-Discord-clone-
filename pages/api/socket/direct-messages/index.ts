import { NextApiRequest } from "next";

import { NextApiResponseServerIO } from "@/types";
import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { clerkClient } from "@clerk/nextjs";
import webPush, { WebPushError } from "web-push";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const profile = await currentProfilePages(req);
    const { content, fileUrl } = req.body;
    const { conversationId, serverId } = req.query;

    if (!profile) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID missing" });
    }

    if (!content) {
      return res.status(400).json({ error: "Content missing" });
    }

    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId as string,
        OR: [
          {
            memberOne: {
              profileId: profile.id,
            },
          },
          {
            memberTwo: {
              profileId: profile.id,
            },
          },
        ],
      },
      include: {
        memberOne: {
          include: {
            profile: true,
          },
        },
        memberTwo: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const member =
      conversation.memberOne.profileId === profile.id
        ? conversation.memberOne
        : conversation.memberTwo;

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    const message = await db.directMessage.create({
      data: {
        content,
        fileUrl,
        conversationId: conversationId as string,
        memberId: member.id,
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
    });

    const recipientMember =
      conversation.memberOne.profileId !== profile.id
        ? conversation.memberOne
        : conversation.memberTwo;

    const recipient = await clerkClient.users.getUser(
      recipientMember.profile.userId
    );

    console.log("got the user recipients", recipient);
    console.log("the member Id", member.id);

    const subscriptions = recipient.privateMetadata.subscriptions || [];

    const pushPromises = subscriptions
      .map((subscription) => {
        return webPush
          .sendNotification(
            subscription,
            JSON.stringify({
              title: member.profile.name,
              body: content,
              icon: member.profile.imageUrl,
              image: fileUrl || null,
              channelId: member.id,
              serverId: serverId,
              memberId: member.id,
            }),
            {
              vapidDetails: {
                subject: "mailto:addis@coop.com",
                publicKey: process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || "",
                privateKey: process.env.WEB_PUSH_PRIVATE_KEY || "",
              },
            }
          )
          .catch((error) => {
            console.error("Error sending the push notification", error);
            if (error instanceof WebPushError && error.statusCode === 410) {
              console.error("Push subscription has expired, deleting...");

              clerkClient.users.updateUser(recipient.id, {
                privateMetadata: {
                  subscriptions:
                    recipient.privateMetadata.subscriptions?.filter(
                      (s) => s.endpoint !== subscription.endpoint
                    ),
                },
              });
            }
          });
      })
      .flat();

    await Promise.all(pushPromises);

    const channelKey = `chat:${conversationId}:messages`;

    res?.socket?.server?.io?.emit(channelKey, message);

    return res.status(200).json(message);
  } catch (error) {
    console.log("[DIRECT_MESSAGES_POST]", error);
    return res.status(500).json({ message: "Internal Error" });
  }
}
