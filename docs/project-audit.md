# Project audit summary

## Files to keep

- `index.html`
- `app-config.js`
- `app-state.js`
- `security-helpers.js`
- `app-utils.js`
- `app-i18n.js`
- `sw.js`
- `manifest.json`
- `firebase.rules.json`
- `package.json`
- `tests/`

## Files to remove or reduce

- Inline feature logic inside `index.html` should be split out
- Any direct hardcoded auth bypass logic should be removed
- Unused demo-style environment values should not be kept in production config

## Files to add

- `README.md`
- `SECURITY.md`
- project modules under a `modules/` directory for auth, employee flows, admin flows, and reports
- more automated tests for rendering and storage behavior

## Priority order

1. Split large HTML script into modules
2. Strengthen auth and database security
3. Harden rendering and escaping
4. Validate with lint/test pipeline
5. Prepare deployment config and production checklists
