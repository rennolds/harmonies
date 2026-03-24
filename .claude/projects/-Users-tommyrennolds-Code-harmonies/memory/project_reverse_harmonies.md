---
name: Reverse Harmonies feature
description: New weekly puzzle type where categories are visible and users assign items to them
type: project
---

Added "Reverse Harmonies" puzzle type (March 2026).

**Schema:** Add `"type": "reverse"` to any puzzle entry in `gameboards.json`. All other fields (categories, playlist, gameoverGif, etc.) are the same.

**Test puzzle:** `03/21/2026` in gameboards.json.

**New file:** `src/routes/ReverseHarmonies.svelte` — self-contained component with category strips + item grid. No submit button; auto-checks when all 16 items assigned. Correct categories lock with color, wrong items shake and unassign.

**Key page.svelte additions:**
- `isReversePuzzle = board.type === "reverse"` at line ~140
- `handleReverseStats`, `handleReverseArchiveStats`, `handleReverseComplete` functions
- Mistakes bar and play buttons hidden for reverse puzzles
- Share result simplified (no emoji grid) for reverse puzzles

**Why:** No fail state — every player who finishes wins. Counts toward streak same as regular. Designed to appear any day of the week (no fixed schedule yet).
