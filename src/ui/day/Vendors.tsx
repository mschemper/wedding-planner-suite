// Day > Vendors (DESIGN-v11): summary strip, grouped list, payments, Joinery preferred list (v17), add/edit sheet.
import { useState } from "react";
import { VENDOR_LABEL, vendorSummary, type Payment } from "../../plan/day";
import { chicagoToday } from "../../plan/tasks";
import type { Vendor, VendorCategory, VendorStatus } from "../../plan/types";
import { preferredIn } from "./preferredModel";
import { PreferredVendors } from "./PreferredVendors";
import type { PreferredCategory } from "../../data/preferredVendors";
import { useData } from "../data";
import { money } from "../format";
import { Button, Card, Chip, EmptyState, type ChipTone } from "../kit/kit";
import { dueLabel } from "../plan/model";
import { STATUS_LABEL, STATUS_MARK, draftOf, emptyDraft, markPaidLabel, markPaidPatch, paymentText, type VendorDraft } from "./vendorsModel";
import { VendorSheet } from "./VendorSheet";
import "./vendors.css";

export interface VendorsProps { venueId: number; date: string }

const TONE: Record<VendorStatus, ChipTone> = { idea: "plain", contacted: "plain", quoted: "gold", booked: "sage", passed: "plain" };
const StatusChip = ({ s }: { s: VendorStatus }) => <Chip tone={TONE[s]}><span aria-hidden="true">{STATUS_MARK[s]} </span>{STATUS_LABEL[s]}</Chip>;

interface SheetState { vendor: Vendor | null; initial: VendorDraft }

export function Vendors({ venueId }: VendorsProps) {
  const { vendors, edit, offline, version } = useData();
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const today = chicagoToday();
  const sum = vendorSummary(vendors, today);
  const suggest = (c: VendorCategory): string[] => (["catering", "photo", "planner", "florals", "music"].includes(c) ? preferredIn(c as PreferredCategory).slice(0, 3).map((p) => p.name) : []);
  const hasSuggestions = true;
  const addNew = (category?: VendorCategory, name?: string) => setSheet({ vendor: null, initial: emptyDraft(category, name, venueId) });
  const markPaid = (p: Payment) => void edit([markPaidPatch(p, today)], markPaidLabel(p));
  const nextDue = sum.next ? dueLabel(sum.next.due, today) : null;
  const liveVendor = sheet?.vendor ? vendors.find((v) => v.id === sheet.vendor!.id) ?? null : null;

  return (
    <div className="vd">
      <Card title="Vendors" actions={offline ? undefined : <Button kind="primary" onClick={() => addNew()}>Add vendor</Button>}>
        <div className="vd-strip">
          <strong>{sum.booked} of {sum.coreTotal} booked</strong>
          <span>Committed {money(sum.committed)}</span>
          {sum.next && nextDue && (
            <span>Next: {paymentText(sum.next)} {sum.next.vendor.name}{sum.next.amount != null ? ` ${money(sum.next.amount)}` : ""}, <span className={nextDue.overdue ? "vd-late" : undefined}>{nextDue.text}</span></span>
          )}
          {sum.overdue > 0 && <span className="vd-over"><span aria-hidden="true">⚠ </span>{sum.overdue} overdue</span>}
        </div>
      </Card>

      <Card title="By category">
        {!vendors.length && <EmptyState>{hasSuggestions ? "No vendors yet. Add the first one, or shortlist from the Joinery preferred list below." : "No vendors yet. Add the first one, like your photographer."}</EmptyState>}
        <ul className="vd-list">
          {sum.byCategory.map(({ category, best, count }) => (
            <li key={category} className="vd-row">
              <span className="vd-cat">{VENDOR_LABEL[category]}</span>
              {best ? (
                <div className="vd-main">
                  <button type="button" className="vd-open" onClick={() => setSheet({ vendor: best, initial: draftOf(best) })} aria-label={`Edit ${best.name}`}>
                    <span className="vd-name">{best.name}</span>
                  </button>
                  <StatusChip s={best.status} />
                  {best.amount != null && <span className="vd-amt">{money(best.amount)}</span>}
                  {count > 1 && <span className="vd-more">+{count - 1} other{count === 2 ? "" : "s"}</span>}
                </div>
              ) : (
                <div className="vd-empty">
                  <span className="vd-more">Nobody yet</span>
                  {!offline && <Button onClick={() => addNew(category)}>Add</Button>}
                  {!offline && (
                    <span className="vd-sugg">
                      {suggest(category).map((n) => <Button key={n} kind="quiet" onClick={() => addNew(category, n)}>{n}</Button>)}
                    </span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {sum.payments.length > 0 && (
        <Card title="Payments due">
          {sum.payments.map((p) => {
            const d = dueLabel(p.due, today);
            return (
              <div key={`${p.vendor.id}-${p.kind}`} className="vd-pay">
                <span className="vd-pay-text">
                  {paymentText(p)} · {p.vendor.name}{p.amount != null ? ` · ${money(p.amount)}` : ""} ·{" "}
                  <span className={d.overdue ? "vd-late" : undefined}>{d.overdue && <span aria-hidden="true">⚠ </span>}{d.text}</span>
                </span>
                {!offline && <Button aria-label={`Mark ${paymentText(p).toLowerCase()} paid: ${p.vendor.name}`} onClick={() => markPaid(p)}>Mark paid</Button>}
              </div>
            );
          })}
        </Card>
      )}

      <PreferredVendors venueId={venueId} onOpen={(id) => { const v = vendors.find((x) => x.id === id); if (v) setSheet({ vendor: v, initial: draftOf(v) }); }} />

      {sheet && (!sheet.vendor || liveVendor) && <VendorSheet key={liveVendor ? `${liveVendor.id}-${version("vendors", liveVendor.id) ?? 0}` : `new-${sheet.initial.category}-${sheet.initial.name}`} vendor={liveVendor} initial={liveVendor ? draftOf(liveVendor) : sheet.initial} onClose={() => setSheet(null)} />}
    </div>
  );
}
