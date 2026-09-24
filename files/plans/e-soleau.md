# e-Soleau — dating the design corpus

> Plan step **P0**. Written 2026-09-24, the evening the atlas went public at
> <https://europe-historical-atlas.netlify.app>. **Not legal advice** — confirm with the INPI.

## What it is, and what it is not

The e-Soleau gives a **date certaine**: proof that a given content existed, in your hands, on a given
day. It is evidence of anteriority, usable in a dispute.

**It confers no right whatsoever.** It is not a patent, not a trademark, not a registration. And the
thing you most want to protect — _the idea_ — is protectable by nothing, by anyone, anywhere. What the
deposit actually dates is the **expression**: the documents, the decisions, the screens, the scenarios.

That is still worth €15, for one reason: the application is now public, so the concept is visible. The
corpus that shows _how it was designed_ is not, and it is the part with no equivalent we have found.

## What to deposit

**`files/plans/` — 80 files, 7.5 MB.** Everything under it, including `cartographer/design/`.

|                                                                          |                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| the plan of record, the inventory, the roadmap chapters                  | the decisions, with their rejected alternatives              |
| `cartographer/scenarii/` — 12 Gherkin files + the index + `s99-holes.md` | the behaviour, gesture by gesture, and the 26 holes it found |
| `cartographer/format.md`, `groundwork.md`, `ui-inventory.md`             | the file format and the measured pipeline                    |
| `cartographer/design/` — 7.1 MB                                          | the screens, the chrome, the ten cursors                     |
| `glossaire.md`                                                           | the vocabulary                                               |

**Well under the 50 MB ceiling**, so the simple mode applies — see below.

Deliberately **not** deposited: `files/resources/` (proprietary Euratlas), `files/spikes/*/out/`
(GPL-3.0 payloads). Neither is ours to date.

## The two modes, and which one to take

|               | how it works                                                   | for us                                                                                                                                             |
| ------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **fichier**   | the INPI keeps your file and acts as trusted third party       | **take this one.** 7.5 MB against a 50 MB allowance, and nothing to preserve on your side                                                          |
| **empreinte** | you deposit a SHA-256 only; you keep the original, bit for bit | for large archives. Cheaper on storage, but you carry the burden of an unchanged original — one reformatting and the fingerprint no longer matches |

Same base price either way.

## Price

**€15 up to 50 MB**, then €10 per additional 50 MB, **for five years**. Renewable up to twenty
(≈ €60 total over that span). Renewal must happen **during** the current period — once it lapses, it
cannot be extended.

## Steps

1. **Make the archive.** From the repository root:

   ```bash
   zip -r ~/Desktop/europe-historical-atlas-plans-$(date +%Y%m%d).zip files/plans
   ```

2. **Authenticate** on the INPI e-procedures portal (an account is needed; it is free).
3. From the dashboard, column **« Autres »** → **« Portail Soleau (e-Soleau et entiercement) »** →
   **« Déposer une e-Soleau »**.
4. Choose the **fichier** mode, upload the zip, name the deposit plainly:
   `europe-historical-atlas — corpus de conception`.
5. Pay, and **keep the receipt**: it carries the date and the reference.
6. **Write that date and reference into `files/plans/plan.md` (P0)**, so the next session knows it is
   done and when.

> Paper Soleau envelopes were abolished on **1 April 2024**. Everything goes through the portal.

## What this does not cover, and is worth knowing

- **The code is already protected**, automatically and for free, by copyright — no deposit needed. What
  a deposit adds is the _date_, which matters here because the design corpus is undated outside git, and
  git history is self-generated evidence.
- **The name** would need a trademark (INPI, per class) — only worth it for commercial use. Otherwise it
  is money for nothing.
- **A patent is out of reach**: software "as such" is excluded in Europe unless it produces a technical
  effect, which is not this.

## Worth doing alongside, and free

Search for prior art — interactive 3D historical atlases with dated borders and their own contribution
tooling. Not to protect anything, but because **knowing what exists is what makes the claim of novelty
honest**. Offered, not yet run.
