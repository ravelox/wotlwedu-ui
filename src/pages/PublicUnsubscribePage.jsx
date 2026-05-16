import { useState } from "react";
import { useParams } from "react-router-dom";
import PublicAuthCard from "../components/PublicAuthCard";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { toApiError } from "../lib/api";

export default function PublicUnsubscribePage({ api, appVersion }) {
  const { inviteToken } = useParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function unsubscribe(event) {
    event.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");
    try {
      const response = await api.post(
        `/public/poll/invite/${encodeURIComponent(inviteToken)}/unsubscribe`
      );
      if (response.status >= 400) {
        throw toApiError(response, "Failed to unsubscribe");
      }
      setSuccess("You have been unsubscribed from future public poll email invites.");
    } catch (err) {
      setError(err.message || "Failed to unsubscribe");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicAuthCard
      title="Unsubscribe"
      copy="Stop future public poll email invites to this address."
      appVersion={appVersion}
      backTo="/support"
      backLabel="Support"
    >
      <SuccessBanner message={success} />
      <ErrorBanner error={error} />
      <form className="stack-form" onSubmit={unsubscribe}>
        <p className="login-copy">
          This only affects public poll email invites. Account and organization emails still follow
          your account settings and security requirements.
        </p>
        <button className="btn" disabled={loading || Boolean(success)} type="submit">
          {loading ? "Unsubscribing..." : "Unsubscribe"}
        </button>
      </form>
    </PublicAuthCard>
  );
}
