import { useEffect, useState } from "react";
import Loading from "../components/Loading";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { extractCollection, toApiError } from "../lib/api";

function friendName(row) {
  return row?.user?.fullName || row?.user?.alias || row?.user?.email || "Unknown user";
}

export default function FriendsPage({ api }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [friends, setFriends] = useState([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/user/friend", {
        params: showBlocked ? { blocked: true } : undefined,
      });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to load friends");
      }
      setFriends(extractCollection(response, "friends"));
    } catch (err) {
      setError(err.message || "Failed to load friends");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [api, showBlocked]);

  async function sendRequest(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/user/request", { email });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to send friend request");
      }
      setSuccess("Friend request sent.");
      setEmail("");
      await load();
    } catch (err) {
      setError(err.message || "Failed to send friend request");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRelationship(id, message) {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete(`/user/relationship/${id}`);
      if (response.status >= 400) {
        throw toApiError(response, "Failed to update relationship");
      }
      setSuccess(message);
      await load();
    } catch (err) {
      setError(err.message || "Failed to update relationship");
    } finally {
      setSaving(false);
    }
  }

  async function blockUser(userId) {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.put(`/user/block/${userId}`);
      if (response.status >= 400) {
        throw toApiError(response, "Failed to block user");
      }
      setSuccess("User blocked.");
      await load();
    } catch (err) {
      setError(err.message || "Failed to block user");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading text="Loading friends..." />;

  return (
    <div className="screen-stack">
      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Friends</p>
            <h2>Your connections</h2>
          </div>
          <label className="toggle-inline">
            <span>Show blocked</span>
            <input
              checked={showBlocked}
              onChange={(event) => setShowBlocked(event.target.checked)}
              type="checkbox"
            />
          </label>
        </div>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />

        <form className="stack-form" onSubmit={sendRequest}>
          <label className="field">
            <span>Add friend by email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="friend@example.com"
              required
            />
          </label>
          <button className="btn" disabled={saving} type="submit">
            {saving ? "Sending..." : "Send Request"}
          </button>
        </form>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">List</p>
            <h3>Relationships</h3>
          </div>
        </div>
        <div className="card-list">
          {friends.length === 0 ? (
            <div className="empty-state">No relationships returned for this view.</div>
          ) : (
            friends.map((row) => {
              const statusName = row?.status?.name || "Unknown";
              return (
                <article className="list-card" key={row.id}>
                  <div className="section-heading compact">
                    <div>
                      <strong>{friendName(row)}</strong>
                      <p>{row?.user?.email || "No email"}</p>
                    </div>
                    <span className="chip">{statusName}</span>
                  </div>
                  <div className="split-actions">
                    {statusName === "Blocked" ? (
                      <button
                        className="btn btn-secondary"
                        disabled={saving}
                        onClick={() => deleteRelationship(row.id, "User unblocked.")}
                        type="button"
                      >
                        Unblock
                      </button>
                    ) : statusName === "Pending" ? (
                      <button
                        className="btn btn-secondary"
                        disabled={saving}
                        onClick={() => deleteRelationship(row.id, "Friend request removed.")}
                        type="button"
                      >
                        Remove Request
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn btn-secondary"
                          disabled={saving}
                          onClick={() => deleteRelationship(row.id, "Friend removed.")}
                          type="button"
                        >
                          Unfriend
                        </button>
                        <button
                          className="btn btn-tonal"
                          disabled={saving}
                          onClick={() => blockUser(row?.user?.id)}
                          type="button"
                        >
                          Block
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
