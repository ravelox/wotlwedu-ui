import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PublicAuthCard from "../components/PublicAuthCard";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { toApiError } from "../lib/api";

export default function RegisterConfirmPage({ api, appVersion }) {
  const { tokenId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function confirm() {
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const response = await api.post(`/register/confirm/${tokenId}`);
        if (response.status >= 400) {
          throw toApiError(response, "Confirmation failed");
        }
        if (!cancelled) {
          setSuccess("Registration confirmed. You can sign in now.");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Confirmation failed");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    confirm();
    return () => {
      cancelled = true;
    };
  }, [api, tokenId]);

  return (
    <PublicAuthCard
      title="Confirm Registration"
      copy="We are verifying your registration token."
      appVersion={appVersion}
    >
      {loading ? <div className="loading">Confirming account...</div> : null}
      <SuccessBanner message={success} />
      <ErrorBanner error={error} />
    </PublicAuthCard>
  );
}
