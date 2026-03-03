import { useState } from "react";
import bcrypt from "bcryptjs";
import PublicAuthCard from "../components/PublicAuthCard";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { toApiError } from "../lib/api";

export default function RegisterPage({ api, appVersion }) {
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    alias: "",
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
      const auth = await bcrypt.hash(form.password, 12);
      const response = await api.post("/register", {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        alias: form.alias,
        auth,
      });

      if (response.status >= 400) {
        throw toApiError(response, "Registration failed");
      }

      setSuccess("Registration submitted. Check your email for the confirmation link.");
      setForm({
        email: "",
        firstName: "",
        lastName: "",
        alias: "",
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
      copy="Create a new Wotlwedu account and we will email you a confirmation link."
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
          <span>Alias</span>
          <input
            value={form.alias}
            onChange={(event) => updateField("alias", event.target.value)}
            autoComplete="nickname"
            required
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
      </form>
    </PublicAuthCard>
  );
}
