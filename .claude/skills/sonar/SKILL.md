---
name: sonar
description: Fetch and display the SonarCloud analysis report for this project (quality gate + open issues by severity).
allowed-tools: Bash
metadata:
  version: "1.0"
---

# Sonar

Fetch and display the SonarCloud analysis report for this project.

## Project config (from `.env` — SonarCloud not set up yet for this project)

- Project key: `$SONAR_PROJECT_KEY` (e.g. `europe-map`)
- Organization: `$SONAR_ORG`
- API base: `https://sonarcloud.io`

> No SonarCloud project exists for `europe-map` yet. Configure it first (create the project on
> SonarCloud, then add `SONAR_TOKEN`, `SONAR_PROJECT_KEY`, `SONAR_ORG` to `.env`) before using this skill.

## Steps

1. Extract config from `.env` — never print the token:

   ```bash
   grep -E "^SONAR_(TOKEN|PROJECT_KEY|ORG)=" .env
   ```

   If `SONAR_TOKEN` is empty → tell the user to add the three vars to `.env` and stop.

2. Fetch quality gate status:

   ```bash
   TOKEN="$(grep -E '^SONAR_TOKEN=' .env | cut -d= -f2-)"
   KEY="$(grep -E '^SONAR_PROJECT_KEY=' .env | cut -d= -f2-)"
   curl -s -u "$TOKEN:" \
     "https://sonarcloud.io/api/qualitygates/project_status?projectKey=$KEY"
   ```

3. Fetch all open issues (sorted by severity, up to 500):
   ```bash
   ORG="$(grep -E '^SONAR_ORG=' .env | cut -d= -f2-)"
   curl -s -u "$TOKEN:" \
     "https://sonarcloud.io/api/issues/search?projectKeys=$KEY&organization=$ORG&ps=500&resolved=false&s=SEVERITY&asc=false"
   ```

## Display format

### Quality Gate

`✅ PASSED` or `❌ FAILED` — list each failing condition with actual vs threshold.

### Issues by severity

Group issues in this order:

- 🔴 BLOCKER
- 🔴 CRITICAL
- 🟠 MAJOR
- 🟡 MINOR
- ⚪ INFO

For each issue: `file:line — message (rule)`
Strip the `<project-key>:` prefix from component names for readability.

### Summary table

| Severity    | Count |
| ----------- | ----- |
| 🔴 Blocker  | N     |
| 🔴 Critical | N     |
| 🟠 Major    | N     |
| 🟡 Minor    | N     |
| ⚪ Info     | N     |
| **Total**   | **N** |

## Error handling

- 401 → token invalid or expired
- 404 → project key not found
- Empty issues → "No open issues — quality gate is happy 🎉"
