// Pure logic for Numble Jumble — no DOM access, unit-testable.
// Exposed on window.NJ (browser) and module.exports (node tests).
(function (root) {
  'use strict';

  var QUIZ_SIZE = 20;
  var QUESTION_SECONDS = 30;
  var STORAGE_KEY = 'numbleJumble.results';

  // Fisher-Yates shuffle. Returns a new array; does not mutate input.
  // rnd is an optional () => [0,1) for deterministic testing.
  function shuffle(arr, rnd) {
    rnd = rnd || Math.random;
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  // Pick up to QUIZ_SIZE unique items from pool.
  function sampleWords(pool, size, rnd) {
    size = size == null ? QUIZ_SIZE : size;
    return shuffle(pool, rnd).slice(0, Math.min(size, pool.length));
  }

  // Levenshtein edit distance between two strings.
  function levenshtein(a, b) {
    a = a || '';
    b = b || '';
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var prev = [];
    for (var j = 0; j <= b.length; j++) prev[j] = j;
    for (var i = 1; i <= a.length; i++) {
      var cur = [i];
      for (var k = 1; k <= b.length; k++) {
        var cost = a.charAt(i - 1) === b.charAt(k - 1) ? 0 : 1;
        cur[k] = Math.min(cur[k - 1] + 1, prev[k] + 1, prev[k - 1] + cost);
      }
      prev = cur;
    }
    return prev[b.length];
  }

  // Normalize an answer for comparison.
  function normalize(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  // Lenient correctness check: exact after normalizing, or within an
  // edit-distance threshold that scales with word length.
  function checkAnswer(typed, correct) {
    var t = normalize(typed);
    var c = normalize(correct);
    if (!t) return false;
    if (t === c) return true;
    var threshold = c.length <= 5 ? 1 : 2;
    return levenshtein(t, c) <= threshold;
  }

  // --- Local storage of results ---

  function loadResults(storage) {
    storage = storage || root.localStorage;
    try {
      var raw = storage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveResult(result, storage) {
    storage = storage || root.localStorage;
    var all = loadResults(storage);
    all.push(result);
    storage.setItem(STORAGE_KEY, JSON.stringify(all));
    return all;
  }

  function clearResults(storage) {
    storage = storage || root.localStorage;
    storage.removeItem(STORAGE_KEY);
  }

  // Map results to {x, y, pct, date} points for the graph, in a box of
  // width x height with the given padding. Returns [] if no results.
  function graphPoints(results, width, height, pad) {
    pad = pad == null ? 40 : pad;
    var n = results.length;
    if (n === 0) return [];
    var innerW = width - pad * 2;
    var innerH = height - pad * 2;
    return results.map(function (r, i) {
      var pct = r.total ? (r.score / r.total) * 100 : 0;
      var x = n === 1 ? pad + innerW / 2 : pad + (innerW * i) / (n - 1);
      var y = pad + innerH * (1 - pct / 100);
      return { x: x, y: y, pct: pct, date: r.date };
    });
  }

  var api = {
    QUIZ_SIZE: QUIZ_SIZE,
    QUESTION_SECONDS: QUESTION_SECONDS,
    STORAGE_KEY: STORAGE_KEY,
    shuffle: shuffle,
    sampleWords: sampleWords,
    levenshtein: levenshtein,
    normalize: normalize,
    checkAnswer: checkAnswer,
    loadResults: loadResults,
    saveResult: saveResult,
    clearResults: clearResults,
    graphPoints: graphPoints
  };

  root.NJ = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
