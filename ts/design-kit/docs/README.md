# docs

Repo-level design documentation for `design-kit`.

- **[`token-contract.md`](./token-contract.md)** — the token contract: the *names*
  and their types. 43 color tokens, plus the type, radius and letter-spacing scales.
  Authored by CW-20260910-0111, approved by Chrispian, landed 2026-09-11. This is the
  document `packages/design-tokens` implements, `packages/eslint-config-design`
  enforces, and everything else depends on.

  **Spacing is deliberately not in it** — measured at 99.4% adherence to Tailwind's
  scale already (6,751 named steps against 39 arbitrary), so it is inherited, not
  redefined, and gets no tokens. Letter-spacing *is* in it, and was not in the
  original brief.

  Corrections made after approval are annotated **in place**, each naming who found
  it, so a reader sees the correction rather than a silently different number. That
  matters here more than usual: four of this epic's own reversals came from a headline
  number that counted something other than what it named.

Package-specific documentation stays with its package.
