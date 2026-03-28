import { useEffect, useState } from "react";
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
  if (objectId.startsWith("image_")) return `/app/image/${objectId}`;
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
  if (objectId.startsWith("image_")) return "Open Image";
  return null;
}

export default function NotificationsPage({ api }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notifications, setNotifications] = useState([]);

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
      const response = await api.post(`/user/accept/${token}`);
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
      const response = await api.put(`/user/block/${senderId}`);
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
        <div className="timeline">
          {notifications.length === 0 ? (
            <div className="empty-state">No notifications were returned by the API.</div>
          ) : (
            notifications.map((notification) => (
              <article className="timeline-item" key={notification.id}>
                <div className="timeline-dot" />
                <div>
                  <div className="section-heading compact">
                    <strong>{notification.sender?.fullName || notification.type || "Notification"}</strong>
                    <span className="tiny-meta">ID {notification.id}</span>
                  </div>
                  <p>{notification.text || "No content available."}</p>
                  <div className="chip-row">
                    {notification.status?.name ? (
                      <span className="chip">{notification.status.name}</span>
                    ) : null}
                    {notification.objectId ? (
                      <span className="chip chip-soft">{notification.objectId}</span>
                    ) : null}
                  </div>
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
                      <Link className="text-link" to={notificationRoute(notification)}>
                        {notificationActionLabel(notification)}
                      </Link>
                    ) : null}
                    {notification.status?.name !== "Read" ? (
                      <button
                        className="btn btn-tonal"
                        disabled={saving}
                        onClick={() =>
                          setStatus(notification.id, NOTIFICATION_STATUS.read, "Notification marked read.")
                        }
                        type="button"
                      >
                        Mark Read
                      </button>
                    ) : (
                      <button
                        className="btn btn-tonal"
                        disabled={saving}
                        onClick={() =>
                          setStatus(notification.id, NOTIFICATION_STATUS.unread, "Notification marked unread.")
                        }
                        type="button"
                      >
                        Mark Unread
                      </button>
                    )}
                    <button
                      className="btn btn-secondary"
                      disabled={saving}
                      onClick={() => deleteNotification(notification.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
