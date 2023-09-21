"use client";

import { getCurrentPushSubscription } from "@/src/notifications/pushService";
import { BellOff, BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { ActionTooltip } from "@/components/action-tooltip";

export function NotificationToggle() {
  const [hasActivePushSubscription, setHasActivePushSubscription] =
    useState(false);

  useEffect(() => {
    async function getActivePushSubscription() {
      const subscription = await getCurrentPushSubscription();
      setHasActivePushSubscription(!!subscription);
    }
    getActivePushSubscription();
  }, []);

  async function setPushNotificationsEnabled(enabled: boolean) {}

  if (hasActivePushSubscription === undefined) return null;

  return (
    <div>
      {hasActivePushSubscription ? (
        // <span title="Disable push notification on this device">
        //   <BellOff
        //     onClick={() => setPushNotificationsEnabled(false)}
        //     className="cursor-pointer"
        //   />
        // </span>
        <ActionTooltip label="Disable push notification on this device">
          <BellOff
            onClick={() => setPushNotificationsEnabled(false)}
            className="cursor-pointer"
          />
        </ActionTooltip>
      ) : (
        <ActionTooltip label="Enable push notification on this device">
          <BellRing
            onClick={() => setPushNotificationsEnabled(false)}
            className="cursor-pointer"
          />
        </ActionTooltip>
      )}
    </div>
  );
}
