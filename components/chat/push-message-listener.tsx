"use client";

import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

export default function PushMessageListener() {
  const [channelId, setChannelId] = useState(null);
  const [serverId, setServerId] = useState(null);
  const [memberId, setMemberId] = useState(null);

  useEffect(() => {
    const messageListener = (event: MessageEvent) => {
      console.log("Recieved message from service worker", event.data);

      const { serverId, channelId, memberId } = event.data;
      console.log(
        "here are the serverId and channelId",
        serverId,
        channelId,
        memberId
      );

      if (serverId && channelId) {
        setServerId(serverId);
        setChannelId(channelId);
        setMemberId(memberId);
      } else {
        console.error(
          "PushMessageListener: A Channel with this channelId was not found"
        );
      }
    };

    navigator.serviceWorker.addEventListener("message", messageListener);

    return () =>
      navigator.serviceWorker.removeEventListener("message", messageListener);
  }, []);

  useEffect(() => {
    if (serverId && channelId && !memberId) {
      console.log("print channel");
      redirect(`/servers/${serverId}/channels/${channelId}`);
    } else if (serverId && channelId && channelId === memberId) {
      console.log("print conversation");
      redirect(`/servers/${serverId}/conversations/${memberId}`);
    }
  }, [channelId, serverId, memberId]);

  return null;
}
