# Security review

## High-risk findings

1. Admin role is trusted from client-side state and can be bypassed in a browser.
2. Firebase config and app logic are client-exposed.
3. Dynamic HTML uses user-derived values in templates without consistent escaping.
4. The app still relies heavily on inline JavaScript for core logic.

## Immediate actions

- Move admin authorization to a trusted server or Firebase Auth + custom claims.
- Enforce database rules so only valid authenticated users can read/write allowed paths.
- Replace direct HTML concatenation with escaped safe rendering.
- Move page logic out of `index.html` into smaller files.
- Remove any logic that treats a browser flag as authorization.

## Recommended production baseline

- Use Firebase Authentication
- Use custom claims or backend role checks for admin access
- Restrict writes with Realtime Database rules
- Remove `localStorage` as the only trust source for access control
- Log and alert suspicious activity

## Validation status

Static project checks show no editor-reported errors, but full runtime validation is currently blocked because Node/npm are not installed in this environment.
