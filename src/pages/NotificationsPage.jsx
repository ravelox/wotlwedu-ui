import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Loading from "../components/Loading";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { extractCollection, toApiError } from "../lib/api";

const NOTIFICATION_STATUS = {
  unread: 100,
  read: 101,
};

function notificationRoute(notification) {
  const objectId = notification?.objectId || "";
  const text = (notification?.text || "").toLowerCase();

  if (objectId.startsWith("election_")) {
    if (text.includes("ended")) return `/app/statistics/${objectId}`;
    return `/app/cast-vote/${objectId}`;
  }
  if (objectId.startsWith("list_")) return `/app/list/${objectId}`;
  if (objectId.startsWith("item_")) return `/app/item/${objectId}`;
  if (objectId.startsWith("image_")) return `/app/picture/${objectId}`;
  return null;
}

function notificationActionLabel(notification) {
  const objectId = notification?.objectId || "";
  const text = (notification?.text || "").toLowerCase();

  if (objectId.startsWith("election_")) {
    return text.includes("ended") ? "View Results" : "Open Poll";
  }
  if (objectId.startsWith("list_")) return "Open List";
  if (objectId.startsWith("item_")) return "Open Item";
  if (objectId.startsWith("image_")) return "Open Picture";
  return null;
}

function isPollNotification(notification) {
  return String(notification?.objectId || "").startsWith("election_");
}

function pollActionLabel(group) {
  const text = group.notifications.map((notification) => notification.text || "").join(" ").toLowerCase();
  if (text.includes("ended") || text.includes("expired") || text.includes("closed")) return "View Results";
  if (text.includes("reminder") || text.includes("vote") || text.includes("response")) return "Vote Now";
  return "Open Poll";
}

