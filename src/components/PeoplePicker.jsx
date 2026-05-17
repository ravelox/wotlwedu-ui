import { useMemo, useState } from "react";
import Avatar from "./Avatar";

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function displayPerson(person) {
  return (
    person?.fullName?.trim?.() ||
    [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim() ||
    person?.alias ||
    person?.email ||
    person?.id ||
    "Unknown person"
  );
}

export function parseEmails(value) {
  return [...new Set(
    String(value || "")
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  )];
}

export default function PeoplePicker({
  people = [],
  selectedIds = [],
  onSelectedIdsChange,
  emailValue = "",
  onEmailValueChange,
  allowEmails = false,
  disabled = false,
  title = "People",
  emptyText = "No people are available.",
  emailLabel = "Email invites",
  emailPlaceholder = "name@example.com, friend@example.com",
  recentEmails = [],
}) {
  const [filter, setFilter] = useState("");
  const selectedSet = new Set(ensureArray(selectedIds));
  const emailList = useMemo(() => parseEmails(emailValue), [emailValue]);
  const filteredPeople = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return ensureArray(people);
    return ensureArray(people).filter((person) =>
      [displayPerson(person), person?.email, person?.alias, person?.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [filter, people]);

  function togglePerson(personId) {
    if (!personId || disabled || !onSelectedIdsChange) return;
    const next = selectedSet.has(personId)
      ? ensureArray(selectedIds).filter((id) => id !== personId)
      : [...ensureArray(selectedIds), personId];
    onSelectedIdsChange(next);
  }

  function addEmail(email) {
    if (!email || disabled || !onEmailValueChange) return;
    const next = [...new Set([...emailList, email.trim().toLowerCase()])];
    onEmailValueChange(next.join(", "));
  }

  function removeEmail(email) {
    if (disabled || !onEmailValueChange) return;
    onEmailValueChange(emailList.filter((entry) => entry !== email).join(", "));
  }

  return (
    <div className="people-picker">
      <div className="split-heading compact">
        <div>
          <span className="detail-label">{title}</span>
          <strong>
            {selectedSet.size} selected{allowEmails ? ` · ${emailList.length} email${emailList.length === 1 ? "" : "s"}` : ""}
          </strong>
        </div>
      </div>

      {people.length ? (
        <>
          <label className="field people-picker-search">
            <span>Search people</span>
            <input
              disabled={disabled}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search by name or email"
              value={filter}
            />
          </label>
          <div className="people-picker-list">
            {filteredPeople.map((person) => {
              const name = displayPerson(person);
              const selected = selectedSet.has(person.id);
              return (
                <button
                  className={`person-choice${selected ? " person-choice-selected" : ""}`}
                  disabled={disabled}
                  key={person.id}
                  onClick={() => togglePerson(person.id)}
                  type="button"
                >
                  <Avatar label={name} />
                  <span>
                    <strong>{name}</strong>
                    {person.email ? <small>{person.email}</small> : null}
                  </span>
                  <span className="chip">{selected ? "Selected" : "Add"}</span>
                </button>
              );
            })}
            {!filteredPeople.length ? <div className="empty-state">No people match that search.</div> : null}
          </div>
        </>
      ) : (
        <div className="empty-state">{emptyText}</div>
      )}

      {allowEmails ? (
        <div className="people-picker-email">
          <label className="field">
            <span>{emailLabel}</span>
            <textarea
              disabled={disabled}
              onChange={(event) => onEmailValueChange?.(event.target.value)}
              placeholder={emailPlaceholder}
              rows="3"
              value={emailValue}
            />
          </label>
          <div className="chip-row wrap-actions">
            {emailList.map((email) => (
              <button
                className="chip chip-button"
                disabled={disabled}
                key={email}
                onClick={() => removeEmail(email)}
                type="button"
              >
                {email}
              </button>
            ))}
            {ensureArray(recentEmails)
              .filter((email) => email && !emailList.includes(email.toLowerCase()))
              .slice(0, 4)
              .map((email) => (
                <button
                  className="chip chip-soft chip-button"
                  disabled={disabled}
                  key={email}
                  onClick={() => addEmail(email)}
                  type="button"
                >
                  Add {email}
                </button>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
