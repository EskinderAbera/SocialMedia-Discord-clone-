"use client";

import { BellOff, BellRing } from "lucide-react";
import { clerkClient, currentUser, useUser } from "@clerk/nextjs";
import { UserResource } from "@clerk/types";

import { ActionTooltip } from "@/components/action-tooltip";
import { currentProfile } from "@/lib/current-profile";
import { useEffect, useState } from "react";

interface ChannelNotificationToggleButtonProps {
  channelId: string;
}

export function ChatNotificationButton({
  channelId,
}: ChannelNotificationToggleButtonProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { user } = useUser();
  const mutedChannels = user?.unsafeMetadata?.mutedChannels || [];

  const channelMuted = mutedChannels.includes(channelId);
  console.log("muted channels", channelMuted);

  async function setChannelMuted(channelId: string, muted: boolean) {
    try {
      let mutedChannelUpdate: string[];

      if (muted) {
        mutedChannelUpdate = [...mutedChannels, channelId];
      } else {
        mutedChannelUpdate = mutedChannels.filter((id) => id !== channelId);
      }

      // here we need to update the user's metadata or backend if we handle it in backend

      await user?.update({
        unsafeMetadata: {
          mutedChannels: mutedChannelUpdate,
        },
      });
    } catch (error) {
      console.error("set channel error", error);
    }
  }

  const Icon = channelMuted ? BellOff : BellRing;
  const tooltipLabel = channelMuted
    ? "Enable Push Notifaction"
    : "Disable Push Notification";

  const onclick = () => {
    if (channelMuted) {
      setChannelMuted(channelId, false);
    } else {
      setChannelMuted(channelId, true);
    }
  };

  if (!isMounted) return;

  return (
    <ActionTooltip side="bottom" label={tooltipLabel}>
      <button className="hover:opacity-75 transition mr-4" onClick={onclick}>
        <Icon className="h-6 w-6 text-zinc-500 dark:text-zinc-400" />
      </button>
    </ActionTooltip>
  );
}
