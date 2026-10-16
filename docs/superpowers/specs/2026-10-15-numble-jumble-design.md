# Numble Jumble — Design Spec

Date: 2026-10-15

## Purpose

A browser-based quiz app to help students learn word definitions. The
student is shown a **definition** and must type the matching **word**
within a 30-second timer. Supports a random quiz across all categories
and practice of a single chosen category. Results are saved locally and
visualized as a line graph of performance over time.

## Scope / Success Criteria

- Two modes: **Random Quiz** (20 words across all categories) and
  **Practice by Category** (20 words from one category, or all available
  if the category has fewer than 20 — e.g. Force and Motion = 19).
- One question at a time: definition shown, input box, visible 30s
  countdown, progress indicator ("Question N of M").
- Lenient answer checking (case-insensitive, trimmed, minor-typo
  tolerant via Levenshtein).
- On timeout: mark wrong, reveal correct word briefly, then advance.
- Results screen: score out of total + review of missed questions
  (definition, typed answer, correct word).
- Progress screen: SVG line graph of score % over time from local
  storage; "Clear history" control.
- No build step, no runtime framework dependencies.

## Tech Stack

Vanilla HTML/CSS/JS. Runs via a static server (`python3 -m http.server`)
so `fetch('words.json')` works. Line graph drawn with inline SVG (no
charting library).

## Data

`words.json` — array of `{ word, definition, category }`. 190 words, 6
categories. Loaded once on startup and grouped by category.

Quiz sampling: Fisher-Yates shuffle, take `min(20, available)`, no
repeats within a quiz.

## Screens (single-page, JS show/hide)

1. **Home** — Random Quiz button; Practice by Category (category picker);
   View Progress button.
2. **Quiz** — definition, input, 30s countdown (visible, animated),
   progress ("Question N of M"), submit (Enter). Timeout → wrong +
   reveal + advance.
3. **Results** — score/total, review list of misses, buttons to retry /
   home / view progress.
4. **Progress** — SVG line graph of score % per attempt over time;
   Clear history.

## Answer Matching

Normalize: lowercase, trim, collapse internal whitespace. Exact match
passes. Otherwise Levenshtein distance threshold: ≤1 for words of length
≤5, ≤2 for longer. Passes as correct within threshold.

## Local Storage

Key `numbleJumble.results`: array of
`{ date: ISO, mode: "random"|"category", category: string|null, score, total }`.
Appended after each completed quiz. Graph plots score % vs date.

## File Structure

```
index.html   — all screens
styles.css   — layout, responsive, timer animation
app.js       — state machine, quiz logic, timer, storage, SVG graph
words.json   — data (unchanged)
serve.sh     — launch helper
test.html    — browser test harness for pure functions
```

## Testing

Pure functions (`shuffle`, `sampleWords`, `checkAnswer`, `levenshtein`,
storage read/write, graph point calc) extracted and unit-tested in
`test.html` independent of the UI.
