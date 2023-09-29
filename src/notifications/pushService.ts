import { getReadyServiceWorker } from "@/lib/serviceWorker";
import axios from "axios";

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  const sw = await getReadyServiceWorker();
  return sw.pushManager.getSubscription();
}

export async function registerPushNotification() {
  if (!("PushManager" in window)) {
    throw new Error("Push notifications not supported by this browser");
  }

  const existingSubscription = await getCurrentPushSubscription();

  if (existingSubscription) {
    throw Error("Existing push subscription found");
  }

  const sw = await getReadyServiceWorker();

  const subscription = await sw.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY,
  });

  await sendPushSubscriptionToServer(subscription);
}

export async function unregisterPushNotifications() {
  const existingSubscription = await getCurrentPushSubscription();

  if (!existingSubscription) {
    throw Error("No Existing push subscription found");
  }

  await deletePushSubscriptionFromServer(existingSubscription);

  await existingSubscription.unsubscribe();
}

export async function sendPushSubscriptionToServer(
  subscription: PushSubscription
) {
  // here we can send this data to our backend server to store it
  // but I will store it in clerk backend
  // console.log("sending push subscription to server", subscription);
  try {
    const response = await axios.post(
      "/api/register-push",
      JSON.stringify(subscription)
    );
  } catch (error) {
    throw Error("Failed to send push subscription to server");
  }
}

async function deletePushSubscriptionFromServer(
  subscription: PushSubscription
) {
  // here we can send this data to our backend server to store it
  // but I will store it in clerk backend
  const response = await fetch("/api/register-push", {
    method: "DELETE",
    body: JSON.stringify(subscription),
  });

  if (!response.ok) {
    throw Error("Failed to delete push subscription from server");
  }
}
