import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PublicAuthCard from "../components/PublicAuthCard";
import { ErrorBanner } from "../components/Feedback";
import { setSession } from "../lib/session";

export default function Verify2FAPage({ api, appVersion }) {
  const navigate = useNavigate();
  const { userId, verificationToken } = useParams();
  const [totp, setTotp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/login/verify2fa", {
        userId,
        verificationToken,
        authToken: totp,
      });

      if (response.status >= 400) {
        setError(response.data?.message || "2FA verification failed");
        return;
      }

      const data = response.data?.data || response.data;
      setSession({
        authToken: data?.authToken,
        refreshToken: data?.refreshToken,
        userId: data?.userId,
        email: data?.email,
        alias: data?.alias,
        systemAdmin: data?.systemAdmin === true,
        organizationAdmin: data?.organizationAdmin === true,
        workgroupAdmin: data?.workgroupAdmin === true,
        organizationId: data?.organizationId || null,
        adminWorkgroupId: data?.adminWorkgroupId || null,
      });
      navigate("/app/home", { replace: true });
    } catch (err) {
      setError(err.message || "2FA verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicAuthCard
      title="Verify 2FA"
      copy="Enter the verification code from your authenticator app to complete sign-in."
      appVersion={appVersion}
    >
      <ErrorBanner error={error} />
      <form className="stack-form" onSubmit={submit}>
        <label className="field">
          <span>Verification Code</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={totp}
            onChange={(event) => setTotp(event.target.value)}
            placeholder="123456"
            required
          />
        </label>
        <button className="btn" disabled={loading} type="submit">
          {loading ? "Verifying..." : "Verify 2FA"}
        </button>
      </form>
    </PublicAuthCard>
  );
}
