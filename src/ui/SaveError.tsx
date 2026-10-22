// Shows a failed save (SaveResult). Conflict / not found → message names who changed it + Reload (drops local edits).
import { useData, type SaveResult } from "./data";

export function SaveError({ result, onDismiss }: { result: Extract<SaveResult, { ok: false }> | null; onDismiss?: () => void }) {
  const { reload } = useData();
  if (!result) return null;
  const stale = result.kind === "conflict" || result.kind === "not_found";
  return (
    <div className="flag warn" role="alert">
      <strong>{stale ? "Changed elsewhere · " : result.kind === "readonly" ? "Read-only · " : "Not saved · "}</strong>
      {result.message}
      {result.issues && result.issues.length > 1 && (
        <ul className="save-issues">{result.issues.map((i) => <li key={`${i.where}|${i.msg}`}>{i.where}: {i.msg}</li>)}</ul>
      )}
      <span className="row-gap">
        {(stale || result.kind === "unauthorized") && (
          <button className="link-btn" onClick={() => (result.kind === "unauthorized" ? window.location.reload() : void reload().then(onDismiss))}>Reload</button>
        )}
        {onDismiss && <button className="link-btn" onClick={onDismiss}>Dismiss</button>}
      </span>
    </div>
  );
}
