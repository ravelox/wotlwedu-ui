import { useState } from "react";
import { useParams } from "react-router-dom";
import PublicAuthCard from "../components/PublicAuthCard";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { toApiError } from "../lib/api";

export default function PasswordResetPage({ api, appVersion }) {
  const { userId, resetToken } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.put(`/login/password/${userId}`, {
        resetToken,
        newPassword: password,
      });
      if (response.status >= 400) {
        throw toApiError(response, "Password reset failed");
      }
      setSuccess("Password updated. You can sign in with the new password now.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicAuthCard
      title="Reset Password"
      copy="Choose a new password for your Wotlwedu account."
      appVersion={appVersion}
    >
      <SuccessBanner message={success} />
      <ErrorBanner error={error} />
      <form className="stack-form" onSubmit={submit}>
        <label className="field">
          <span>New Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <label className="field">
          <span>Confirm Password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <button className="btn" disabled={loading} type="submit">
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </PublicAuthCard>
  );
}
