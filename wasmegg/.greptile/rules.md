# `wasmegg/` — client-side single-page apps

Each subdirectory is its own workspace and its own deployed app. They share code through `wasmegg/_common/` and `lib/`.

## Untrusted input

These apps decode user-supplied Egg, Inc. save data **client-side**. That data reaches parsing and game-math code directly, and it is routinely malformed — truncated saves, saves from older game versions, saves with fields the current schema doesn't expect.

Flag:

- Unguarded array indexing on values derived from decoded save data.
- Non-null assertions (`!`) applied to decoded values. Note that `@typescript-eslint/no-non-null-assertion` is disabled repo-wide, so ESLint will not catch these — this is one of the few places worth calling them out by hand.
- Assumptions that an optional protobuf field is present.

## Game math

Correctness of the computation matters more than its elegance or micro-performance. These tools produce numbers players use to make in-game decisions, so a subtly wrong formula is the worst outcome. Prefer flagging a wrong result over an inefficient one.

## `wasmegg/_common/`

Shared across all the apps above, so the same backwards-compatibility care described in `lib/.greptile/rules.md` applies. The `loot/` and `loot_legacy/` directories mix hand-written Go (`loot.go`) with generated JSON data — the Go is reviewable, the JSON is excluded via `ignorePatterns`.
