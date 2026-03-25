import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorBanner } from "../components/Feedback";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function LoginPage({ api, appVersion, onLogin }) {
  const [email, setEmail] = useState("root@localhost.localdomain");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pending2fa, setPending2fa] = useState(null);
  const [invite, setInvite] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [pendingLink, setPendingLink] = useState(null);
  const googleButtonRef = useRef(null);
  const inviteTokenRef = useRef("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("invite") || "";
    inviteTokenRef.current = inviteToken;

    if (!inviteToken) return undefined;

    let cancelled = false;

    async function loadInvite() {
      setInviteLoading(true);
      try {
        const response = await api.get(`/login/invite/${encodeURIComponent(inviteToken)}`);
        if (response.status >= 400) {
          if (!cancelled) {
            setInvite(null);
            setError(response.data?.message || "Invite not found");
          }
          return;
        }
        if (!cancelled) {
          setInvite(response.data?.data?.invite || response.data?.invite || null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Invite not found");
      } finally {
        if (!cancelled) setInviteLoading(false);
      }
    }

    loadInvite();
    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || pending2fa) return undefined;

    let cancelled = false;
    let script = document.querySelector('script[data-google-gsi="true"]');

    async function handleGoogleCredentialResponse(response) {
      setLoading(true);
      setError("");
      setPendingLink(null);

      try {
        const loginResponse = await api.post("/login/google", {
          idToken: response?.credential,
          inviteToken: inviteTokenRef.current || undefined,
        });
        if (loginResponse.status >= 400) {
          setError(loginResponse.data?.message || "Google sign-in failed");
          return;
        }
        if (loginResponse.data?.data?.linkRequired) {
          setPendingLink({
            linkToken: loginResponse.data.data.linkToken,
            provider: loginResponse.data.data.provider || "google",
          });
          return;
        }
        onLogin(loginResponse.data);
      } catch (err) {
        setError(err.message || "Google sign-in failed");
      } finally {
        setLoading(false);
      }
    }

    function renderGoogleButton() {
      if (
        cancelled ||
        !window.google?.accounts?.id ||
        !googleButtonRef.current
      ) {
        return;
      }

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: "320",
        text: "signin_with",
        shape: "pill",
      });
    }

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => {
        cancelled = true;
      };
    }

    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.googleGsi = "true";
      document.head.appendChild(script);
    }

    script.addEventListener("load", renderGoogleButton);

    return () => {
      cancelled = true;
      script?.removeEventListener("load", renderGoogleButton);
    };
  }, [api, onLogin, pending2fa]);

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
    setPendingLink(null);

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

  async function confirmPendingLink() {
    if (!pendingLink?.linkToken) return;

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/login/google/link", {
        linkToken: pendingLink.linkToken,
      });

      if (response.status >= 400) {
        const message =
          response.data?.message === "Invalid social link token"
            ? "Link confirmation expired. Sign in with Google again to restart linking."
            : response.data?.message || "Google link confirmation failed";
        setError(message);
        return;
      }

      setPendingLink(null);
      onLogin(response.data);
    } catch (err) {
      setError(
        err.message === "Invalid social link token"
          ? "Link confirmation expired. Sign in with Google again to restart linking."
          : err.message || "Google link confirmation failed"
      );
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
          {invite ? (
            <div className="invite-banner">
              <strong>Invitation ready</strong>
              <span>
                Sign in with Google to join {invite.organizationName} as {invite.email}.
              </span>
            </div>
          ) : null}
          {inviteLoading ? <div className="chip">Checking invite...</div> : null}
          {pendingLink ? (
            <div className="invite-banner">
              <strong>Confirmation required</strong>
              <span>
                Google authentication succeeded. Confirm to link this Google sign-in to your
                existing Wotlwedu account.
              </span>
              <div className="inline-field">
                <button className="btn" type="button" disabled={loading} onClick={confirmPendingLink}>
                  {loading ? "Confirming..." : "Confirm Link"}
                </button>
                <button
                  className="btn btn-tonal"
                  type="button"
                  disabled={loading}
                  onClick={() => setPendingLink(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

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
              {GOOGLE_CLIENT_ID ? (
                <>
                  <div className="auth-divider" aria-hidden="true">
                    <span />
                    <span>or continue with Google</span>
                    <span />
                  </div>
                  <div className="google-signin-slot" ref={googleButtonRef} />
                </>
              ) : null}
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
