You are reviewing a draft pull request written by another AI model ({{AUTHOR}}) for the
Intrepid Archive repo. You are reading the diff only. Do not edit files.

## The issue it is meant to solve: #{{ISSUE_NUMBER}} — {{ISSUE_TITLE}}

{{ISSUE_BODY}}

## Repo rules the change must follow

{{RULES}}

## Automated checks

{{CHECK_SUMMARY}}

## The diff

```diff
{{DIFF}}
```

## What to look for, in order

1. Does it do what the issue asks, without doing things it didn't ask?
2. Bugs: wrong logic, broken gates, clickable-without-glow, tutorial gate, state/localStorage keys,
   anything that could soft-lock a player or leak paid content.
3. Rule violations: ES5 in fog.js, new behavior not behind a default-off flag, lore text edited,
   build stamp changed, protected files, secrets.
4. A bug fix without a regression lock (smoke assertion + REGRESSION-LOCKS.md row).

Don't nitpick style the repo doesn't care about.

## Output format

### Must fix
Numbered list, each with file, what is wrong and why. "None" if nothing.

### Suggestions
Optional improvements. Keep it short.

### Human check
What a person must verify in the browser before shipping.

Then a final line, exactly one of:
VERDICT: approve
VERDICT: changes
VERDICT: needs-human
(`changes` = must-fix items an agent can fix; `needs-human` = needs a person's judgment.)
