import { useState } from "react";
import { Link } from "react-router-dom";
import PublicAuthCard from "../components/PublicAuthCard";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { toApiError } from "../lib/api";

export default function RegisterPage({ api, appVersion }) {
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    spaceName: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/register", {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        spaceName: form.spaceName,
        password: form.password,
      });

      if (response.status >= 400) {
        throw toApiError(response, "Registration failed");
      }

      setSuccess("Registration submitted. Check your email to confirm your account and open your first space.");
      setForm({
        email: "",
        firstName: "",
        lastName: "",
        spaceName: "",
        password: "",
        confirmPassword: "",
      });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicAuthCard
      title="Register"
      copy="Create a Wotlwedu account and your first personal space."
      appVersion={appVersion}
    >
      <SuccessBanner message={success} />
      <ErrorBanner error={error} />
      <form className="stack-form" onSubmit={submit}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="field">
          <span>First Name</span>
          <input
            value={form.firstName}
            onChange={(event) => updateField("firstName", event.target.value)}
            autoComplete="given-name"
            required
          />
        </label>
        <label className="field">
          <span>Last Name</span>
          <input
            value={form.lastName}
            onChange={(event) => updateField("lastName", event.target.value)}
            autoComplete="family-name"
            required
          />
        </label>
        <label className="field">
          <span>First Space Name</span>
          <input
            value={form.spaceName}
            onChange={(event) => updateField("spaceName", event.target.value)}
            placeholder="My Space"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <label className="field">
          <span>Confirm Password</span>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(event) => updateField("confirmPassword", event.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <button className="btn" disabled={loading} type="submit">
          {loading ? "Registering..." : "Create Account"}
        </button>
        <p className="tiny-meta">
          By creating an account, you agree to the{" "}
          <Link className="text-link" to="/terms">Terms</Link> and{" "}
          <Link className="text-link" to="/privacy">Privacy Policy</Link>.
        </p>
      </form>
    </PublicAuthCard>
  );
}
