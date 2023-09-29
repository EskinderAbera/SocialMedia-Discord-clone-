import { SessionWebhookEvent, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET as string);

    try {
      wh.verify(rawBody, {
        "svix-id": req.headers.get("svix-id") || "",
        "svix-signature": req.headers.get("svix-signature") || "",
        "svix-timestamp": req.headers.get("svix-timestamp") || "",
      });
    } catch (error) {
      console.log("what is the error", error);
      return NextResponse.json(
        {
          error: "webhook signature invalid",
        },
        { status: 401 }
      );
    }

    const event: SessionWebhookEvent = JSON.parse(rawBody);

    console.log("Clerk web hook body", event);

    if (
      event.type === "session.ended" ||
      event.type === "session.removed" ||
      event.type === "session.revoked"
    ) {
      const userId = event.data.user_id;
      const sessionId = event.data.id;

      const user = await clerkClient.users.getUser(userId);

      const userSubscriptions = user.privateMetadata.subscriptions || [];

      const updatedSubscriptions = userSubscriptions.filter(
        (subscription) => subscription.sessionId !== sessionId
      );

      await clerkClient.users.updateUser(user.id, {
        privateMetadata: { subscriptions: updatedSubscriptions },
      });
    }

    return NextResponse.json(
      {
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
