import { getReadyServiceWorker } from "@/lib/serviceWorker";

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

async function sendPushSubscriptionToServer(subscription: PushSubscription) {
  console.log("sending push subscription to server", subscription);
}

async function deletePushSubscriptionFromServer(
  subscription: PushSubscription
) {
  console.log("deleting push subscription from server", subscription);
}
