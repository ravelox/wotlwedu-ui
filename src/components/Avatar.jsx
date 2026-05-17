function initials(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "W";
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function toneFor(value) {
  const text = String(value || "wotlwedu");
  const total = [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (total % 6) + 1;
}

export default function Avatar({ label, imageUrl, className = "", title }) {
  const name = label || title || "Wotlwedu";
  const tone = toneFor(name);

  if (imageUrl) {
    return (
      <span className={`avatar-dot avatar-tone-${tone} ${className}`.trim()} title={title || name}>
        <img alt="" src={imageUrl} />
      </span>
    );
  }

  return (
    <span className={`avatar-dot avatar-tone-${tone} ${className}`.trim()} title={title || name}>
      {initials(name)}
    </span>
  );
}

export { initials };
