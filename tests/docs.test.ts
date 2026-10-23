// Docs hygiene gate (docs/RELEASE.md "Docs hygiene"): keeps the session-start reading small and the facts current.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");
const pkg = JSON.parse(read("package.json")) as { version: string };
const major = pkg.version.split(".")[0];
const agents = read("AGENTS.md");
const state = read("docs/STATE.md");

describe("session-start budget (chars; ~4 per token)", () => {
  const files = ["AGENTS.md", "docs/STATE.md", "docs/BACKLOG.md", "docs/RELEASE.md"];
  it("stays under the total", () => {
    const total = files.reduce((n, f) => n + read(f).length, 0);
    expect(total).toBeLessThanOrEqual(28000);
  });
  it.each([
    ["AGENTS.md", 11000],
    ["docs/STATE.md", 7000],
    ["docs/BACKLOG.md", 7000],
    ["docs/RELEASE.md", 6500],
    ["docs/CHANGELOG.md", 9000],
  ])("%s <= %i", (f, max) => {
    expect(read(f).length).toBeLessThanOrEqual(max);
  });
  it("does not make on-demand docs mandatory at start", () => {
    const start = agents.slice(agents.indexOf("## Session start"), agents.indexOf("## Architecture"));
    const numbered = start.split("\n").filter((l) => /^[0-4]\. /.test(l)).join("\n");
    for (const f of ["CHANGELOG", "CODEMAP", "GIT.md", "DEPLOY", "USAGE"]) expect(numbered).not.toContain(f);
  });
});

describe("facts match the release", () => {
  it("STATE names the packaged version", () => {
    expect(state).toContain(`package.json ${pkg.version}`);
    expect(state).toContain(`tag \`v${major}\``);
  });
  it("STATE keeps current + previous release rows only", () => {
    const rows = state.split("\n").filter((l) => /^\| (Current|Previous|Older|Previous release|Released) /.test(l));
    expect(rows.length).toBeLessThanOrEqual(2);
  });
  it("STATE lists the latest migration", () => {
    const last = readdirSync("migrations").filter((f) => /^\d{4}_/.test(f)).sort().pop()!.slice(0, 4);
    expect(state).toContain(last);
    expect(agents).toContain(last);
  });
  it("CHANGELOG keeps the last two releases", () => {
    const heads = read("docs/CHANGELOG.md").split("\n").filter((l) => l.startsWith("## v"));
    expect(heads.length).toBeLessThanOrEqual(2);
    expect(heads[0]).toContain(`## v${major} `);
  });
  it("BACKLOG was reviewed at this release", () => {
    expect(read("docs/BACKLOG.md")).toMatch(new RegExp(`Last reviewed: .*v${major} shipped`));
  });
});

describe("AGENTS.md points at real, current things", () => {
  it("every docs/ path it names exists", () => {
    const paths = new Set([...agents.matchAll(/docs\/[A-Za-z0-9_\-./]+\.(?:md|html)/g)].map((m) => m[0]));
    for (const p of paths) expect(existsSync(p), p).toBe(true);
  });
  it("names no retired look, font or migration plan", () => {
    for (const stale of ["Twinkle garden", "Cormorant Garamond", "drop in 0003", "DESIGN-v4.md §7.5"]) {
      expect(agents).not.toContain(stale);
    }
  });
  it("keeps the ADHD digest and the on-demand read list", () => {
    expect(agents).toContain("Digest, apply every reply");
    expect(agents).toContain("docs/DEPLOY.md");
  });
});

describe("USAGE rows", () => {
  it("the newest row is at most 200 characters", () => {
    const rows = read("docs/USAGE.md").split("\n").filter((l) => /^\| v\d+/.test(l));
    // Rows written before the cap (v8 and older) are exempt; the first row after them is checked once it exists.
    const newest = rows[0];
    if (!newest.startsWith(`| v${major} `) || major === "8") return;
    expect(newest.length).toBeLessThanOrEqual(200);
  });
});
