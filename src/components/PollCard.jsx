import { Link } from "react-router-dom";
import Avatar, { initials } from "./Avatar";

export function formatPollDate(value) {
  if (!value) return "No expiration";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function timeUntil(value) {
  if (!value) return "No deadline";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No deadline";
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return "Closed";
  const diffHours = Math.round(diffMs / (60 * 60 * 1000));
  if (diffHours < 24) return `${Math.max(diffHours, 1)}h left`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d left`;
}

export function displayPerson(user) {
  if (!user) return "Someone";
  if (typeof user === "string") return user;
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.alias ||
    user.email ||
    user.name ||
    user.id ||
    "Someone"
  );
}

export function getPollStatus(poll) {
  const statusName = poll?.status?.name || poll?.publicContext?.statusLabel || "";
  if (statusName.toLowerCase() === "stopped") return "Closed";
  if (poll?.expiration) {
    const date = new Date(poll.expiration);
    if (!Number.isNaN(date.getTime()) && date.getTime() < Date.now()) return "Closed";
  }
  return statusName || "Open";
}

export function firstImageUrl(poll) {
  return (
    poll?.imageUrl ||
    poll?.image?.url ||
    poll?.list?.items?.find((item) => item?.image?.url)?.image?.url ||
    poll?.list?.items?.find((item) => item?.imageUrl)?.imageUrl ||
    poll?.items?.find((item) => item?.image?.url)?.image?.url ||
    poll?.items?.find((item) => item?.imageUrl)?.imageUrl ||
    null
  );
}

export function normalizePollCard(poll, options = {}) {
  if (!poll) return null;
  const creatorName = poll.creator?.name || displayPerson(poll.creatorUser || poll.creator);
  const items = poll.ideas || poll.list?.items || poll.items || [];
  const participantCount =
    poll.participantCount ??
    poll.publicContext?.participantCount ??
    options.participantCount ??
    poll.group?.users?.length ??
    0;
  const completionRate =
    poll.completionRate ??
    poll.publicContext?.completionRate ??
    options.completionRate ??
    0;

  return {
    id: poll.id,
    name: poll.name || "Untitled poll",
    description: poll.description || "",
    expiration: poll.expiration,
    status: { name: getPollStatus(poll) },
    creator: {
      id: poll.creator?.id || poll.creatorUser?.id || poll.creator || "wotlwedu",
      name: creatorName,
      initials: poll.creator?.initials || initials(creatorName),
    },
    audience: poll.audience || poll.group || null,
    list: poll.list || null,
    imageUrl: firstImageUrl(poll),
    ideas: items.slice(0, 4).map((item) => ({
      id: item.id || item.name,
      name: item.name || "Untitled idea",
      imageUrl: item.image?.url || item.imageUrl || null,
    })),
    participantCount,
    completionRate,
    winner: poll.winner || options.winner || null,
    action: options.action || poll.action || {
      label: getPollStatus(poll) === "Closed" ? "View Results" : "View Results",
      href: `/app/statistics/${poll.id}`,
    },
  };
}

export function PollVisual({ card, className = "social-poll-image" }) {
  const label = card?.name || "Poll";
  if (card?.imageUrl) {
    return <img className={className} src={card.imageUrl} alt="" />;
  }
  return (
    <div className={`${className} social-poll-image-fallback`} aria-hidden="true">
      <span>{label.slice(0, 1).toUpperCase()}</span>
      <div className="fallback-idea-row">
        {(card?.ideas || []).slice(0, 3).map((idea) => (
          <small key={idea.id || idea.name}>{initials(idea.name).slice(0, 1)}</small>
        ))}
      </div>
    </div>
  );
}

export function AvatarStack({ creator, count = 0 }) {
  const people = [
    creator || { initials: "W", name: "Wotlwedu" },
    ...(count > 1 ? [{ initials: "+", name: `${count - 1} more` }] : []),
  ].slice(0, 3);
  return (
    <div className="avatar-stack" aria-label={`${count || 1} participant${count === 1 ? "" : "s"}`}>
      {people.map((person, index) => (
        <Avatar
          className={person.initials === "+" ? "avatar-more" : ""}
          label={person.initials === "+" ? person.name : person.name || person.initials}
          title={person.name}
          key={`${person.name || "person"}-${index}`}
        />
      ))}
    </div>
  );
}

export function PollCard({ poll, card: providedCard, tone = "default", compact = false, meta = null }) {
  const card = providedCard || normalizePollCard(poll);
  if (!card) return null;
  const action = card.action || { label: "View Results", href: `/app/statistics/${card.id}` };
  const participantCount = card.participantCount || 0;

  return (
    <article className={`social-poll-card social-poll-card-${tone}${compact ? " social-poll-card-compact" : ""}`}>
      <PollVisual card={card} />
      <div className="social-poll-body">
        <div className="split-heading">
          <div>
            <p className="eyebrow">{card.status?.name || "Open"}</p>
            <h3>{card.name || "Untitled poll"}</h3>
          </div>
          <span className="chip">{timeUntil(card.expiration)}</span>
        </div>
        {card.description ? <p>{card.description}</p> : null}
        <div className="idea-chip-row">
          {(card.ideas || []).slice(0, 4).map((idea) => (
            <span className="chip chip-soft" key={idea.id || idea.name}>
              {idea.name}
            </span>
          ))}
          {!card.ideas?.length && card.audience?.name ? (
            <span className="chip chip-soft">{card.audience.name}</span>
          ) : null}
        </div>
        {meta}
        <div className="social-card-footer">
          <div className="participant-summary">
            <AvatarStack creator={card.creator} count={participantCount} />
            <span>
              {participantCount} participant{participantCount === 1 ? "" : "s"} ·{" "}
              {card.completionRate || 0}% complete
            </span>
          </div>
          <Link className="btn btn-secondary" to={action.href}>
            {action.label}
          </Link>
        </div>
      </div>
    </article>
  );
}
