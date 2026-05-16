import { Link } from "react-router-dom";

export default function PublicAuthCard({
  title,
  copy,
  appVersion,
  backTo = "/login",
  backLabel = "Back to login",
  children,
}) {
  return (
    <div className="login-shell">
      <div className="login-phone">
        <div className="login-gradient" />
        <div className="login-card">
          <div className="brand-mark">W</div>
          <p className="eyebrow">Phone-first control surface</p>
          <h1>{title}</h1>
          <p className="login-copy">{copy}</p>
          <p className="login-version">Version {appVersion}</p>
          {children}
          <div className="auth-footer">
            <Link className="text-link" to={backTo}>
              {backLabel}
            </Link>
            <Link className="text-link" to="/privacy">
              Privacy
            </Link>
            <Link className="text-link" to="/terms">
              Terms
            </Link>
            <Link className="text-link" to="/support">
              Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
