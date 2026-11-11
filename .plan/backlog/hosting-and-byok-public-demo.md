# Hosting and bring-your-own-key public demo

- **Importance:** High
- **Points:** 14 (8 implementation, 3 hosting templates, 3 publication preparation)
- **Status:** implementation prepared; deployment pending with publication owner

## Delivered scope

[H09](../handoffs/H09-public-demo-byok-and-publication-prep.md) accepts visitor-funded
inference, free Render hosting, sleep and state resets; owner machines stay private.
Request-local BYOK, limits, tab-only UI, Dockerfile and Render Blueprint are implemented.
See [ADR 011](../ADR/011-hosting-and-public-demo.md) and
[report](../handoffs/H09-public-demo-byok-and-publication-prep-report.md) for verification.

## Remaining owner action

Publish the cleaned fresh-history repository, deploy the Blueprint, set the private console
password and verify the actual HTTPS public URL. No public URL or external deployment has
been created by H09; this original live-URL acceptance remains pending.

## Links

- [README deployment guide](../../README.md#deploy-your-own)
- [State limits](../ADR/009-in-memory-state-with-caps.md)
- [First CI run](github-ci-first-run-and-cross-platform.md)
