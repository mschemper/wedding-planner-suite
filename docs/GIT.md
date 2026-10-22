# Source control

## Where the repository lives

```
C:\Users\msche\Documents\Projects\wedding-planner-suite
```

It's a normal repository on branch `main`, with tags `v2`, `v3`, `v4`, and remote `origin` = https://github.com/mschemper/wedding-planner-suite (private, created 21 Oct 2026). A Claude Code session on the PC works in place and pushes after each commit round (`git push origin main --tags`; release work may sit on a branch until the release merges).

Repo-local settings to set once:

```
git config core.autocrlf false
git config core.filemode false
```

## GitHub (an offsite copy)

To be set up by Mark, once (matching `mschemper/bauhaus-dashboard`):

1. github.com → New repository → `wedding-planner-suite`, **Private**, with no README, .gitignore or licence.
2. In PowerShell:
   ```powershell
   cd "$env:USERPROFILE\Documents\Projects\wedding-planner-suite"
   git remote add origin https://github.com/mschemper/wedding-planner-suite.git
   git push -u origin main --tags
   ```
   Git Credential Manager handles the sign-in.
3. Then set STATE "Environment" → remote exists. After that, sessions push after each commit round. Never force-push.

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
