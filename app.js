// Numble Jumble — UI controller. Depends on logic.js (window.NJ).
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var RING = 2 * Math.PI * 20; // circumference of timer ring (r=20)

  var state = {
    words: [],
    byCategory: {},
    quiz: [],       // array of word objects for current quiz
    index: 0,
    answers: [],    // { word, definition, typed, correct, timedOut }
    mode: 'random',
    category: null,
    difficulty: 'medium', // 'easy' | 'medium' | 'hard'
    timerId: null,
    remaining: 0,
    locked: false
  };

  // ---- Screen routing ----
  function show(name) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
    $('screen-' + name).classList.add('active');
  }

  // ---- Data load ----
  function loadWords() {
    return fetch('words.json').then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function groupByCategory(words) {
    var map = {};
    words.forEach(function (w) {
      (map[w.category] = map[w.category] || []).push(w);
    });
    return map;
  }

  function populateCategories() {
    var sel = $('categorySelect');
    sel.innerHTML = '';
    Object.keys(state.byCategory).sort().forEach(function (cat) {
      var opt = document.createElement('option');
      var count = state.byCategory[cat].length;
      opt.value = cat;
      opt.textContent = cat + ' (' + count + ' words)';
      sel.appendChild(opt);
    });
  }

  // ---- Quiz lifecycle ----
  function startQuiz(mode, category) {
    state.mode = mode;
    state.category = category || null;
    var pool = mode === 'category' ? state.byCategory[category] : state.words;
    state.quiz = NJ.sampleWords(pool);
    state.index = 0;
    state.answers = [];
    show('quiz');
    applyDifficultyLayout();
    renderWordBank();
    renderQuestion();
  }

  // Show/hide the word bank and input per difficulty:
  //  easy   -> word bank visible & clickable, no typing
  //  medium -> word bank visible (reference), type the answer
  //  hard   -> no word bank, type the answer from memory
  function applyDifficultyLayout() {
    var easy = state.difficulty === 'easy';
    var hard = state.difficulty === 'hard';
    $('wordBankSection').hidden = hard;
    $('wordBankLabel').textContent = easy ? 'Tap the correct word' : 'Word Bank';
    $('answerForm').hidden = easy;
    $('wordBank').classList.toggle('clickable', easy);
  }

  // Build the word bank in a shuffled order (so it does not reveal the
  // question sequence). In easy mode each pill answers the question on tap.
  function renderWordBank() {
    var bank = $('wordBank');
    bank.innerHTML = '';
    if (state.difficulty === 'hard') return;
    var easy = state.difficulty === 'easy';
    NJ.shuffle(state.quiz).forEach(function (w) {
      var li = document.createElement('li');
      li.textContent = w.word;
      li.dataset.word = w.word;
      if (easy) {
        li.setAttribute('role', 'button');
        li.tabIndex = 0;
        li.addEventListener('click', function () { submitAnswer(w.word); });
        li.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); submitAnswer(w.word); }
        });
      }
      bank.appendChild(li);
    });
  }

  function renderQuestion() {
    state.locked = false;
    var q = state.quiz[state.index];
    $('progressLabel').textContent =
      'Question ' + (state.index + 1) + ' of ' + state.quiz.length;
    $('definition').textContent = q.definition;
    $('feedback').textContent = '';
    $('feedback').className = 'feedback';
    var input = $('answerInput');
    input.value = '';
    input.disabled = false;
    $('submitBtn').disabled = false;
    if (state.difficulty !== 'easy') input.focus();
    startTimer();
  }

  function startTimer() {
    clearInterval(state.timerId);
    state.remaining = NJ.QUESTION_SECONDS;
    updateTimerUI();
    state.timerId = setInterval(function () {
      state.remaining--;
      updateTimerUI();
      if (state.remaining <= 0) {
        clearInterval(state.timerId);
        handleTimeout();
      }
    }, 1000);
  }

  function updateTimerUI() {
    $('timerText').textContent = state.remaining;
    var ring = $('timerProgress');
    var frac = state.remaining / NJ.QUESTION_SECONDS;
    ring.style.strokeDashoffset = RING * (1 - frac);
    ring.classList.toggle('low', state.remaining <= 10 && state.remaining > 5);
    ring.classList.toggle('critical', state.remaining <= 5);
  }

  function recordAnswer(typed, correct, timedOut) {
    var q = state.quiz[state.index];
    state.answers.push({
      word: q.word,
      definition: q.definition,
      typed: typed,
      correct: correct,
      timedOut: timedOut
    });
  }

  function submitAnswer(typed) {
    if (state.locked) return;
    state.locked = true;
    clearInterval(state.timerId);
    var q = state.quiz[state.index];
    var correct = NJ.checkAnswer(typed, q.word);
    recordAnswer(typed, correct, false);
    $('answerInput').disabled = true;
    $('submitBtn').disabled = true;
    var fb = $('feedback');
    if (correct) {
      fb.textContent = '✓ Correct!';
      fb.className = 'feedback correct';
    } else {
      fb.textContent = '✗ Correct answer: ' + q.word;
      fb.className = 'feedback wrong';
    }
    setTimeout(advance, 1200);
  }

  function handleTimeout() {
    if (state.locked) return;
    state.locked = true;
    var q = state.quiz[state.index];
    recordAnswer('', false, true);
    $('answerInput').disabled = true;
    $('submitBtn').disabled = true;
    var fb = $('feedback');
    fb.textContent = "⏱ Time's up! Correct answer: " + q.word;
    fb.className = 'feedback wrong';
    setTimeout(advance, 1800);
  }

  function advance() {
    state.index++;
    if (state.index >= state.quiz.length) finishQuiz();
    else renderQuestion();
  }

  function finishQuiz() {
    clearInterval(state.timerId);
    var score = state.answers.filter(function (a) { return a.correct; }).length;
    var total = state.quiz.length;
    NJ.saveResult({
      date: new Date().toISOString(),
      mode: state.mode,
      category: state.category,
      score: score,
      total: total
    });
    renderResults(score, total);
    show('results');
  }

  // ---- Results ----
  function renderResults(score, total) {
    $('scoreText').textContent = score + ' / ' + total;
    var pct = total ? Math.round((score / total) * 100) : 0;
    var label = state.mode === 'category' ? state.category : 'All categories';
    $('scoreSub').textContent = pct + '% — ' + label;

    var review = $('review');
    review.innerHTML = '';
    var misses = state.answers.filter(function (a) { return !a.correct; });
    if (misses.length === 0) {
      var p = document.createElement('p');
      p.className = 'review-perfect';
      p.textContent = '🎉 Perfect score! Nothing to review.';
      review.appendChild(p);
      return;
    }
    var heading = document.createElement('h3');
    heading.textContent = 'Review (' + misses.length + ' missed)';
    review.appendChild(heading);

    misses.forEach(function (a) {
      var item = document.createElement('div');
      item.className = 'review-item';
      var def = document.createElement('p');
      def.className = 'def';
      def.textContent = a.definition;
      item.appendChild(def);

      var yours = document.createElement('p');
      yours.className = 'row you';
      yours.textContent = a.timedOut
        ? 'You: (ran out of time)'
        : 'You: ' + (a.typed || '(blank)');
      item.appendChild(yours);

      var ans = document.createElement('p');
      ans.className = 'row ans';
      ans.textContent = 'Answer: ' + a.word;
      item.appendChild(ans);

      review.appendChild(item);
    });
  }

  // ---- Progress graph (inline SVG) ----
  function renderProgress() {
    var results = NJ.loadResults();
    var wrap = $('graphWrap');
    var empty = $('graphEmpty');
    wrap.innerHTML = '';
    if (results.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    var W = 560, H = 300, pad = 46;
    var pts = NJ.graphPoints(results, W, H, pad);
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Line graph of quiz scores over time');

    function el(name, attrs, text) {
      var e = document.createElementNS(svgNS, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      if (text != null) e.textContent = text;
      return e;
    }

    // Y gridlines + labels at 0,25,50,75,100%
    [0, 25, 50, 75, 100].forEach(function (p) {
      var y = pad + (H - pad * 2) * (1 - p / 100);
      svg.appendChild(el('line', { x1: pad, y1: y, x2: W - pad, y2: y, class: 'grid-line' }));
      svg.appendChild(el('text', { x: pad - 8, y: y + 4, 'text-anchor': 'end', class: 'axis-text' }, p + '%'));
    });

    // Axes
    svg.appendChild(el('line', { x1: pad, y1: pad, x2: pad, y2: H - pad, class: 'axis-line' }));
    svg.appendChild(el('line', { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, class: 'axis-line' }));

    // Line path
    if (pts.length > 1) {
      var d = pts.map(function (pt, i) {
        return (i === 0 ? 'M' : 'L') + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1);
      }).join(' ');
      svg.appendChild(el('path', { d: d, class: 'data-line' }));
    }

    // Points + x labels (show first, last, and sparse middle labels)
    var n = pts.length;
    pts.forEach(function (pt, i) {
      svg.appendChild(el('circle', { cx: pt.x, cy: pt.y, r: 4.5, class: 'data-point' }));
      var showLabel = i === 0 || i === n - 1 || (n <= 6);
      if (showLabel) {
        var dt = new Date(pt.date);
        var lbl = isNaN(dt) ? '' : (dt.getMonth() + 1) + '/' + dt.getDate();
        svg.appendChild(el('text', {
          x: pt.x, y: H - pad + 18, 'text-anchor': 'middle', class: 'axis-text'
        }, lbl));
      }
    });

    wrap.appendChild(svg);
  }

  // ---- Wiring ----
  function wire() {
    $('difficulty').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-diff]');
      if (btn) setDifficulty(btn.dataset.diff);
    });
    $('btnRandom').addEventListener('click', function () { startQuiz('random'); });
    $('btnCategory').addEventListener('click', function () {
      startQuiz('category', $('categorySelect').value);
    });
    $('btnProgress').addEventListener('click', function () { renderProgress(); show('progress'); });
    $('homeLink').addEventListener('click', function () { goHome(); });

    $('answerForm').addEventListener('submit', function (e) {
      e.preventDefault();
      submitAnswer($('answerInput').value);
    });

    $('btnRetry').addEventListener('click', function () {
      startQuiz(state.mode, state.category);
    });
    $('btnResultsProgress').addEventListener('click', function () { renderProgress(); show('progress'); });
    $('btnResultsHome').addEventListener('click', goHome);
    $('btnProgressHome').addEventListener('click', goHome);
    $('btnClearHistory').addEventListener('click', function () {
      if (confirm('Clear all saved quiz history? This cannot be undone.')) {
        NJ.clearResults();
        renderProgress();
      }
    });
  }

  function goHome() {
    clearInterval(state.timerId);
    show('home');
  }

  // ---- Difficulty ----
  var DIFF_DESC = {
    easy: 'The words are shown — just tap the correct one.',
    medium: 'The words are shown — type the correct one.',
    hard: 'No word list — type the answer from memory.'
  };

  function setDifficulty(diff) {
    state.difficulty = diff;
    var btns = $('difficulty').querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('selected', btns[i].dataset.diff === diff);
    }
    $('diffDesc').textContent = DIFF_DESC[diff];
  }

  // ---- Theme (dark mode) ----
  var THEME_KEY = 'numbleJumble.theme';

  function systemPrefersDark() {
    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // Effective dark state: explicit choice wins; otherwise the OS default.
  function isDark() {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return systemPrefersDark();
  }

  function applyTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    var root = document.documentElement;
    if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);
    else root.removeAttribute('data-theme'); // fall back to OS via media query
    $('themeToggle').textContent = isDark() ? '☀️' : '🌙';
  }

  function toggleTheme() {
    localStorage.setItem(THEME_KEY, isDark() ? 'light' : 'dark');
    applyTheme();
  }

  // ---- Random rhyming name (always "_umble _umble") ----
  function randomizeName() {
    var onsets = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P',
      'R', 'S', 'T', 'W', 'Bl', 'Br', 'Cr', 'Dr', 'Fl', 'Gr', 'Pl', 'Pr',
      'Sl', 'St', 'Tr'];
    function pick() { return onsets[Math.floor(Math.random() * onsets.length)]; }
    var a = pick(), b = pick();
    while (b === a) b = pick();          // keep the two words distinct
    var name = a + 'umble ' + b + 'umble';
    $('homeLink').innerHTML = (a + 'umble&nbsp;' + b + 'umble');
    document.title = name;
  }

  // ---- Init ----
  applyTheme();
  // Follow OS changes live while no explicit choice is saved.
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (!localStorage.getItem(THEME_KEY)) applyTheme();
    });
  }
  $('themeToggle').addEventListener('click', toggleTheme);
  setDifficulty(state.difficulty);
  randomizeName();
  wire();
  loadWords().then(function (words) {
    state.words = words;
    state.byCategory = groupByCategory(words);
    populateCategories();
  }).catch(function (err) {
    $('screen-home').querySelector('.card').innerHTML =
      '<h2>Could not load words</h2><p>' + err.message +
      '</p><p class="score-sub">Make sure you are running this through a local server ' +
      '(see serve.sh), not opening the file directly.</p>';
  });
})();
