You are continuing work on issue #{{ISSUE_NUMBER}} — {{ISSUE_TITLE}} on branch `{{BRANCH}}`.
Follow `AGENTS.md`.

Your previous changes are in the working tree, but the required checks failed:

```
{{CHECK_OUTPUT}}
```

Fix only what makes these checks fail, then run them again: {{CHECKS}}

If a failure isn't caused by your change (it would fail on `{{BASE}}` too), don't work around it:
say so under "Blocked". Do not weaken, skip or delete a check to make it pass.

End with the same report as before: Summary, Files changed, How to verify in the browser,
Risks / follow-ups, Blocked.
