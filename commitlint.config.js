/**
 * The ticket a commit serves, at the end of its header (REPO-460, the dev, 2026-11-16: *« il faut que tu aies la
 * référence du ticket quand tu commites quelque chose »*): `[CARTO-457]`, several split by a comma, or `[no-ticket]`
 * written on purpose — seen in `git log --oneline` and on GitHub, where a line of the body is not.
 */
const TICKET_AT_END = /\[(?:[A-Z]+-\d+(?:, ?[A-Z]+-\d+)*|no-ticket)\]$/

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'header-ticket': ({ header }) => [
          TICKET_AT_END.test(header ?? ''),
          'end the header with its ticket — « [CARTO-457] », several split by a comma — or « [no-ticket] » on purpose',
        ],
      },
    },
  ],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'header-ticket': [2, 'always'],
  },
}
