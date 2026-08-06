# `.github/` — CI and automation

## Workflow security

Flag:

- Third-party actions pinned to a tag or branch rather than a commit SHA.
- Secrets interpolated directly into `run:` blocks, where they can leak through shell tracing or logs.
- Missing least-privilege `permissions:` blocks.
- Workflows that can push to the default branch without a guard.

## The `update-*.yml` workflows

Several workflows regenerate committed JSON game data and push it on a schedule. When reviewing changes to these, the risk to watch for is a failure mode that commits **partial or empty** data rather than failing loudly — a job that writes a truncated file and pushes it anyway is worse than one that errors out.

The data files these produce are excluded from review via `ignorePatterns` in `.greptile/config.json`. If a workflow starts writing a data file not on that list, that's worth mentioning so the exclusions can be kept in sync.
