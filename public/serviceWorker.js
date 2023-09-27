// @ts-check

/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = /** @type { ServiceWorkerGlobalScope & typeof globalThis } */ (
  globalThis
);

sw.addEventListener("push", (event) => {
  const message = event.data?.json();
  const { title, body, icon, image, channelId, serverId, memberId } = message;

  console.log("received push message", message);

  async function handlePushEvent() {
    const windowClients = await sw.clients.matchAll({
      type: "window",
    });

    if (windowClients.length > 0) {
      const appInForeground = windowClients.some((client) => client.focused);

      if (appInForeground) {
        console.log("APP is in foreground don't show notification");
        return;
      }
    }

    await sw.registration.showNotification(title, {
      body,
      icon,
      image,
      badge: "/badge.png",
      actions: [{ title: "Open Chat", action: "open_chat" }],
      tag: channelId + "_" + serverId + "_" + memberId,
      data: {
        channelId,
        serverId,
        memberId,
      },
    });
  }

  event.waitUntil(handlePushEvent());
});

sw.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  notification.close();

  async function handleNotificationClick() {
    const windowClients = await sw.clients.matchAll({
      type: "window",
      includeUncontrolled: true, //this attribute help us to find if we already opened our chat app instead of creating new tab. if we don't it will open
    });

    const { channelId, serverId, memberId } = notification.data;

    // if we have opened tab then we will focus or foreground it
    if (windowClients.length > 0) {
      await windowClients[0].focus();
      windowClients[0].postMessage({ serverId, channelId, memberId });
    } else {
      if (!memberId) {
        sw.clients.openWindow(`/servers/${serverId}/channels/${channelId}`);
      } else {
        console.log("open the conversation", serverId, channelId);
        sw.clients.openWindow(
          `/servers/${serverId}/conversations/${channelId}`
        );
      }
    }
  }

  event.waitUntil(handleNotificationClick());
});
