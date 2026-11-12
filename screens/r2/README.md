# Round 2 renders (CW-20261112-0080, after the Design Lead's 3 required changes)

kit-identity head 94bea11. 390 and 1440 px, dark and light, 10 shots each. Fresh backend per combination, so no fixture noise.

- Change 1, errors: `*-05-signin-error`, `*-06-password-wrong-current`, `*-02-setup-mismatch`, `*-08c-keys-create-error` (danger Callout: colour, icon, border, role=alert).
- Change 2, wording: `*-07a-keys-empty`, `*-07-keys-list`, `*-08-keys-create-dialog`, `*-08b-keys-disclosure` ("Access keys" / "Create key" throughout).
- Change 3, sessions: `*-13-sessions` ("Firefox on Windows", "Chrome on Linux", relative times).
- Also new: empty key list (`07a`) and in-dialog create error (`08c`).
Round 1 shots in `screens/` are unchanged.
