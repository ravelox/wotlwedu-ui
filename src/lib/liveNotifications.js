import { io } from "socket.io-client";

function socketBaseUrl(api) {
  const baseUrl = api?.defaults?.baseURL || "";
  return baseUrl.replace(/\/v\d+\/?$/, "");
}

export function connectLiveNotifications({ api, userId, onNotification, onPollUpdate }) {
  const baseUrl = socketBaseUrl(api);
  if (!baseUrl || !userId) return null;

  const socket = io(baseUrl, {
    transports: ["websocket", "polling"],
    reconnection: true,
  });

  socket.on("connect", () => {
    socket.emit("register", { id: userId });
  });

  socket.on("notification", (payload) => {
    if (onNotification) onNotification(payload);
    const objectId = payload?.notification?.objectId || payload?.objectId;
    if (objectId && onPollUpdate) onPollUpdate({ electionId: objectId, source: "notification" });
  });

  socket.on("poll-update", (payload) => {
    if (onPollUpdate) onPollUpdate(payload);
  });

  return socket;
}
