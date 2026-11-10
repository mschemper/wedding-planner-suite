// Inline "Discard your changes?" prompt shown before a sheet hands over to another sheet (add a relative).
import { Button } from "../kit/kit";

export function DiscardAsk({ name, onDiscard, onKeep }: { name: string; onDiscard(): void; onKeep(): void }) {
  return (
    <div className="flag warn" role="alert">
      Discard your changes to {name}?{" "}
      <Button kind="danger" onClick={onDiscard}>Discard</Button>{" "}
      <Button onClick={onKeep}>Keep editing</Button>
    </div>
  );
}
