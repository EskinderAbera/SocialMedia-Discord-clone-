"use client";

import {
  getCurrentPushSubscription,
  registerPushNotification,
  unregisterPushNotifications,
} from "@/src/notifications/pushService";
import { BellOff, BellRing, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ActionTooltip } from "@/components/action-tooltip";

export function NotificationToggle() {
  const [hasActivePushSubscription, setHasActivePushSubscription] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string>();

  useEffect(() => {
    async function getActivePushSubscription() {
      const subscription = await getCurrentPushSubscription();
      setHasActivePushSubscription(!!subscription);
    }
    getActivePushSubscription();
  }, []);

  async function setPushNotificationsEnabled(enabled: boolean) {
    if (loading) return;

    setLoading(true);
    setConfirmationMessage(undefined);

    try {
      enabled
        ? await registerPushNotification()
        : await unregisterPushNotifications();
      setConfirmationMessage(
        "Push Notification " +
          (enabled ? "Enabled" : "Disabled") +
          " Successfully"
      );
      setHasActivePushSubscription(enabled);
    } catch (error) {
      console.error(error);
      if (enabled && Notification.permission === "denied") {
        alert(
          "Please allow notifications to enable push notifications in your browser settings"
        );
      } else {
        alert("Something went wrong, please try again later");
      }
    } finally {
      setLoading(false);
    }
  }

  if (hasActivePushSubscription === undefined) return null;

  return (
    <div className="relative">
      {loading && (
        <Loader2 className="absolute top-1/2 left-1/1.5 z-10  animate-spin" />
      )}
      {/* {confirmationMessage && (
        <DisappearingMessage className="absolute left-1/2 top-8 z-10 ">
          {confirmationMessage}
        </DisappearingMessage>
      )} */}
      {hasActivePushSubscription ? (
        <ActionTooltip label="Disable push notification on this device">
          <BellOff
            onClick={() => setPushNotificationsEnabled(false)}
            className={`${loading ? "opacity-10" : " "} cursor-pointer`}
          />
        </ActionTooltip>
      ) : (
        <ActionTooltip label="Enable push notification on this device">
          <BellRing
            onClick={() => setPushNotificationsEnabled(true)}
            className={`${loading ? "opacity-10" : " "} cursor-pointer`}
          />
        </ActionTooltip>
      )}
    </div>
  );
}
