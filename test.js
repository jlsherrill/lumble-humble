// Node test runner for Numble Jumble pure logic. Run: node test.js
var NJ = require('./logic.js');

var passed = 0, failed = 0;
function eq(a, b, msg) {
  var ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) { passed++; }
  else { failed++; console.error('FAIL: ' + msg + '\n  got: ' + JSON.stringify(a) + '\n  exp: ' + JSON.stringify(b)); }
}
function ok(cond, msg) { if (cond) passed++; else { failed++; console.error('FAIL: ' + msg); } }

// --- shuffle ---
var seq = [0.9, 0.9, 0.9, 0.9]; var si = 0;
var rnd = function () { return seq[si++ % seq.length]; };
var sh = NJ.shuffle([1, 2, 3, 4], rnd);
eq(sh.length, 4, 'shuffle keeps length');
eq(sh.slice().sort(), [1, 2, 3, 4], 'shuffle keeps elements');
var orig = [1, 2, 3]; NJ.shuffle(orig); eq(orig, [1, 2, 3], 'shuffle does not mutate');

// --- sampleWords ---
var pool = []; for (var i = 0; i < 50; i++) pool.push(i);
eq(NJ.sampleWords(pool).length, 20, 'sample default 20');
eq(NJ.sampleWords([1, 2, 3]).length, 3, 'sample caps at pool size');
var s = NJ.sampleWords(pool); var uniq = {}; s.forEach(function (x) { uniq[x] = 1; });
eq(Object.keys(uniq).length, s.length, 'sample has no repeats');

// --- levenshtein ---
eq(NJ.levenshtein('abc', 'abc'), 0, 'lev equal');
eq(NJ.levenshtein('abc', 'abd'), 1, 'lev one sub');
eq(NJ.levenshtein('abc', 'ab'), 1, 'lev one del');
eq(NJ.levenshtein('', 'abc'), 3, 'lev empty');
eq(NJ.levenshtein('kitten', 'sitting'), 3, 'lev classic');

// --- normalize ---
eq(NJ.normalize('  Carbon   Dioxide '), 'carbon dioxide', 'normalize');

// --- checkAnswer (lenient) ---
ok(NJ.checkAnswer('Carnivore', 'carnivore'), 'case-insensitive');
ok(NJ.checkAnswer('  biome ', 'biome'), 'trims');
ok(NJ.checkAnswer('carnivor', 'carnivore'), 'one typo long word');
ok(NJ.checkAnswer('photosynthosis', 'photosynthesis'), 'typo long word');
ok(!NJ.checkAnswer('', 'biome'), 'empty is wrong');
ok(!NJ.checkAnswer('xyz', 'biome'), 'far off is wrong');
ok(!NJ.checkAnswer('cat', 'dog'), 'short word too different');
ok(NJ.checkAnswer('cats', 'cat'), 'short word one edit ok');

// --- storage (fake localStorage) ---
function fakeStorage() {
  var m = {};
  return {
    getItem: function (k) { return k in m ? m[k] : null; },
    setItem: function (k, v) { m[k] = String(v); },
    removeItem: function (k) { delete m[k]; }
  };
}
var st = fakeStorage();
eq(NJ.loadResults(st), [], 'empty results');
NJ.saveResult({ date: '2026-01-01', mode: 'random', category: null, score: 15, total: 20 }, st);
NJ.saveResult({ date: '2026-01-02', mode: 'category', category: 'Math', score: 18, total: 20 }, st);
eq(NJ.loadResults(st).length, 2, 'saved two results');
eq(NJ.loadResults(st)[1].score, 18, 'result persisted');
NJ.clearResults(st);
eq(NJ.loadResults(st), [], 'cleared');
st.setItem(NJ.STORAGE_KEY, 'not json');
eq(NJ.loadResults(st), [], 'corrupt storage returns []');

// --- graphPoints ---
eq(NJ.graphPoints([], 400, 200), [], 'graph empty');
var gp1 = NJ.graphPoints([{ date: 'd', score: 10, total: 20 }], 400, 200, 40);
eq(gp1.length, 1, 'graph one point');
eq(gp1[0].x, 200, 'single point centered x');
eq(gp1[0].pct, 50, 'pct computed');
var gp2 = NJ.graphPoints([
  { date: 'a', score: 0, total: 20 },
  { date: 'b', score: 20, total: 20 }
], 420, 220, 40);
eq(gp2[0].x, 40, 'first point at left pad');
eq(gp2[1].x, 380, 'last point at right edge');
eq(gp2[0].y, 180, '0% at bottom');
eq(gp2[1].y, 40, '100% at top');

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
