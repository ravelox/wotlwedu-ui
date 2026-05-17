export default function EmptyState({
  title,
  copy,
  action = null,
  icon = "spark",
  className = "",
}) {
  return (
    <div className={`empty-state empty-state-rich ${className}`.trim()}>
      <span className={`empty-state-icon empty-state-icon-${icon}`} aria-hidden="true" />
      <div>
        {title ? <strong>{title}</strong> : null}
        {copy ? <p>{copy}</p> : null}
      </div>
      {action}
    </div>
  );
}
