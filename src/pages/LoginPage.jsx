import { useState } from "react";
import { Link } from "react-router-dom";
import { ErrorBanner } from "../components/Feedback";

export default function LoginPage({ api, appVersion, onLogin }) {
  const [email, setEmail] = useState("root@localhost.localdomain");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pending2fa, setPending2fa] = useState(null);

  function parse2faRedirect(toURL) {
    if (!toURL || typeof toURL !== "string") return null;
    const parts = toURL.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return {
      userId: parts[parts.length - 2],
      verificationToken: parts[parts.length - 1],
    };
  }

  async function submitCredentials(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/login", { email, password });
      if (response.status === 302) {
        const redirect = parse2faRedirect(response.data?.data?.toURL);
        if (!redirect) {
          setError("2FA was requested but the API did not return a verification token.");
          return;
        }
        setPending2fa(redirect);
        setTotp("");
        return;
      }
      if (response.status >= 400) {
        setError(response.data?.message || "Login failed");
        return;
      }
      onLogin(response.data);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function submit2fa(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/login/verify2fa", {
        userId: pending2fa?.userId,
        verificationToken: pending2fa?.verificationToken,
        authToken: totp,
      });

      if (response.status >= 400) {
        setError(response.data?.message || "2FA verification failed");
        return;
      }

      onLogin(response.data);
    } catch (err) {
      setError(err.message || "2FA verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-phone">
        <div className="login-gradient" />
        <div className="login-card">
          <div className="brand-mark">W</div>
          <p className="eyebrow">Phone-first control surface</p>
          <h1>wotlwedu</h1>
          <p className="login-copy">
            Rebuilt from the minimal client around a mobile dashboard, quick election access,
            and scoped admin tools.
          </p>
          <p className="login-version">Version {appVersion}</p>

          <ErrorBanner error={error} />

          {!pending2fa ? (
            <form className="stack-form" onSubmit={submitCredentials}>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  required
                />
              </label>
              <label className="field">
                <span>Password</span>
                <div className="inline-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    className="btn btn-tonal"
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              <button className="btn" disabled={loading} type="submit">
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <div className="auth-actions">
                <Link className="text-link" to="/pwdrequest">
                  Forgot password?
                </Link>
                <Link className="text-link" to="/register">
                  Register
                </Link>
              </div>
            </form>
          ) : (
            <form className="stack-form" onSubmit={submit2fa}>
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
              <button
                className="btn btn-secondary"
                type="button"
                disabled={loading}
                onClick={() => {
                  setPending2fa(null);
                  setTotp("");
                  setError("");
                }}
              >
                Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
