import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Loading from "../components/Loading";
import { ErrorBanner } from "../components/Feedback";
import { extractEntity, toApiError } from "../lib/api";

const STATUS_COLUMNS = ["Yes", "No", "Maybe", "Pending"];

function renderValue(data, key) {
  return data?.[key] ?? 0;
}

export default function StatisticsPage({ api }) {
  const { electionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [election, setElection] = useState(null);
  const [stats, setStats] = useState(null);
  const [lookup, setLookup] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [electionRes, statsRes] = await Promise.all([
          api.get(`/election/${electionId}`),
          api.get(`/election/${electionId}/stats`),
        ]);
        if (electionRes.status >= 400) {
          throw toApiError(electionRes, "Failed to load election");
        }
        if (statsRes.status >= 400) {
          throw toApiError(statsRes, "Failed to load statistics");
        }
        if (!cancelled) {
          setElection(extractEntity(electionRes, "election"));
          setStats(statsRes.data?.data?.statistics || statsRes.data?.statistics || null);
          setLookup(statsRes.data?.data?.lookup || statsRes.data?.lookup || {});
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load statistics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [api, electionId]);

  if (loading) return <Loading text="Loading statistics..." />;

  return (
    <div className="screen-stack">
      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Statistics</p>
            <h2>{election?.name || "Election statistics"}</h2>
          </div>
          <Link className="text-link" to={`/app/cast-vote/${electionId}`}>
            Back to vote
          </Link>
        </div>
        <ErrorBanner error={error} />
        {!stats ? (
          <div className="empty-state">No statistics available.</div>
        ) : (
          <div className="stack-form">
            {Object.entries(stats).map(([sheetName, entries]) => (
              <div className="stats-sheet" key={sheetName}>
                <strong>{sheetName}</strong>
                <div className="stats-grid stats-grid-head">
                  <span>&nbsp;</span>
                  {STATUS_COLUMNS.map((name) => (
                    <span key={name}>{name}</span>
                  ))}
                </div>
                {Object.entries(entries || {}).map(([rowKey, values]) => (
                  <div className="stats-grid" key={rowKey}>
                    <span>{lookup[rowKey] || rowKey}</span>
                    {STATUS_COLUMNS.map((name) => (
                      <span key={name}>{renderValue(values, name)}</span>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
