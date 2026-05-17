export default function Loading({ text = "Loading..." }) {
  return (
    <div className="loading loading-rich" role="status" aria-live="polite">
      <span className="loading-orbit" aria-hidden="true" />
      <div>
        <strong>{text}</strong>
        <span>Gathering the latest from your people.</span>
      </div>
      <div className="loading-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
