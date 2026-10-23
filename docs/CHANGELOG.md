# Changelog

## v8 - Household card, names that follow the people, Prairie & Steel Chicago look, Ask the planner (23 Oct 2026)

**Deployed** 23 Oct 2026 (Worker version 13029a97). D1 migration 0005 (add-only: `parties.name_custom`). Ask the planner and Add venue research use the Cloudflare secret `ANTHROPIC_API_KEY`. Theme options: docs/mockups/v8-theme-options.html; Mark picked C · Prairie & Steel with more Chicago. Design note: docs/DESIGN-v8.md.

**Household card** (replaces the separate person and household sheets): tapping any name opens its household — envelope name, invite decision, ring, kids rule at the top; every person below with first / last / age edited in place, "More about…" for relatives, RSVP, local, notes; add someone; move / own household / merge; remove from the guest list. One Save. "Add" now asks: new household (family / friends) or someone to an existing household.

**Names**: household (envelope) names follow their people with "&" and each person's own surname ("Fran & Len Van Noord", "Erica Schemper & Erik Vorhes", "Sam Lee & Guest"); the Worker keeps them in sync on every save. "Write my own" keeps a name as written. A one-time "Tidy" banner previews every household whose name doesn't match (live audit 23 Oct: 38 of 57 used "and", 4 left out a living adult, 1 dropped a partner's surname).

**Ask the planner** (star button, every tab): ask in plain English; Claude answers from a snapshot of the plan (adults and kids kept apart) and proposes edits — decisions, kids rule, ring, local/away, RSVP, renames, add a person, add a task — each shown before you tap Apply. Nothing changes on its own.

**Look**: Prairie & Steel — Frank Lloyd Wright art-glass tulips framing a Chicago panorama (Marina City, Willis, Hancock, lake), Chicago flag stripes and stars, Josefin Sans, square cards; night-skyline dusk.

**Fix (also shipped as a hotfix on v7, 23 Oct)**: Add venue research no longer fails when Claude gives a per-guest line as a total or a percent as "22" — such lines are repaired, and unusable ones are listed instead of failing the whole result.

## v7 - Conservatory garden look, hidden ancestors, adults vs kids, Add venue research (22 Oct 2026)

**Deployed** 22 Oct 2026 (Worker version 66408ed9). D1 migration 0004 (add-only: `custom_venues`). Needs the Cloudflare secret `ANTHROPIC_API_KEY` for web research (without it, venues are added by hand). Theme options: docs/mockups/v7-theme-options.html; Mark picked B · Conservatory Modern. Design note: docs/DESIGN-v7.md.

**Look**: Conservatory Modern — Garfield Park Conservatory + 1950s botanical prints: flat coral / blush / mustard blooms and teal stems in the header and card corners, DM Serif Display + Jost, rounded cards, teal pill tabs; day and dusk.

**Family tree**
  * Ancestors who are deceased or won't attend are never shown. Living relatives they connect are joined by a dashed line (e.g. Fran sits one level above Lugene, linked through his parents).
  * "Place by relation": "Fran is Lugene's aunt / cousin / sibling / parent / niece / grandparent" — the hidden links are created for you. In the "Not placed yet" tray (By relation…) and in the person sheet.
  * New relations: great-aunt/uncle, cousin once removed, great-grandparent (+ by marriage).
  * Partners keep their own surnames everywhere: "Erica Schemper & Erik Vorhes", "Fran & Len Van Noord".

**Friends**: last names in quick add (each partner's own); "N friends have no last name" with a one-step fill from the household name (preview, Undo).

**Adults vs kids**: venue capacity checks adults and kids separately (Firehouse 82 adults + 20 kids upstairs); room check, ring headers, venue cards, Today and pricing labels show the split. Kids are still priced as adults (Mark's choice).

**Decide**: "Select several" → set decision, ring, kids rule or local/away for many households in one step (Undo).

**Venues**: "Add venue" → name (+ city) → Claude researches the web (Opus 5.5 + web search, ~1 min) → preview with capacity, line items, sources, confidence, ≈ total → "Add as potential venue" adds it to the shortlist and a task to contact the venue. Manual entry when research is unavailable.


_Older releases: docs/CHANGELOG-archive.md. Keep only the last two here; move the oldest at each release (docs/RELEASE.md checklist)._
