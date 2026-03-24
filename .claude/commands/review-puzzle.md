Review a Harmonies puzzle for quality and factual accuracy.

Input — either a date (MM/DD/YYYY) to look up from gameboards.json, or raw JSON: $ARGUMENTS

---

If a date was provided, read src/lib/data/gameboards.json and find that date's puzzle. If JSON was provided directly, use it as-is.

Harmonies is a daily music/culture trivia puzzle game (like NYT Connections). Players see 16 items and must group them into 4 categories of 4 items each.

DIFFICULTY COLORS:
- EASY (#CBff70 green): Casual music fans
- SOMEWHAT EASY (#FAA3FF pink): Some music knowledge
- MODERATE (#78DAF9 blue): Solid knowledge / specific fanbase
- HARD (#FFBC21 yellow): Deep/niche knowledge

Review the puzzle on these dimensions:

**1. FACT CHECK**
Go through every item in every category. Is each item verifiably a correct member of its category? Flag anything wrong or uncertain.

**2. AMBIGUITY CHECK**
Could any item plausibly fit a different category? List any that could cause player confusion and explain why.

**3. DIFFICULTY CALIBRATION**
- Is easy actually easy for a casual fan?
- Does difficulty increase meaningfully across the four colors?
- Flag any category that seems mislabeled.

**4. GENRE/ERA DIVERSITY**
Are the 4 categories spanning different genres and eras, or is the puzzle too narrowly focused?

**5. QUALITY**
- Are the category connections clever and satisfying?
- Any items that feel weak, too obscure, or replaceable?
- Would this be a fun, fair puzzle to play?

**6. VERDICT**
One of:
- ✅ Publish as-is
- 🟡 Publish with minor fixes (list them)
- 🔴 Needs significant rework (explain what)

Be honest and specific. The goal is to catch problems before the puzzle goes live.
