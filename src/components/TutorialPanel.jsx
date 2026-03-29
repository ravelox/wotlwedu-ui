import { Link } from "react-router-dom";

function stepPath(step) {
  switch (step?.key) {
    case "create_options_list":
    case "add_items":
      return "/app/list/add";
    case "create_audience":
    case "add_yourself_to_audience":
      return "/app/group/add";
    case "create_poll":
    case "start_poll":
      return "/app/election/add";
    case "cast_vote":
      return "/app/cast-vote";
    case "view_stats":
      return step.resourceId ? `/app/statistics/${step.resourceId}` : "/app/election";
    default:
      return "/app/home";
  }
}

export default function TutorialPanel({
  tutorial,
  onStart,
  starting = false,
  compact = false,
  title = "Poll tutorial",
}) {
  if (!tutorial && !onStart) return null;

  if (!tutorial) {
    return (
      <section className="surface-card tutorial-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Tutorial</p>
            <h3>{title}</h3>
          </div>
        </div>
        <p className="tutorial-copy">
          Walk through creating a real options list, audience group, poll, and live stats using the
          existing UI.
        </p>
        <div className="split-actions">
          <button className="btn" onClick={onStart} type="button" disabled={starting}>
            {starting ? "Starting..." : "Start Tutorial"}
          </button>
        </div>
      </section>
    );
  }

  const nextStep =
    tutorial.steps?.find((step) => step.key === tutorial.nextStepKey) ||
    tutorial.steps?.find((step) => !step.complete) ||
    null;

  return (
    <section className={`surface-card tutorial-panel${compact ? " tutorial-panel-compact" : ""}`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Tutorial</p>
          <h3>{title}</h3>
        </div>
        <span className="chip chip-soft">
          {tutorial.progress?.completedSteps || 0}/{tutorial.progress?.totalSteps || 0} complete
        </span>
      </div>

      {nextStep ? (
        <div className="tutorial-callout">
          <strong>Next: {nextStep.title}</strong>
          <p>{nextStep.detail}</p>
          {nextStep.suggestedName ? (
            <div className="chip-row">
              <span className="chip">Use this name</span>
              <span className="chip chip-soft">{nextStep.suggestedName}</span>
            </div>
          ) : null}
          <div className="split-actions">
            <Link className="btn btn-secondary" to={stepPath(nextStep)}>
              Open Step
            </Link>
          </div>
        </div>
      ) : (
        <div className="tutorial-callout">
          <strong>Tutorial completed</strong>
          <p>The real poll, audience, and stats flow is complete.</p>
          {tutorial.bindings?.electionId ? (
            <div className="split-actions">
              <Link className="btn btn-secondary" to={`/app/statistics/${tutorial.bindings.electionId}`}>
                View Stats
              </Link>
            </div>
          ) : null}
        </div>
      )}

      {!compact && tutorial.steps?.length ? (
        <div className="tutorial-step-list">
          {tutorial.steps.map((step) => (
            <div className={`tutorial-step${step.complete ? " tutorial-step-complete" : ""}`} key={step.key}>
              <div>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
              </div>
              <span className={`chip ${step.complete ? "" : "chip-soft"}`}>
                {step.complete ? "Done" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
