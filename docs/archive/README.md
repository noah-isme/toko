# Documentation Archive

These documents are historical snapshots. They describe the storefront at the time they were
written (mostly 2026-07 to 2026-08, several in Indonesian) and are **not maintained**. Names, file
paths and statuses inside them can be out of date: for example, they still mention
`@ducanh2912/next-pwa`, `src/lib/api/hooks*.ts`, `src/middleware.ts` and the zh/ja/ko locales, all
of which have since been replaced.

For the current state, use:

- [docs/STATUS.md](../STATUS.md) for implementation status (replaces the status, backlog and gap
  report files below);
- [ROADMAP.md](../../ROADMAP.md) for planned work and technical debt;
- [docs/contracts/](../contracts/README.md) for the frontend API contract (replaces
  `API_CONTRACT.md`, `GUIDE_INTEGRASI.md`, `INTEGRATION_GUIDE.md` and `QUICK_START.md`);
- [docs/adr/](../adr/README.md) for architecture decisions.

`pnpm lint:docs` does not check links in this directory. Links were only adjusted where the move
broke them (`contracts/` paths and the former machine-specific `file://` links).

| File                                                                             | What it was                                                      |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [STATUS_IMPLEMENTASI.md](STATUS_IMPLEMENTASI.md)                                 | Living implementation status (Indonesian), merged into STATUS.md |
| [BACKLOG_AKTIF.md](BACKLOG_AKTIF.md)                                             | Active backlog and completed list (Indonesian)                   |
| [DOCUMENTATION_GAP_REPORT_2026-08-07.md](DOCUMENTATION_GAP_REPORT_2026-08-07.md) | Documentation and feature gap report (Indonesian)                |
| [P0_IMPLEMENTATION_STATUS.md](P0_IMPLEMENTATION_STATUS.md)                       | P0 (critical) feature verification                               |
| [P1_IMPLEMENTATION_STATUS.md](P1_IMPLEMENTATION_STATUS.md)                       | P1 (high priority) feature report                                |
| [P2_IMPLEMENTATION_STATUS.md](P2_IMPLEMENTATION_STATUS.md)                       | P2 (medium priority) feature report                              |
| [P3_IMPLEMENTATION_STATUS.md](P3_IMPLEMENTATION_STATUS.md)                       | P3 (nice to have) feature report                                 |
| [UI_UX_GAPS_ANALYSIS.md](UI_UX_GAPS_ANALYSIS.md)                                 | 41-item UX audit (all items closed)                              |
| [UI_UX_API_CHECKLIST.md](UI_UX_API_CHECKLIST.md)                                 | Original UI/UX to API checklist                                  |
| [UI_UX_IMPLEMENTATION_COMPLETE.md](UI_UX_IMPLEMENTATION_COMPLETE.md)             | UI/UX integration completion report                              |
| [API_IMPLEMENTATION_COMPLETE.md](API_IMPLEMENTATION_COMPLETE.md)                 | API layer completion report                                      |
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)                           | Early implementation summary                                     |
| [REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md)                                 | API refactoring summary                                          |
| [API_CONTRACT.md](API_CONTRACT.md)                                               | Stub pointing at the contract index                              |
| [GUIDE_INTEGRASI.md](GUIDE_INTEGRASI.md)                                         | Integration guide (Indonesian)                                   |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)                                     | Quick integration guide (Indonesian)                             |
| [QUICK_START.md](QUICK_START.md)                                                 | Frontend quick start for the API                                 |
| [types.md](types.md)                                                             | TypeScript type sync strategy                                    |
