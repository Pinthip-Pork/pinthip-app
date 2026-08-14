# Pinthip App

This project is a Firebase-backed PWA for employee attendance, leave requests, fuel reimbursement, delivery job tracking, and admin dashboards.

## Current structure

- `index.html` — main app shell and large feature implementation
- `app-config.js` — Firebase configuration
- `app-state.js` — session/auth state helpers
- `security-helpers.js` — storage and HTML escaping helpers
- `app-utils.js` — shared browser utilities
- `app-i18n.js` — language dictionaries
- `sw.js` — service worker cache strategy
- `manifest.json` — PWA manifest
- `firebase.rules.json` — Firebase access rules baseline
- `package.json` — lint/test scripts
- `tests/` — basic Node-based tests

## Important audit findings

### Keep
- Static web app shell is acceptable for a small internal tool
- Service worker hardening is a good improvement
- Session state helpers and escaping helpers are useful guardrails

### Remove or refactor
- Large feature logic kept inline in `index.html` should be split into modules
- Any hardcoded admin bypass or trusted client-side permission checks must be removed before production
- Client-side Firebase config should be migrated behind secure auth and strict rules

### Add before production
- Real Firebase Auth with verified roles
- Enforced Firebase Realtime Database rules
- Centralized rendering layer with escaped output
- Full automated lint/test validation on a machine with Node installed

## Recommended next work

1. Split `index.html` by feature area
2. Replace hardcoded client trust logic with authenticated user roles
3. Tighten database rules
4. Replace unsafe HTML generation with escaping and `textContent`
5. Run lint/tests in CI or local Node environment

## Notes

This repo is not production-safe yet. It is a useful internal prototype, but it still needs security and modularization work before real deployment.
