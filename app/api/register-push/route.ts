import { clerkClient, currentUser, auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { PushSubscription } from "web-push";

export async function POST(req: Request) {
  try {
    const newSubscription: PushSubscription | undefined = await req.json();

    if (!newSubscription) {
      return NextResponse.json(
        {
          error: "Missing push subscription in body",
        },
        { status: 4000 }
      );
    }

    // console.log("Received push subscription to add", newSubscription);

    const user = await currentUser();
    const { sessionId } = auth();

    if (!user || !sessionId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userSubscriptions = user.privateMetadata.subscriptions || [];

    const updatedSubscriptions = userSubscriptions.filter(
      (subscription) => subscription.endpoint !== newSubscription.endpoint
    );
    updatedSubscriptions.push({ ...newSubscription, sessionId });

    await clerkClient.users.updateUser(user.id, {
      privateMetadata: { subscriptions: updatedSubscriptions },
    });

    return NextResponse.json(
      {
        message: "Push subscription added successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const subscriptionToDelete: PushSubscription | undefined = await req.json();

    if (!subscriptionToDelete) {
      return NextResponse.json(
        {
          error: "Missing push subscription in body",
        },
        { status: 4000 }
      );
    }

    // console.log("Received push subscription to add", subscriptionToDelete);

    const user = await currentUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userSubscriptions = user.privateMetadata.subscriptions || [];

    const updatedSubscriptions = userSubscriptions.filter(
      (subscription) => subscription.endpoint !== subscriptionToDelete.endpoint
    );

    await clerkClient.users.updateUser(user.id, {
      privateMetadata: { subscriptions: updatedSubscriptions },
    });

    return NextResponse.json(
      {
        message: "Push subscription deleted",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
