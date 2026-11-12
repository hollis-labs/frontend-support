# frontend-support

Frontend packages and specs from Hollis Labs, in one public repository. Each package lives at `<group>/<name>/`; today the
only group is `ts/` (TypeScript packages published under `@hollis-labs`).

## Start Here

- `README.md` - what this repository is and how to use it.
- `ts/<name>/` - one directory per imported repository. Code arrives through `scripts/import-repo`.
- `scripts/` - all tooling (`repo.conf` holds the per-repository settings).
- `scan-public.allow.d/` - owner-reviewed allowlists for the public-hygiene scan.
- `.github/workflows/guards.yml` - layout and scan-public on every push and pull request.

## Commands

```sh
scripts/check-layout
scripts/scan-public [--ref HEAD]
scripts/scan-public --source <path-or-url>    # scan a repository before importing it
scripts/import-repo [--target DIR] <source> [<name>]
```

## Boundaries

- Bring code in with `scripts/import-repo`, not by copying files, so history survives. Work on a branch, not main.
- Stop conditions (file over 10 MiB, submodule, Git LFS, scan-public finding) need an owner decision; do not work around them.
- Clean break: no shims, redirects, aliases or stubs. The original repository is deleted by the owner after the import.
- This repository is public. Nothing secret, no token, internal host name, internal address or personal path may enter a file,
  a commit message or CI config. Allowlist entries (`RULE-ID PATH-GLOB REASON`) are owner-reviewed and never quote a value.
- Packages are versioned independently. Publishing to npm is the owner's step; this repository does not publish on its own.
- No Go modules here.

## Do Not

- Add a `CLAUDE.md`; `AGENTS.md` is the single instruction file.
- Tag or publish on your own.
