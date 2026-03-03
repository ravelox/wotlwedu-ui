import { useState } from "react";
import PublicAuthCard from "../components/PublicAuthCard";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { toApiError } from "../lib/api";

export default function PasswordRequestPage({ api, appVersion }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await api.post("/login/resetreq", { email });
      if (response.status >= 400) {
        throw toApiError(response, "Password reset request failed");
      }
      setSuccess("Reset email sent. Use the link in that email to choose a new password.");
      setEmail("");
    } catch (err) {
      setError(err.message || "Password reset request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicAuthCard
      title="Forgot Password"
      copy="Enter your email address and we will send you a password reset link."
      appVersion={appVersion}
    >
      <SuccessBanner message={success} />
      <ErrorBanner error={error} />
      <form className="stack-form" onSubmit={submit}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <button className="btn" disabled={loading} type="submit">
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
    </PublicAuthCard>
  );
}
