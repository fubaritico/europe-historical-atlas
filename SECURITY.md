# Security policy

## Reporting a vulnerability

**Please do not open a public issue.** Report it privately through GitHub instead:
[Report a vulnerability](https://github.com/fubaritico/europe-historical-atlas/security/advisories/new) (the
_Security_ tab of this repository, then _Report a vulnerability_).

Please include what you found, where (a URL, a file and line), how to reproduce it, and what it lets an attacker do.
Only the maintainer sees the report. It stays private while it is being fixed, and it is published, with credit to
you if you wish, once the fix is live.

## What is in scope

- **The published atlas** — https://europe-historical-atlas.netlify.app, and the code under `packages/` that builds
  it.
- **This repository** — anything committed that should not be: a secret, a personal datum, a file whose licence
  forbids redistribution.

The contribution system (`packages/cms`) is not online yet; a flaw in it is still worth reporting the same way.

## What is out of scope

- Vulnerabilities in dependencies that are already public advisories, unless this project uses the affected code in a
  way that is exploitable.
- Reports from automated scanners with no demonstrated impact.
