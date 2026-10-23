# Source control

## Where the repository lives

```
C:\Users\msche\Documents\Projects\wedding-planner-suite
```

It's a normal repository on branch `main`, with release tags `vN` (v2 onward), and remote `origin` = https://github.com/mschemper/wedding-planner-suite (private, created 21 Oct 2026). A Claude Code session on the PC works in place and pushes after each commit round (`git push origin main --tags`; release work may sit on a branch until the release merges).

Repo-local settings to set once:

```
git config core.autocrlf false
git config core.filemode false
```

## GitHub (an offsite copy)

Remote exists (set up 21 Oct 2026). Push after each commit round: `git push origin main --tags`. Never force-push. WSL push can hang on credentials: push from Windows PowerShell (Git Credential Manager). Recreate from scratch only if the remote is lost: private repo `mschemper/wedding-planner-suite`, no README/.gitignore/licence, `git remote add origin ...`, `git push -u origin main --tags`.

## Bundle fallback (Cowork / cloud sessions)

A cloud session can't commit on the PC without delete permission (git lock files). Work in the container instead and hand back a bundle:

```bash
git clone <bundle> wps && cd wps && git remote remove origin   # origin = bundle path; a trap
# ... work, commit ...
git bundle create wedding-planner-suite.bundle --all
```

On the PC: `git fetch <bundle> main:incoming && git merge incoming`.

## Never in git

`data/private/`, `dist/`, `node_modules/`, `archive/`. A private repo doesn't change this: guest data stays local.
