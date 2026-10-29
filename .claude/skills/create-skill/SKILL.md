---
name: create-skill
description: Create a new agent skill following the agentskills.io specification. Use when creating a skill, adding a new skill, scaffolding a skill, or when the user says they want to automate a workflow as a skill.
allowed-tools: Read Write Bash(mkdir:*)
argument-hint: "[skill-name]"
metadata:
  author: europe-map
  version: "1.0"
---

# Create Skill

Create a new agent skill following the [Agent Skills specification](https://agentskills.io/specification).

## Arguments

`$ARGUMENTS` = skill-name (lowercase, hyphens only, e.g. `token-pipeline`, `expo-build`)

## Steps

### 1. Gather requirements

Ask the user:
- **What does this skill do?** (becomes the body instructions)
- **When should it trigger?** (becomes the `description` field)
- **What tools does it need?** (becomes `allowed-tools`)
- **Should Claude auto-invoke it?** (if no, set `disable-model-invocation: true`)
- **Is it scoped to specific paths?** (becomes `paths`)

### 2. Create the skill directory

```
.claude/skills/$skill-name/
├── SKILL.md           # Required: metadata + instructions
├── references/        # Optional: detailed docs loaded on demand
├── scripts/           # Optional: executable scripts
└── assets/            # Optional: templates, schemas
```

### 3. Write SKILL.md with frontmatter

```markdown
---
name: $skill-name
description: [1-2 sentences: what it does AND when to use it. Include trigger keywords.]
allowed-tools: [space-separated tool list]
paths:
  - [glob patterns if scoped]
metadata:
  author: europe-map
  version: "1.0"
---

# [Skill Title]

[Core instructions — under 500 lines, under 5000 tokens]
```

### 4. Validate the skill

Check against the specification:

- [ ] `name` matches directory name
- [ ] `name` is lowercase, hyphens only, no consecutive hyphens, 1-64 chars
- [ ] `description` is non-empty, max 1024 chars, includes trigger keywords
- [ ] SKILL.md body states the outcome, the constraints with their reasons, and how to verify; numbered steps only where order matters
- [ ] Body is under 500 lines
- [ ] Reference files (if any) are linked with clear "when to load" conditions
- [ ] No secrets or credentials in the skill

## Specification Reference

### Frontmatter Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `name` | Yes | Lowercase, hyphens, 1-64 chars, matches directory name |
| `description` | Yes | What + when, max 1024 chars, keyword-rich for auto-triggering |
| `license` | No | License name |
| `compatibility` | No | Environment requirements, max 500 chars |
| `metadata` | No | Arbitrary key-value pairs |
| `allowed-tools` | No | Pre-approved tools (e.g. `Bash(git:*) Read Write`) |

### Claude Code Extensions (beyond agentskills.io spec)

| Field | Purpose |
|-------|---------|
| `disable-model-invocation` | `true` = only user can invoke via `/name` |
| `user-invocable` | `false` = only Claude auto-invokes, hidden from `/` menu |
| `paths` | Glob patterns limiting when skill auto-activates |
| `argument-hint` | Hint for CLI autocomplete (e.g. `[component-name]`) |
| `context` | `fork` to run in isolated subagent |
| `agent` | Subagent type when using `context: fork` |
| `model` | Override model for this skill |
| `effort` | Override effort level |

### Body Best Practices

1. **Add what the agent lacks, omit what it knows** — skip generic explanations
2. **Provide defaults, not menus** — pick one approach, mention alternatives briefly
3. **Include a Gotchas section** — environment-specific corrections the agent would get wrong
4. **Use validation loops** — do work, validate, fix, repeat
5. **Keep it under 500 lines** — move detailed reference to `references/` directory
6. **Link reference files conditionally** — "Read `references/api.md` if the API returns an error"

### Progressive Disclosure

```
Layer 1: name + description (~100 tokens) — loaded at startup for ALL skills
Layer 2: SKILL.md body (<5000 tokens) — loaded when skill activates
Layer 3: references/, scripts/, assets/ — loaded only when needed
```

### Description Writing Tips

Good: specific keywords, explains what AND when
```yaml
description: Create a pluggable three.js scene module in src/scene with an injected renderer/camera. Use when adding a scene module, a relief mesh, or a picking layer.
```

Bad: vague, no trigger keywords
```yaml
description: Helps with components.
```

## Gotchas

- Skill name MUST match the directory name exactly
- No uppercase letters in skill names
- No consecutive hyphens (`--`) in names
- Description is the primary mechanism for auto-triggering — invest time in keywords
- `allowed-tools` takes a space- or comma-separated string, or a YAML list
- Reference files use relative paths from skill directory root
- Test the skill by asking Claude a question that should trigger it