function pollPrimaryRoute(group) {
  return pollActionLabel(group) === "View Results"
    ? `/app/statistics/${group.objectId}`
    : `/app/cast-vote/${group.objectId}`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function senderName(notification) {
  return notification?.sender?.fullName?.trim() || notification?.sender?.firstName || "wotlwedu";
}

function groupNotifications(notifications) {
  const pollGroups = new Map();
  const direct = [];

  for (const notification of notifications || []) {
    if (!isPollNotification(notification)) {
      direct.push({
        id: notification.id,
        type: "single",
        notification,
        createdAt: notification.createdAt,
        unreadCount: notification.status?.name === "Read" ? 0 : 1,
      });
      continue;
    }

    const objectId = notification.objectId;
    if (!pollGroups.has(objectId)) {
      pollGroups.set(objectId, {
        id: objectId,
        type: "poll",
        objectId,
        notifications: [],
        createdAt: notification.createdAt,
        unreadCount: 0,
      });
    }
    const group = pollGroups.get(objectId);
    group.notifications.push(notification);
    if (new Date(notification.createdAt).getTime() > new Date(group.createdAt).getTime()) {
      group.createdAt = notification.createdAt;
    }
    if (notification.status?.name !== "Read") group.unreadCount += 1;
  }

  return [...pollGroups.values(), ...direct].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function pollGroupTitle(group) {
  const latest = group.notifications[0];
  const text = latest?.text || "Poll activity";
  const match = text.match(/: ([^-]+?) (?:still|needs|ended|is|has)/i);
  return match?.[1]?.trim() || text.replace(/^Reminder from .*?:\s*/i, "").slice(0, 72);
}

export default function NotificationsPage({ api }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notifications, setNotifications] = useState([]);
  const groupedNotifications = useMemo(() => groupNotifications(notifications), [notifications]);

  async function load() {
    const response = await api.get("/notification", { params: { page: 1, items: 50 } });
    if (response.status >= 400) throw toApiError(response, "Failed to load notifications");
    setNotifications(extractCollection(response, "notifications"));
  }

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        const response = await api.get("/notification", { params: { page: 1, items: 50 } });
        if (response.status >= 400) throw toApiError(response, "Failed to load notifications");
        if (!cancelled) setNotifications(extractCollection(response, "notifications"));
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load notifications");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [api]);

  async function setStatus(notificationId, statusId, message) {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.put(`/notification/status/${notificationId}/${statusId}`);
      if (response.status >= 400) throw toApiError(response, "Failed to update notification");
      setSuccess(message);
      await load();
    } catch (err) {
      setError(err.message || "Failed to update notification");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNotification(notificationId) {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete(`/notification/${notificationId}`);
      if (response.status >= 400) throw toApiError(response, "Failed to delete notification");
      setSuccess("Notification deleted.");
      await load();
    } catch (err) {
      setError(err.message || "Failed to delete notification");
    } finally {
      setSaving(false);
    }
  }

  async function acceptFriendRequest(token, notificationId) {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(`/person/accept/${token}`);
      if (response.status >= 400) throw toApiError(response, "Failed to accept friend request");
      await api.delete(`/notification/${notificationId}`);
      setSuccess("Friend request accepted.");
      await load();
    } catch (err) {
      setError(err.message || "Failed to accept friend request");
    } finally {
      setSaving(false);
    }
  }

  async function blockSender(senderId, notificationId) {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.put(`/person/block/${senderId}`);
      if (response.status >= 400) throw toApiError(response, "Failed to block sender");
      await api.delete(`/notification/${notificationId}`);
      setSuccess("Sender blocked.");
      await load();
    } catch (err) {
      setError(err.message || "Failed to block sender");
    } finally {
      setSaving(false);
    }
  }

  async function markGroupRead(group) {
    const unread = (group.notifications || []).filter((notification) => notification.status?.name !== "Read");
    if (!unread.length) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await Promise.all(
        unread.map((notification) =>
          api.put(`/notification/status/${notification.id}/${NOTIFICATION_STATUS.read}`)
        )
      );
      setSuccess(`${unread.length} notification${unread.length === 1 ? "" : "s"} marked read.`);
      await load();
    } catch (err) {
      setError(err.message || "Failed to update notifications");
    } finally {
      setSaving(false);
    }
  }

  async function remindPoll(group) {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(`/poll/${group.objectId}/remind`, {
        states: ["not_started", "in_progress"],
      });
      if (response.status >= 400) throw toApiError(response, "Failed to send reminders");
      const sentCount = response.data?.data?.reminder?.sentCount || 0;
      setSuccess(`${sentCount} reminder${sentCount === 1 ? "" : "s"} sent.`);
      await load();
    } catch (err) {
      setError(err.message || "Failed to send reminders");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading text="Loading notifications..." />;

  return (
    <div className="screen-stack">
      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Inbox</p>
            <h2>Notifications</h2>
          </div>
        </div>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />
        <div className="notification-group-list">
          {groupedNotifications.length === 0 ? (
            <div className="empty-state">You are all caught up. New poll updates and friend requests will show up here.</div>
          ) : (
            groupedNotifications.map((group) =>
              group.type === "poll" ? (
                <article className="notification-group-card" key={group.id}>
                  <div className="notification-group-header">
                    <div className="notification-group-icon">P</div>
                    <div>
                      <p className="eyebrow">Poll activity</p>
                      <h3>{pollGroupTitle(group)}</h3>
                      <p className="tiny-meta">
                        {group.notifications.length} update{group.notifications.length === 1 ? "" : "s"} ·{" "}
                        {group.unreadCount} unread · latest {formatDate(group.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="split-actions wrap-actions">
                    <Link className="btn" to={pollPrimaryRoute(group)}>
                      {pollActionLabel(group)}
                    </Link>
                    <Link className="btn btn-secondary" to={`/app/statistics/${group.objectId}`}>
                      View Results
                    </Link>
                    <button className="btn btn-tonal" disabled={saving} onClick={() => remindPoll(group)} type="button">
                      Remind Friends
                    </button>
                    <Link className="btn btn-tonal" to={`/app/poll/${group.objectId}`}>
                      Poll Settings
                    </Link>
                    <Link className="btn btn-tonal" to={`/app/statistics/${group.objectId}`}>
                      Public Link
                    </Link>
                    <button className="btn btn-secondary" disabled={saving || group.unreadCount === 0} onClick={() => markGroupRead(group)} type="button">
                      Mark Group Read
                    </button>
                  </div>
                  <div className="notification-thread">
                    {group.notifications.map((notification) => (
                      <div className="notification-thread-row" key={notification.id}>
                        <span className="timeline-dot" />
                        <div>
                          <div className="split-heading compact">
                            <strong>{senderName(notification)}</strong>
                            <span className="tiny-meta">{formatDate(notification.createdAt)}</span>
                          </div>
                          <p>{notification.text || "This update does not include a message."}</p>
                          <div className="chip-row">
                            {notification.status?.name ? <span className="chip">{notification.status.name}</span> : null}
                            <button
                              className="btn btn-tonal"
                              disabled={saving}
                              onClick={() =>
                                setStatus(
                                  notification.id,
                                  notification.status?.name === "Read" ? NOTIFICATION_STATUS.unread : NOTIFICATION_STATUS.read,
                                  notification.status?.name === "Read" ? "Notification marked unread." : "Notification marked read."
                                )
                              }
                              type="button"
                            >
                              {notification.status?.name === "Read" ? "Mark Unread" : "Mark Read"}
                            </button>
                            <button
                              aria-label="Delete notification"
                              className="btn btn-secondary btn-icon-delete"
                              disabled={saving}
                              onClick={() => deleteNotification(notification.id)}
                              title="Delete notification"
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ) : (
                <article className="notification-group-card notification-single-card" key={group.id}>
                  {(() => {
                    const notification = group.notification;
                    return (
                      <>
                        <div className="notification-group-header">
                          <div className="notification-group-icon">N</div>
                          <div>
                            <p className="eyebrow">{notification.status?.name || "Notification"}</p>
                            <h3>{senderName(notification)}</h3>
                            <p className="tiny-meta">{formatDate(notification.createdAt)}</p>
                          </div>
                        </div>
                        <p>{notification.text || "This update does not include a message."}</p>
                        <div className="split-actions wrap-actions">
                          {notification.type === 103 ? (
                            <>
                              <button
                                className="btn btn-secondary"
                                disabled={saving}
                                onClick={() => acceptFriendRequest(notification.objectId, notification.id)}
                                type="button"
                              >
                                Accept Friend Request
                              </button>
                              <button
                                className="btn btn-tonal"
                                disabled={saving}
                                onClick={() => blockSender(notification.sender?.id, notification.id)}
                                type="button"
                              >
                                Block Sender
                              </button>
                            </>
                          ) : null}
                          {notificationRoute(notification) ? (
                            <Link className="btn btn-secondary" to={notificationRoute(notification)}>
                              {notificationActionLabel(notification)}
                            </Link>
                          ) : null}
                          <button
                            className="btn btn-tonal"
                            disabled={saving}
                            onClick={() =>
                              setStatus(
                                notification.id,
                                notification.status?.name === "Read" ? NOTIFICATION_STATUS.unread : NOTIFICATION_STATUS.read,
                                notification.status?.name === "Read" ? "Notification marked unread." : "Notification marked read."
                              )
                            }
                            type="button"
                          >
                            {notification.status?.name === "Read" ? "Mark Unread" : "Mark Read"}
                          </button>
                          <button
                            aria-label="Delete notification"
                            className="btn btn-secondary btn-icon-delete"
                            disabled={saving}
                            onClick={() => deleteNotification(notification.id)}
                            title="Delete notification"
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </article>
              )
            )
          )}
        </div>
      </section>
    </div>
  );
}
