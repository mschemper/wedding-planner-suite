import fixture from "../../data/fixtures/guests.sample.json";
import type { GuestData } from "./schema";

// data/private/guests.json is gitignored; produced by `npm run import:guests`. Falls back to the synthetic fixture.
const privateData = import.meta.glob<{ default: GuestData }>("/data/private/guests.json", { eager: true });
const real = Object.values(privateData)[0]?.default;

export const GUESTS: GuestData = real ?? (fixture as unknown as GuestData);
export const GUESTS_ARE_SAMPLE = !real;
