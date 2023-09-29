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
    const { serverId, channelId } = req.query;

    if (!profile) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!serverId) {
      return res.status(400).json({ error: "Server ID Missing" });
    }

    if (!channelId) {
      return res.status(400).json({ error: "Channel ID Missing" });
    }

    if (!content) {
      return res.status(400).json({ error: "Content Missing" });
    }

    const server = await db.server.findFirst({
      where: {
        id: serverId as string,
        members: {
          some: {
            profileId: profile.id,
          },
        },
      },
      include: {
        members: {
          include: {
            profile: true,
          },
        },
      },
    });

    // console.log("server user", JSON.stringify(server));

    if (!server) {
      return res.status(404).json({ message: "Server Not Found" });
    }

    const channel = await db.channel.findFirst({
      where: {
        id: channelId as string,
        serverId: serverId as string,
      },
    });

    if (!channel) {
      return res.status(404).json({ message: "Channel Not Found" });
    }

    const member = server.members.find(
      (member) => member.profileId === profile.id
    );

    if (!member) {
      return res.status(404).json({ message: "Member Not Found" });
    }

    const message = await db.message.create({
      data: {
        content,
        fileUrl,
        channelId: channelId as string,
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

    const recipientsIds = server.members
      .map((member) => member.profile.userId)
      .filter((id) => id != member.profileId);

    const recipients = (
      await clerkClient.users.getUserList({
        userId: recipientsIds,
      })
    ).filter(
      (user) =>
        !user.unsafeMetadata.mutedChannels?.includes(channelId as string)
    );

    // console.log("the recipients", JSON.stringify(recipients));

    // send notification to all devices the user subscribed
    const pushPromises = recipients
      .map((recipient) => {
        const subscriptions = recipient.privateMetadata.subscriptions || [];
        return subscriptions.map((subscription) =>
          webPush
            .sendNotification(
              subscription,
              JSON.stringify({
                title: profile.name,
                body: content,
                icon: profile.imageUrl,
                image: fileUrl || null,
                channelId,
                serverId,
              }),
              {
                vapidDetails: {
                  // subject is used for google to reach out if their is a problem
                  // use real email in production
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
            })
        );
      })
      .flat();

    const ser = await Promise.all(pushPromises);

    console.log("the message data", JSON.stringify(ser));

    const channelKey = `chat:${channelId}:messages`;

    res?.socket?.server?.io?.emit(channelKey, message);

    return res.status(200).json(message);
  } catch (error) {
    console.log("[Messages_POST]", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
