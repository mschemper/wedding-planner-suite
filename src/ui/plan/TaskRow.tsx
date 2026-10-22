// One task line (Plan + Today): 44px checkbox, title (opens the sheet / Plan), owner, category, due, source link.
import { useState } from "react";
import type { Task } from "../../plan/types";
import { useData } from "../data";
import { Chip, OwnerChip } from "../kit/kit";
import { completePatch, doneLabel, dueLabel, reopenPatch, sourceUrl } from "./model";
import "./plan.css";

export function TaskRow({ task, today, onOpen, highlight }: { task: Task; today: string; onOpen(t: Task): void; highlight?: boolean }) {
  const { edit, offline } = useData();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const done = task.status === "done";
  const due = dueLabel(task.due, today);
  const url = sourceUrl(task.source);
  const toggle = async () => {
    setBusy(true);
    setErr("");
    const r = await edit([done ? reopenPatch(task) : completePatch(task)], done ? `Reopened: ${task.title}` : doneLabel(task));
    setBusy(false);
    if (!r.ok) setErr(r.message);
  };
  return (
    <li className={`pl-task${done ? " is-done" : ""}${highlight ? " is-hl" : ""}`} id={`task-${task.id}`}>
      <button type="button" role="checkbox" aria-checked={done} className="pl-check" disabled={offline || busy} onClick={() => void toggle()}
        aria-label={done ? `Reopen: ${task.title}` : `Mark done: ${task.title}`}>
        <span className="pl-box" aria-hidden="true">{done ? "✓" : ""}</span>
      </button>
      <div className="pl-task-main">
        <button type="button" className="pl-task-title" onClick={() => onOpen(task)}>{task.title}</button>
        <div className="pl-task-meta">
          <OwnerChip owner={task.owner} />
          <span>{task.category}</span>
          {!done && <span className={due.overdue ? "pl-overdue" : ""}>{due.text}</span>}
          {done && task.done_at && <span>done {task.done_at.slice(0, 10)}</span>}
          {url && <a href={url} target="_blank" rel="noopener noreferrer" className="pl-src">email ↗</a>}
          {!url && task.source === "email" && <Chip>from email</Chip>}
        </div>
        {err && <div className="pl-err" role="alert">Not saved: {err}</div>}
      </div>
    </li>
  );
}
