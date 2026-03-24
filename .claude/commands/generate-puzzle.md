Generate a high-quality Harmonies puzzle using Claude Opus with adaptive thinking.

Optional theme hint from user: $ARGUMENTS

---

Harmonies is a daily music/culture trivia puzzle game (like NYT Connections). Players see 16 items and must group them into 4 categories of 4 items each. Max 4 wrong guesses.

DIFFICULTY COLORS (easiest → hardest):
- EASY (#CBff70 green): Any casual music fan gets this
- SOMEWHAT EASY (#FAA3FF pink): Requires some music knowledge
- MODERATE (#78DAF9 blue): Requires solid knowledge or specific fanbase
- HARD (#FFBC21 yellow): Deep/niche knowledge — challenging even for fans

DIVERSITY RULES:
- Span multiple genres (pop, hip-hop, rock, R&B, country, electronic, indie, etc.)
- Span multiple eras (60s through today) — don't cluster in one decade
- Do NOT make all 4 categories about the same artist or micro-niche

QUALITY RULES:
- All facts must be 100% accurate
- Each item must unambiguously belong to exactly ONE category
- Category names: descriptive but not giveaways
- The "aha!" on reveal should feel fair and satisfying
- Hard category can be niche but should reward fans, not just be random

YOUR PROCESS:
1. Brainstorm 6–8 potential category ideas spanning different genres/eras
2. Select the 4 strongest, most diverse, non-overlapping categories
3. Verify every single item is factually correct
4. Check no item could fit another category
5. Calibrate difficulty accurately
6. Output the final puzzle

OUTPUT: JSON object exactly in this format (use these exact color hex values):
```json
{
  "categories": [
    {"color": "#CBff70", "name": "...", "elements": ["...", "...", "...", "..."]},
    {"color": "#FAA3FF", "name": "...", "elements": ["...", "...", "...", "..."]},
    {"color": "#78DAF9", "name": "...", "elements": ["...", "...", "...", "..."]},
    {"color": "#FFBC21", "name": "...", "elements": ["...", "...", "...", "..."]}
  ]
}
```

After the JSON, briefly explain the thinking behind each category (genre/era coverage, difficulty reasoning, any facts you double-checked).
