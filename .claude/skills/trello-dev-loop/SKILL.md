---
name: trello-dev-loop
description: Use when the user wants to pull the top card from the Trello "To do" list on the Nehemias 2026 board and drive it through implementation to an open PR. Triggers on "start the work loop", "next Trello card", "work the kanban".
---

# Trello dev loop

Board: "Nehemias 2026" (`https://trello.com/b/WPYPqi4f/nehemias-2026`).
Lists: To do → In progress → Code review → Done.
Assignee: Sofia Bracho (`sofiabracho`).
Repo: `omarapp19/nehemias2026`, base branch `main`.

## Steps

1. **Pick card** — `trelloReadCard list_by_list` on the "To do" list; take the first (top-most position) open card.
2. **Assign** — no direct "assign member" write tool exists yet; if one appears, assign Sofia Bracho. Otherwise note assignee in a card comment/desc update.
3. **Move** — `trelloWriteCard move` the card into "In progress".
4. **Scope + implement** — invoke `superpowers:brainstorming` first if the card is a feature/ambiguous ask, then `superpowers:writing-plans` for anything multi-step, then `superpowers:test-driven-development` to implement. Use `superpowers:systematic-debugging` if anything breaks along the way.
5. **Verify** — `superpowers:verification-before-completion` before claiming done. Run the repo's test suite (check `package.json` scripts under the touched workspace, e.g. `apps/api`).
6. **Branch + commit** — create a new branch off latest `main`: `fix/<slug>` for bug/security cards, `feature/<slug>` for new capability cards. Commit only the tested changes.
7. **Push + PR** — push the branch, open a PR against `main` via `gh pr create`. Title references the Trello card name; body links the card URL.
   - Pause and show the diff/PR body to the user before pushing, unless the user has explicitly asked for fully autonomous mode for this session.
8. **Move to Code review** — `trelloWriteCard move` the card to "Code review" once the PR is open (not "Done" — a human reviews first).
9. **Next card** — start a new conversation/task for the next top "To do" card rather than continuing in the same context, so each card gets a clean session.

## Notes

- Always re-fetch list IDs via `trelloReadList list_by_board` if this skill is copied to a different board — IDs are board-specific.
- Don't skip TDD or verification to move faster — these cards include security-sensitive work (CSRF, JWT rotation, Sheets sync safety).
