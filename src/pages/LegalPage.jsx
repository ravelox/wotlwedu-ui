import { Link } from "react-router-dom";
import PublicAuthCard from "../components/PublicAuthCard";

const SUPPORT_EMAIL = import.meta.env.VITE_WOTLWEDU_SUPPORT_EMAIL || "admin@wotlwedu.net";

const CONTENT = {
  terms: {
    title: "Terms of Service",
    copy: "The ground rules for using Wotlwedu polls.",
    sections: [
      {
        heading: "Using Wotlwedu",
        body: "Wotlwedu helps people create polls, invite friends, and vote on shared ideas. Use it for lawful, respectful collaboration and keep your account credentials private.",
      },
      {
        heading: "Polls and content",
        body: "You are responsible for poll names, descriptions, ideas, links, images, guest invites, and votes you submit. Do not post abusive, deceptive, infringing, or illegal content.",
      },
      {
        heading: "Public polls",
        body: "Anyone with a public poll link may be able to view it. Guest voting stores a display name when provided, invite status, vote choices, device session data, and abuse signals needed to operate the poll.",
      },
      {
        heading: "Account controls",
        body: "You can export account data or request account deletion from your profile. Some organization-owned resources may need support review before deletion or transfer.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    copy: "How Wotlwedu uses data to run polls and keep invites trustworthy.",
    sections: [
      {
        heading: "Data we use",
        body: "Wotlwedu stores account profile details, organization and space membership, polls, lists, ideas, votes, notifications, invite records, sessions, and security audit events.",
      },
      {
        heading: "Guests and invitees",
        body: "Guest voters do not need an account. Public poll guest sessions store a session token on the device, vote choices, optional display name, hashed network/device signals, and invite acceptance status when an invite link is used.",
      },
      {
        heading: "Retention",
        body: "Operational retention windows are documented for auth audits, public poll participants, abuse reports, notifications, and deleted-user records. Operators use those windows for cleanup and review workflows.",
      },
      {
        heading: "Your choices",
        body: "Invite recipients can unsubscribe from future public poll email invites. Account holders can export their account data and request deletion from the profile page.",
      },
    ],
  },
  abuse: {
    title: "Abuse Policy",
    copy: "Reporting and moderation rules for public polls.",
    sections: [
      {
        heading: "What to report",
        body: "Report spam, harassment, hateful or sexual content, scams, unsafe links, impersonation, and polls that expose private information without consent.",
      },
      {
        heading: "What happens next",
        body: "Reports create an abuse audit entry for support review. Operators can lock a public poll, remove public access, restore a poll after review, or restrict invite privileges.",
      },
      {
        heading: "Invite safety",
        body: "Public poll email invites are limited by account trust and recipient suppression. Unsubscribed recipients are blocked from future public poll email invites.",
      },
    ],
  },
  support: {
    title: "Support",
    copy: "Help with accounts, data requests, public polls, and invite issues.",
    sections: [
      {
        heading: "Data requests",
        body: "Signed-in users can export account data and request deletion from Profile. If you cannot sign in, contact support with the email address tied to the account.",
      },
      {
        heading: "Public poll concerns",
        body: "Use the report form on the public poll page for abusive or unsafe polls. Include enough detail for support to identify the issue.",
      },
      {
        heading: "Invite opt out",
        body: "Use the unsubscribe link in a public poll invite email to stop future public poll email invites to that address.",
      },
    ],
  },
};

export default function LegalPage({ kind = "privacy", appVersion }) {
  const content = CONTENT[kind] || CONTENT.privacy;
  return (
    <PublicAuthCard
      title={content.title}
      copy={content.copy}
      appVersion={appVersion}
      backTo="/login"
      backLabel="Back to login"
    >
      <div className="record-stack">
        {content.sections.map((section) => (
          <section className="record-card" key={section.heading}>
            <h2>{section.heading}</h2>
            <p>{section.body}</p>
          </section>
        ))}
        {kind === "support" ? (
          <section className="record-card">
            <h2>Contact</h2>
            <p>
              Email <a className="text-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </p>
          </section>
        ) : null}
      </div>
      <div className="chip-row wrap-actions">
        <Link className="text-link" to="/terms">Terms</Link>
        <Link className="text-link" to="/privacy">Privacy</Link>
        <Link className="text-link" to="/abuse">Abuse Policy</Link>
        <Link className="text-link" to="/support">Support</Link>
      </div>
    </PublicAuthCard>
  );
}
