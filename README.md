# frontend-support

Frontend packages and specs from Hollis Labs, in one public repository. Packages are grouped by language or framework:
`ts/<name>/` holds a TypeScript package, published to npm under the `@hollis-labs` scope. Other groups (for example a
framework-specific one) can sit beside `ts/` when they are needed.

It is not: a place for Go libraries (see `libs`), for applications, or for retired code.

> **Pre-release.** Interfaces and behavior can change without notice.

## Layout

```
ts/<name>/              one TypeScript package per directory, with its own package.json
scripts/                import-repo, check-layout, scan-public (repo.conf holds the settings)
scan-public.allow.d/    owner-reviewed allowlists for the public-hygiene scan, one <name>.allow per package
```

## Importing a repository

```sh
git switch -c import-<name>
scripts/import-repo <path-or-url-of-source> [<name>]    # lands in ts/<name>/, history kept
scripts/check-layout
```

Needs `git-filter-repo`. The import stops, writing nothing, on a file over 10 MiB, a submodule or Git LFS in the source
history, and when `scripts/scan-public` finds anything that must not be public. Old tags are not carried; they are listed in
the merge commit message.

## Public hygiene

`scripts/scan-public` scans the tree and every commit for secrets, internal hosts and addresses, and personal paths.
