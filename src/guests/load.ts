import fixture from "../../data/fixtures/guests.sample.json";
import real from "virtual:private-guests";
import type { GuestData } from "./schema";

// Offline build only: vite.config.ts fills virtual:private-guests from data/private/guests.json (gitignored; `npm run import:guests`).
// The hosted build and tests always get null → synthetic fixture. Hosted guests come from /api (src/ui/data.tsx).
export const GUESTS: GuestData = (real as GuestData | null) ?? (fixture as unknown as GuestData);
export const GUESTS_ARE_SAMPLE = !real;
