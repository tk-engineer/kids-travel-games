(function () {
  'use strict';

  var D = window.GAME_DATA;
  var app = document.getElementById('app');
  var ROUND = 10;
  var SVGNS = 'http://www.w3.org/2000/svg';

  // ---------- ほぞん（使えない環境でも動く） ----------
  var store = {
    get: function (k, def) {
      try { var v = localStorage.getItem('sora-' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
    },
    set: function (k, v) { try { localStorage.setItem('sora-' + k, JSON.stringify(v)); } catch (e) {} },
  };

  // ---------- 小道具 ----------
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'onclick') el.addEventListener('click', attrs[k]);
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function s(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function between(a, b) { return a + rnd(b - a + 1); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a, n, not) {
    return shuffle(a.filter(function (x) { return not.indexOf(x) < 0; })).slice(0, n);
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function label(item) {
    return item.yomi ? '<ruby>' + esc(item.name) + '<rt>' + esc(item.yomi) + '</rt></ruby>' : esc(item.name);
  }

  // ---------- おと（さいしょは オフ） ----------
  var actx = null;
  // iPad は タッチの しゅんかんに おとを「おこして」おかないと ならないので、タッチの たびに じゅんびする
  function unlockAudio() {
    if (!store.get('sound', false)) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
    } catch (e) {}
  }
  document.addEventListener('touchend', unlockAudio, true);
  document.addEventListener('click', unlockAudio, true);
  function beep(ok) {
    if (!store.get('sound', false)) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      var notes = ok ? [660, 880] : [300, 220];
      notes.forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.frequency.value = f; o.type = 'triangle';
        g.gain.setValueAtTime(0.12, actx.currentTime + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + i * 0.12 + 0.2);
        o.connect(g); g.connect(actx.destination);
        o.start(actx.currentTime + i * 0.12); o.stop(actx.currentTime + i * 0.12 + 0.22);
      });
    } catch (e) {}
  }

  // ---------- けっかはっぴょうの おと（せいかいの かずで かわる） ----------
  function nf(name) { // 'C5' → しゅうはすう
    var m = /^([A-G])(#?)(\d)$/.exec(name);
    var semi = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12;
    return 440 * Math.pow(2, semi / 12);
  }
  function playTune(notes, bpm, vol) {
    // notes: [おと（'C5 E5 G5' で わおん、'-' で やすみ）, はく]
    if (!store.get('sound', false)) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      var beat = 60 / bpm, t0 = actx.currentTime + 0.05, at = 0;
      var master = actx.createGain(); master.gain.value = vol || 0.1;
      var lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
      master.connect(lp); lp.connect(actx.destination);
      notes.forEach(function (n) {
        var dur = n[1] * beat;
        if (n[0] !== '-') n[0].split(' ').forEach(function (nm) {
          ['sawtooth', 'triangle'].forEach(function (type, k) { // ラッパっぽい おと
            var o = actx.createOscillator(), g = actx.createGain();
            o.type = type; o.frequency.value = nf(nm);
            var st = t0 + at, len = Math.max(dur * 0.92, 0.08);
            g.gain.setValueAtTime(0.0001, st);
            g.gain.exponentialRampToValueAtTime(k ? 0.9 : 0.35, st + 0.02);
            g.gain.setValueAtTime(k ? 0.9 : 0.35, st + len * 0.7);
            g.gain.exponentialRampToValueAtTime(0.0001, st + len);
            o.connect(g); g.connect(master); o.start(st); o.stop(st + len + 0.02);
          });
        });
        at += dur;
      });
    } catch (e) {}
  }
  var TUNES = {
    // ぜんもん せいかい：ファンファーレ
    perfect: [['G4', 1 / 3], ['G4', 1 / 3], ['G4', 1 / 3], ['C5 E5', 1.5], ['-', 0.25], ['A#4 D5', 0.75], ['C5 E5', 0.5], ['-', 0.25],
      ['D5 F5', 0.5], ['C5 E5', 0.5], ['D5 F5', 0.5], ['E5 G5 C6', 2.5]],
    // 8わり いじょう：げんきな ジングル
    great: [['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 0.5], ['-', 0.25], ['G5', 0.5], ['C5 E5 C6', 1.75]],
    // はんぶん いじょう：ジャジャーン
    good: [['G4', 0.5], ['C5', 0.5], ['E5', 0.5], ['C5 E5 G5', 1.5]],
    // もうすこし：やさしく「つぎ がんばろう」
    try: [['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['C5 E5 G5', 1.5]],
    // しんきろく：キラキラ
    record: [['C6', 0.25], ['E6', 0.25], ['G6', 0.25], ['C7', 0.75]],
  };
  function resultSound(rate, newRecord) {
    var tune = rate === 1 ? TUNES.perfect : rate >= 0.8 ? TUNES.great : rate >= 0.5 ? TUNES.good : TUNES.try;
    var bpm = rate === 1 ? 132 : 150;
    playTune(tune, bpm, 0.1);
    if (newRecord) {
      var len = tune.reduce(function (s, n) { return s + n[1]; }, 0) * 60 / bpm;
      setTimeout(function () { playTune(TUNES.record, 160, 0.06); }, len * 1000 + 150);
    }
  }

  function totalStars() { return store.get('stars', 0); }
  function header(title, onBack) {
    return h('div', { class: 'top' }, [
      onBack ? h('button', { class: 'back', onclick: onBack, text: '← もどる' }) : null,
      h('h1', { html: title }),
      h('div', { class: 'stars', text: '⭐ ' + totalStars() }),
    ]);
  }
  function screen(nodes) {
    app.innerHTML = '';
    nodes.forEach(function (n) { if (n) app.appendChild(n); });
    window.scrollTo(0, 0);
  }

  // ---------- ホーム ----------
  function home() {
    var tiles = [
      ['c1', '➕', 'けいさん', 'たしざん・ひきざん', mathSetup],
      ['c2', '✖️', 'くく', '1のだん〜9のだん', kukuSetup],
      ['c3', '🏳️', 'こっき', 'こっきを みて あてよう', flagSetup],
      ['c4', '🗾', 'にほんちず', 'とどうふけんを あてよう', function () { mapSetup('japan'); }],
      ['c5', '🌏', 'せかいちず', 'くにを あてよう', function () { mapSetup('world'); }],
      ['c6', '🏆', 'きろく', 'タイムと いちばんの きろく', recordsScreen],
    ];
    var sound = store.get('sound', false);
    screen([
      h('div', { class: 'top' }, [h('div', { style: 'flex:1' }), h('div', { class: 'stars', text: '⭐ ' + totalStars() })]),
      h('div', { class: 'hero' }, [
        h('div', { class: 'plane', text: '✈️' }),
        h('h1', { text: 'そらのクイズ' }),
        h('p', { text: 'あそびたい ゲームを えらんでね' }),
      ]),
      h('div', { class: 'grid' }, tiles.map(function (t) {
        return h('button', { class: 'tile ' + t[0], onclick: t[4] }, [
          h('div', { class: 'ic', text: t[1] }), h('div', { class: 'nm', text: t[2] }), h('div', { class: 'ds', text: t[3] }),
        ]);
      })),
      h('p', { class: 'note' }, [
        h('button', { class: 'chip' + (sound ? ' on' : ''), style: 'font-size:16px;padding:8px 14px', text: sound ? '🔔 おと あり' : '🔕 おと なし',
          onclick: function () { store.set('sound', !sound); home(); } }),
      ]),
      h('p', { class: 'note', style: 'font-size:11px', text: 'ちず: Natural Earth / world-atlas, jpn-atlas（国土地理院 地球地図日本）／ くにの なまえ: mledoze/countries (ODbL)' }),
    ]);
  }

  // ---------- せってい画面の共通部品 ----------
  function chipGroup(title, options, key, def, multi) {
    var cur = store.get(key, def);
    var wrap = h('div', { class: 'chips' });
    function draw() {
      wrap.innerHTML = '';
      options.forEach(function (o) {
        var on = multi ? cur.indexOf(o[0]) >= 0 : cur === o[0];
        wrap.appendChild(h('button', { class: 'chip' + (on ? ' on' : ''), html: o[1], onclick: function () {
          if (multi) {
            if (o[0] === 'all') cur = ['all'];
            else {
              cur = cur.filter(function (x) { return x !== 'all' && x !== o[0]; }).concat(on ? [] : [o[0]]);
              if (!cur.length) cur = ['all'];
            }
          } else cur = o[0];
          store.set(key, cur); draw();
        } }));
      });
    }
    draw();
    return { node: h('div', { class: 'panel' }, [h('h2', { text: title }), wrap]), val: function () { return cur; } };
  }

  // ---------- けいさん ----------
  function mathSetup() {
    var kind = chipGroup('どっちにする？', [['add', '➕ たしざん'], ['sub', '➖ ひきざん'], ['mix', '🔀 まぜる']], 'math-kind', 'add');
    var lv = chipGroup('むずかしさ', [[1, '⭐ 1けた'], [2, '⭐⭐ 2けた と 1けた'], [3, '⭐⭐⭐ 2けた どうし']], 'math-lv', 1);
    screen([header('けいさん', home), kind.node, lv.node,
      h('button', { class: 'go', text: 'スタート！', onclick: function () {
        var qs = [];
        for (var i = 0; i < ROUND; i++) {
          var k = kind.val() === 'mix' ? (rnd(2) ? 'add' : 'sub') : kind.val();
          qs.push(mathQ(k, lv.val()));
        }
        var KL = { add: '➕ たしざん', sub: '➖ ひきざん', mix: '🔀 まぜる' }, LL = { 1: '1けた', 2: '2けた と 1けた', 3: '2けた どうし' };
        runNumberQuiz('けいさん', qs, mathSetup, { key: 'math-' + kind.val() + '-' + lv.val(), label: 'けいさん ' + KL[kind.val()] + ' ' + LL[lv.val()] });
      } })]);
  }
  function mathQ(kind, lv) {
    var a, b;
    if (kind === 'add') {
      if (lv === 1) { a = between(1, 9); b = between(1, 9); }
      else if (lv === 2) { a = between(10, 89); b = between(2, 9); }
      else { a = between(10, 89); b = between(10, 99 - a > 10 ? 99 - a : 10); }
      return { text: a + ' ＋ ' + b, ans: a + b };
    }
    if (lv === 1) { a = between(2, 18); b = between(1, Math.min(9, a)); }
    else if (lv === 2) { a = between(11, 99); b = between(2, 9); }
    else { a = between(20, 99); b = between(10, a - 1); }
    return { text: a + ' − ' + b, ans: a - b };
  }

  // ---------- くく ----------
  function kukuSetup() {
    var opts = [['all', 'ぜんぶ']];
    for (var i = 1; i <= 9; i++) opts.push([i, i + 'のだん']);
    var dan = chipGroup('どの だん？（いくつでも えらべるよ）', opts, 'kuku-dan', ['all'], true);
    var order = chipGroup('じゅんばん', [['rand', '🔀 バラバラ'], ['seq', '⬇️ じゅんばん']], 'kuku-order', 'rand');
    screen([header('くく', home), dan.node, order.node,
      h('button', { class: 'go', text: 'スタート！', onclick: function () {
        var ds = dan.val().indexOf('all') >= 0 ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : dan.val().slice().sort();
        var all = [];
        ds.forEach(function (d) { for (var j = 1; j <= 9; j++) all.push({ text: d + ' × ' + j, ans: d * j }); });
        var qs = order.val() === 'seq' && ds.length === 1 ? all.slice(0, 9) : shuffle(all).slice(0, ROUND);
        var seq = order.val() === 'seq' && ds.length === 1;
        var dl = ds.length === 9 ? 'ぜんぶの だん' : ds.join('・') + ' の だん';
        runNumberQuiz('くく', qs, kukuSetup, { key: 'kuku-' + ds.join('') + (seq ? '-seq' : ''), label: '✖️ くく ' + dl + (seq ? '（じゅんばん）' : '') });
      } })]);
  }

  // ---------- すうじで こたえる クイズ ----------
  function runNumberQuiz(title, qs, again, rec) {
    var i = 0, results = [];
    clockReset();
    function show() {
      var q = qs[i], typed = '', answered = false;
      var ansSpan = h('span', { text: '' });
      function upd() { ansSpan.textContent = typed || ' '; }
      function key(k) {
        if (answered) return;
        if (k === 'del') typed = typed.slice(0, -1);
        else if (k === 'ok') { if (typed) check(); return; }
        else if (typed.length < 3) typed = (typed === '0' ? '' : typed) + k;
        upd();
      }
      function check() {
        if (answered) return; answered = true; // れんだ よけ
        clockStop();
        var ok = Number(typed) === q.ans;
        results.push({ ok: ok, q: q.text + ' = ' + q.ans, your: typed });
        feedback(ok, ok ? '' : q.text + ' = <b>' + q.ans + '</b>', next);
      }
      var keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'del', '0', 'ok'];
      screen([
        h('div', { class: 'top' }, [h('button', { class: 'back', onclick: again, text: '← やめる' }), progress(results, qs.length), clockNode()]),
        h('div', { class: 'qbox' }, [
          h('div', { class: 'question' }, [h('div', { class: 'big', text: q.text + ' =' })]),
          h('div', { class: 'answer' }, [ansSpan]),
          h('div', { class: 'pad' }, keys.map(function (k) {
            return h('button', { class: 'key' + (k === 'del' ? ' del' : k === 'ok' ? ' ok' : ''),
              text: k === 'del' ? 'けす' : k === 'ok' ? 'こたえる' : k, onclick: function () { key(k); } });
          })),
        ]),
      ]);
      upd();
      clockStart();
    }
    function next() { i++; if (i < qs.length) show(); else result(title, results, again, rec); }
    show();
  }

  // ---------- タイム（こたえを かんがえている じかんだけ はかる） ----------
  var clock = { total: 0, t0: null, el: null };
  function clockReset() { clock.total = 0; clock.t0 = null; }
  function clockStart() { clock.t0 = Date.now(); }
  function clockStop() { if (clock.t0 != null) { clock.total += Date.now() - clock.t0; clock.t0 = null; } }
  function clockMs() { return clock.total + (clock.t0 != null ? Date.now() - clock.t0 : 0); }
  function sec(ms) { return (ms / 1000).toFixed(1); }
  function clockNode() {
    clock.el = h('div', { class: 'stars clock', text: '⏱ ' + sec(clockMs()) });
    return clock.el;
  }
  setInterval(function () {
    if (clock.el && document.body.contains(clock.el)) clock.el.textContent = '⏱ ' + sec(clockMs());
  }, 100);

  // ---------- きろく ----------
  function better(a, b) { // a が b より いい きろくか
    if (!b) return true;
    var ra = a.n / a.total, rb = b.n / b.total;
    return ra > rb || (ra === rb && a.ms < b.ms);
  }
  function saveRecord(rec, n, total, ms) {
    var all = store.get('records', {});
    var r = all[rec.key] || { label: rec.label, best: null, history: [] };
    var d = new Date();
    var entry = { n: n, total: total, ms: ms, date: (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2) };
    var prev = r.best;
    var isBest = better(entry, prev);
    if (isBest) r.best = entry;
    r.label = rec.label;
    r.last = Date.now();
    r.history = [entry].concat(r.history).slice(0, 20);
    all[rec.key] = r;
    store.set('records', all);
    return { isBest: isBest, prev: prev, best: r.best };
  }
  function recordsScreen() {
    var all = store.get('records', {});
    var keys = Object.keys(all).sort(function (a, b) { return (all[b].last || 0) - (all[a].last || 0); });
    screen([header('🏆 きろく', home)].concat(keys.length ? keys.map(function (k) {
      var r = all[k];
      return h('div', { class: 'panel' }, [
        h('h2', { html: r.label }),
        h('div', { class: 'best', text: '🏆 いちばん: ' + r.best.n + ' / ' + r.best.total + ' もん ⏱ ' + sec(r.best.ms) + ' びょう（' + r.best.date + '）' }),
        h('div', { class: 'hist', html: r.history.slice(0, 5).map(function (e) {
          return e.date + '　' + e.n + ' / ' + e.total + '　⏱ ' + sec(e.ms) + ' びょう';
        }).join('<br>') }),
      ]);
    }) : [h('div', { class: 'panel', text: 'まだ きろくが ないよ。ゲームを あそんでみよう！' })]));
  }

  function progress(results, n) {
    var bar = h('div', { class: 'progress' });
    for (var j = 0; j < n; j++) {
      var r = results[j];
      bar.appendChild(h('i', { class: r ? (r.ok ? 'ok' : 'ng') : j === results.length ? 'now' : '' }));
    }
    return bar;
  }

  var PRAISE = ['せいかい！', 'すごい！', 'やったね！', 'てんさい！', 'ばっちり！', 'かんぺき！'];
  function feedback(ok, answerHtml, done) {
    beep(ok);
    var card = h('div', { class: 'card' }, [
      h('div', { class: 'mark', text: ok ? '⭕' : '❌' }),
      h('div', { class: 'msg', text: ok ? PRAISE[rnd(PRAISE.length)] : 'おしい！' }),
      answerHtml ? h('div', { class: 'ans', html: 'こたえは ' + answerHtml }) : null,
    ]);
    var fb = h('div', { class: 'fb' }, [card]);
    var closed = false;
    function close() { if (closed) return; closed = true; fb.remove(); done(); }
    if (ok) {
      setTimeout(close, 900);
      fb.addEventListener('click', close);
    } else {
      card.appendChild(h('button', { class: 'go next', text: 'つぎへ ▶', onclick: close }));
    }
    document.body.appendChild(fb);
  }

  function result(title, results, again, rec) {
    var n = results.filter(function (r) { return r.ok; }).length;
    store.set('stars', totalStars() + n);
    var ms = clock.total;
    var sv = saveRecord(rec, n, results.length, ms);
    var bestLine = sv.isBest && sv.prev ? '🏆 しんきろく！（まえの いちばん: ' + sv.prev.n + ' / ' + sv.prev.total + ' もん ⏱ ' + sec(sv.prev.ms) + ' びょう）'
      : sv.isBest ? '🏆 はじめての きろく！'
      : 'いちばん: ' + sv.best.n + ' / ' + sv.best.total + ' もん ⏱ ' + sec(sv.best.ms) + ' びょう';
    var rate = n / results.length;
    var msg = rate === 1 ? 'ぜんもん せいかい！ 🎉' : rate >= 0.8 ? 'すごい！ もうすこしで ぜんぶ！' : rate >= 0.5 ? 'いいね！ その ちょうし！' : 'もういちど やってみよう！';
    var miss = results.filter(function (r) { return !r.ok; });
    var starrow = '';
    for (var j = 0; j < results.length; j++) starrow += results[j].ok ? '⭐' : '☆';
    screen([
      header(title, home),
      h('div', { class: 'panel result' }, [
        h('div', { class: 'score', text: n + ' / ' + results.length }),
        h('div', { class: 'starrow', text: starrow }),
        h('div', { class: 'time', text: '⏱ ' + sec(ms) + ' びょう' }),
        h('div', { class: 'best' + (sv.isBest ? ' new' : ''), text: bestLine }),
        h('div', { class: 'question', text: msg }),
        h('p', { class: 'note', text: 'ほし ' + n + 'こ ゲット！ ぜんぶで ⭐ ' + totalStars() }),
      ]),
      miss.length ? h('div', { class: 'panel' }, [
        h('h2', { text: 'まちがえた もんだい' }),
        h('div', { class: 'miss', html: miss.map(function (r) { return '・' + r.q; }).join('<br>') }),
      ]) : null,
      h('div', { class: 'row' }, [
        h('button', { class: 'go ghost', text: '🏠 ホーム', onclick: home }),
        h('button', { class: 'go', text: '🔁 もういちど', onclick: again }),
      ]),
    ]);
    if (rate === 1 || (sv.isBest && sv.prev)) confetti();
    resultSound(rate, sv.isBest && !!sv.prev);
  }
  function confetti() {
    var em = ['⭐', '🎉', '✨', '🌺', '✈️', '🌈'];
    for (var j = 0; j < 40; j++) {
      var c = h('div', { class: 'confetti', text: em[rnd(em.length)] });
      c.style.left = rnd(100) + 'vw';
      c.style.animationDuration = (2 + Math.random() * 2) + 's';
      c.style.animationDelay = (Math.random() * 0.8) + 's';
      document.body.appendChild(c);
      setTimeout(function (el) { return function () { el.remove(); }; }(c), 5000);
    }
  }

  // ---------- えらぶ クイズ（こっき・ちず） ----------
  function runChoiceQuiz(title, qs, again, render, rec) {
    var i = 0, results = [];
    clockReset();
    function show() {
      var q = qs[i];
      var locked = false;
      function answer(choice, btn) {
        if (locked) return; locked = true;
        clockStop();
        var ok = choice === q.item;
        results.push({ ok: ok, q: q.review });
        render.mark && render.mark(q, choice, ok);
        if (btn) btn.classList.add(ok ? 'right' : 'wrong');
        var rightBtn = document.querySelector('[data-id="' + q.item.id + '"]');
        if (rightBtn && !ok) rightBtn.classList.add('right');
        setTimeout(function () { feedback(ok, ok ? '' : q.answerHtml, next); }, ok ? 250 : 700);
      }
      screen([
        h('div', { class: 'top' }, [h('button', { class: 'back', onclick: again, text: '← やめる' }), progress(results, qs.length), clockNode()]),
        render.body(q, answer),
      ]);
      clockStart();
    }
    function next() { i++; if (i < qs.length) show(); else result(title, results, again, rec); }
    show();
  }
  function choiceButtons(q, answer, asFlag) {
    return h('div', { class: 'choices' }, q.choices.map(function (c) {
      var b = h('button', { class: 'choice' + (asFlag ? ' flag' : ''), 'data-id': c.id, html: asFlag ? c.flag : label(c) });
      b.addEventListener('click', function () { answer(c, b); });
      return b;
    }));
  }

  // ---------- こっき ----------
  function flagSetup() {
    var mode = chipGroup('あそびかた', [['f2n', '🏳️ → なまえ'], ['n2f', 'なまえ → 🏳️']], 'flag-mode', 'f2n');
    var lv = chipGroup('くにの かず', [['easy', '⭐ ゆうめいな くに'], ['all', '⭐⭐⭐ せかいの ぜんぶの くに']], 'flag-lv', 'easy');
    screen([header('こっき', home), mode.node, lv.node,
      h('button', { class: 'go', text: 'スタート！', onclick: function () {
        var pool = D.world.items.filter(function (c) { return lv.val() === 'all' || c.easy; });
        var qs = shuffle(pool).slice(0, ROUND).map(function (c) {
          return { item: c, choices: shuffle([c].concat(pick(pool, 3, [c]))), review: c.flag + ' ' + label(c), answerHtml: '<br><span style="font-size:80px">' + c.flag + '</span><br>' + label(c) };
        });
        var f2n = mode.val() === 'f2n';
        var flagRec = { key: 'flag-' + mode.val() + '-' + lv.val(),
          label: '🏳️ こっき ' + (f2n ? 'こっき → なまえ' : 'なまえ → こっき') + '（' + (lv.val() === 'easy' ? 'ゆうめいな くに' : 'ぜんぶの くに') + '）' };
        runChoiceQuiz('こっき', qs, flagSetup, {
          body: function (q, answer) {
            return h('div', { class: 'qbox' }, f2n ? [
              h('div', { class: 'question', text: 'この こっきは どこの くに？' }),
              h('div', { class: 'flagbig', text: q.item.flag }),
              choiceButtons(q, answer, false),
            ] : [
              h('div', { class: 'question', html: '<span class="big">' + label(q.item) + '</span><br>の こっきは どれ？' }),
              choiceButtons(q, answer, true),
            ]);
          },
        }, flagRec);
      } })]);
  }

  // ---------- ちず ----------
  var JP_GROUPS = [['all', 'ぜんぶ'], ['北海道・東北', '<ruby>北海道<rt>ほっかいどう</rt></ruby>・<ruby>東北<rt>とうほく</rt></ruby>'],
    ['関東', '<ruby>関東<rt>かんとう</rt></ruby>'], ['中部', '<ruby>中部<rt>ちゅうぶ</rt></ruby>'], ['近畿', '<ruby>近畿<rt>きんき</rt></ruby>'],
    ['中国・四国', '<ruby>中国<rt>ちゅうごく</rt></ruby>・<ruby>四国<rt>しこく</rt></ruby>'], ['九州・沖縄', '<ruby>九州<rt>きゅうしゅう</rt></ruby>・<ruby>沖縄<rt>おきなわ</rt></ruby>']];
  var JP_YOMI = { '北海道': 'ほっかいどう', '東北': 'とうほく', '関東': 'かんとう', '中部': 'ちゅうぶ', '近畿': 'きんき', '中国': 'ちゅうごく', '四国': 'しこく', '九州・沖縄': 'きゅうしゅう・おきなわ' };
  function jpArea(item) {
    var g = item.group;
    if (g === '北海道' || g === '東北') return '北海道・東北';
    if (g === '中国' || g === '四国') return '中国・四国';
    return g;
  }
  var W_GROUPS = [['all', 'ぜんぶ'], ['アジア', 'アジア'], ['ヨーロッパ', 'ヨーロッパ'], ['アフリカ', 'アフリカ'], ['アメリカ大陸', 'アメリカ<ruby>大陸<rt>たいりく</rt></ruby>'], ['オセアニア', 'オセアニア']];

  function mapSetup(which) {
    var jp = which === 'japan';
    var mode = chipGroup('あそびかた', [['hl', '🟧 ひかった ところは どこ？'], ['tap', '👆 ちずを タッチして こたえる']], which + '-mode', 'hl');
    var area = chipGroup(jp ? 'どの ちほう？' : 'どの あたり？', jp ? JP_GROUPS : W_GROUPS, which + '-area', 'all');
    var lv = jp ? null : chipGroup('くにの かず', [['easy', '⭐ ゆうめいな くに'], ['all', '⭐⭐⭐ ぜんぶの くに']], 'world-lv', 'easy');
    screen([header(jp ? 'にほんちず' : 'せかいちず', home), mode.node, area.node, lv ? lv.node : null,
      h('button', { class: 'go', text: 'スタート！', onclick: function () { startMap(which, mode.val(), area.val(), lv ? lv.val() : 'all'); } })]);
  }

  function areaOf(which, item) { return which === 'japan' ? jpArea(item) : item.group; }

  function startMap(which, mode, area, lv) {
    var M = which === 'japan' ? D.japan : D.world;
    var all = M.items.filter(function (it) { return it.d && it.b; });
    var pool = all.filter(function (it) {
      if (area !== 'all' && areaOf(which, it) !== area) return false;
      if (which === 'world') {
        if (lv === 'easy' && !it.easy) return false;
        // タッチで こたえるときは 小さすぎる くにを はずす
        var size = Math.max(it.b[2] - it.b[0], it.b[3] - it.b[1]);
        if (mode === 'tap' && size < 4) return false;
        if (size < 1.2) return false;
      }
      return true;
    });
    if (pool.length < 4) pool = all.filter(function (it) { return lv !== 'easy' || it.easy; });
    var qs = shuffle(pool).slice(0, ROUND).map(function (it) {
      return { item: it, choices: shuffle([it].concat(pick(pool, 3, [it]))), review: label(it), answerHtml: label(it) };
    });
    var again = function () { mapSetup(which); };
    var paths = {};

    function drawMap(q, view, onTap) {
      paths = {};
      var svg = s('svg', { viewBox: view.join(' '), preserveAspectRatio: 'xMidYMid meet' });
      var zoom = view[2] / M.w;
      var sw = Math.max(0.15, 1.2 * zoom);
      svg.appendChild(s('rect', { x: -2000, y: -2000, width: 6000, height: 6000, fill: 'var(--sea)' }));
      if (which === 'japan') {
        var b = M.inset;
        svg.appendChild(s('rect', { x: b[0], y: b[1], width: b[2] - b[0], height: b[3] - b[1], rx: 12, class: 'inset', 'stroke-width': 2 * zoom }));
      } else {
        svg.appendChild(s('path', { d: M.bg, class: 'land', 'stroke-width': sw, opacity: 0.6 }));
      }
      M.items.forEach(function (it) {
        if (!it.d) return;
        var p = s('path', { d: it.d, class: 'land' + (onTap ? ' tap' : ''), 'stroke-width': sw });
        if (onTap) p.addEventListener('click', function () { onTap(it); });
        paths[it.id] = p;
        svg.appendChild(p);
      });
      if (q && !onTap) {
        paths[q.item.id].classList.add('hl');
        svg.appendChild(paths[q.item.id]); // いちばん上に
        var bb = q.item.b, cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
        var rr = Math.max((bb[2] - bb[0]) / 2, (bb[3] - bb[1]) / 2) + 14 * zoom;
        if (rr < 40 * zoom) svg.appendChild(s('circle', { cx: cx, cy: cy, r: Math.max(rr, 22 * zoom), class: 'ring', 'stroke-width': 3 * zoom }));
      }
      return h('div', { class: 'mapwrap' + (onTap ? ' tall' : '') }, [svg]);
    }

    function fit(b, minW, pad) {
      var w = Math.max(b[2] - b[0], minW), hh = Math.max(b[3] - b[1], minW * 0.62);
      var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
      w *= pad; hh *= pad;
      // よこながに そろえる
      if (w / hh < 1.4) w = hh * 1.4; else hh = w / 1.4;
      return [cx - w / 2, cy - hh / 2, w, hh].map(function (n) { return Math.round(n * 10) / 10; });
    }
    function unionB(items) {
      var b = [Infinity, Infinity, -Infinity, -Infinity];
      items.forEach(function (it) { b[0] = Math.min(b[0], it.b[0]); b[1] = Math.min(b[1], it.b[1]); b[2] = Math.max(b[2], it.b[2]); b[3] = Math.max(b[3], it.b[3]); });
      return b;
    }

    function viewFor(q) {
      if (which === 'japan') {
        if (mode === 'hl') return M.view;
        if (q.item.id === '47') return M.view;
        var grp = M.items.filter(function (it) { return jpArea(it) === jpArea(q.item) && it.id !== '47'; });
        return fit(unionB(grp), 120, 1.15);
      }
      if (mode === 'hl') return fit(q.item.b, 90, 2.6);
      return fit(M.views[q.item.group], 100, 1.02);
    }

    runChoiceQuiz(which === 'japan' ? 'にほんちず' : 'せかいちず', qs, again, {
      body: function (q, answer) {
        if (mode === 'hl') {
          var askJ = which === 'japan' ? 'ひかっている けんは どこ？' : 'ひかっている くには どこ？';
          var box = h('div', { class: 'qbox' }, [h('div', { class: 'question', text: askJ })]);
          var split = h('div', { class: 'split' }, [drawMap(q, viewFor(q), null), choiceButtons(q, answer, false)]);
          box.appendChild(split);
          return box;
        }
        var where = which === 'japan' ? jpArea(q.item) : q.item.group;
        var hint = which === 'japan' && q.item.id !== '47'
          ? '（' + where.split('・').map(function (w) { return '<ruby>' + w + '<rt>' + (JP_YOMI[w] || '') + '</rt></ruby>'; }).join('・') + 'の なかに あるよ）'
          : '';
        return h('div', { class: 'qbox' }, [
          h('div', { class: 'question', html: '<span class="big" style="font-size:44px">' + label(q.item) + '</span> は どこ？ タッチしてね<br><span style="font-size:18px;color:var(--sub)">' + hint + '</span>' }),
          drawMap(q, viewFor(q), function (it) { answer(it, null); }),
        ]);
      },
      mark: function (q, choice, ok) {
        if (mode !== 'tap') return;
        if (!ok && paths[choice.id]) paths[choice.id].classList.add('wrong');
        paths[q.item.id].classList.add('right');
        paths[q.item.id].parentNode.appendChild(paths[q.item.id]);
      },
    }, { key: 'map-' + which + '-' + mode + '-' + area + (which === 'world' ? '-' + lv : ''),
      label: (which === 'japan' ? '🗾 にほんちず ' : '🌏 せかいちず ') + (mode === 'hl' ? 'ひかった ところ' : 'タッチ') + '（' + (area === 'all' ? 'ぜんぶ' : area) + (which === 'world' ? (lv === 'easy' ? '・ゆうめいな くに' : '・ぜんぶの くに') : '') + '）' });
  }

  home();
})();
