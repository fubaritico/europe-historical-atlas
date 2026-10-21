---
name: sonar
description: Fetch and display the SonarCloud analysis report for this project (quality gate + open issues by severity). Use when the dev asks for the Sonar report, the quality gate or the Sonar issues.
allowed-tools: Bash
metadata:
  version: "1.0"
---

# Sonar

Fetch and display the SonarCloud analysis report for this project.

## Project config

- Project key and organisation: read from `sonar-project.properties` (`europe-historical-atlas` / `fubaritico`).
- Token: `SONAR_TOKEN` in `.env.local` (git-ignored) — never printed. Absent, the calls go out anonymously: they
  answer only if the SonarCloud project is public, and a 401/403 means the dev has to add a SonarCloud user token.
- API base: `https://sonarcloud.io`

## Steps

1. Read the config — never print the token:

   ```bash
   KEY="$(sed -n 's/^sonar.projectKey=//p' sonar-project.properties)"
   ORG="$(sed -n 's/^sonar.organization=//p' sonar-project.properties)"
   TOKEN="$(grep -E '^SONAR_TOKEN=' .env.local | cut -d= -f2-)"
   AUTH=(); [ -n "$TOKEN" ] && AUTH=(-u "$TOKEN:")
   ```

   Say whether the call is authenticated or anonymous.

2. Fetch quality gate status:

   ```bash
   curl -s "${AUTH[@]}" "https://sonarcloud.io/api/qualitygates/project_status?projectKey=$KEY"
   ```

3. Fetch all open issues (sorted by severity, up to 500):

   ```bash
   curl -s "${AUTH[@]}" \
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
