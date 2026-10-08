(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmt = (n, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const SVGNS = 'http://www.w3.org/2000/svg';

  const screen = $('#screen');
  const launcher = $('#launcher');
  const splash = $('#splash');
  const app = $('#app');
  const island = $('#island');
  const statusbar = $('#statusbar');
  const zoom = $('#zoom');

  /* ───────────── Status bar clock ───────────── */
  function tickClock() {
    const d = new Date();
    $('#sbTime').textContent = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  tickClock();
  setInterval(tickClock, 10000);

  /* ───────────── Launcher (fake iOS home screen) ───────────── */
  const ICONS = [
    ['Calendar', '#ff7a7a', '#ff3b30'], ['Mail', '#5ac8fa', '#1e7cf2'], ['Store', '#4fc3ff', '#1a73e8'], ['Weather', '#7cc6ff', '#3a8dde'],
    ['Notes', '#ffe58a', '#ffcc00'], ['Webtoon', '#5ef08a', '#00c853'], ['Pass', '#ff6b6b', '#e53935'], ['Food', '#ff8a80', '#ff1744'],
    ['Video', '#444', '#111'], ['Card', '#eee', '#bbb'], ['Links', '#6aa8ff', '#2962ff'], ['Shop', '#ff8a65', '#e64a19'],
    ['Voice', '#555', '#222'], ['Music', '#333', '#000'], ['Charts', '#3a3a3a', '#111'], ['LUMEX', null, null],
    ['Camera', '#ff6fb5', '#c2185b'], ['Market', '#b39ddb', '#7e57c2'], ['News', '#90caf9', '#1e88e5'], ['Tuner', '#666', '#222'],
    ['Light', '#ddd', '#999'], ['Moon', '#bbb', '#777'], ['Game', '#ffb74d', '#e65100'], ['Link', '#4dd0e1', '#00838f'],
  ];
  const grid = $('#launcherGrid');
  ICONS.forEach(([name, c1, c2]) => {
    const el = document.createElement('div');
    el.className = 'app-ic';
    if (name === 'LUMEX') {
      el.innerHTML = `<span class="ic lumex pulse"><svg viewBox="0 0 64 64"><use href="#lumexMark"/></svg></span><span>${name}</span>`;
      el.addEventListener('click', () => launch(el.firstElementChild));
    } else {
      el.innerHTML = `<span class="ic" style="--c1:${c1};--c2:${c2}"></span><span>${name}</span>`;
    }
    grid.appendChild(el);
  });

  /* ───────────── Launch sequence ───────────── */
  let launching = false;

  async function launch(iconEl) {
    if (launching) return;
    launching = true;
    const sr = screen.getBoundingClientRect();
    const scale = sr.width / screen.offsetWidth; // device may be CSS-scaled
    const ir = iconEl.getBoundingClientRect();
    const from = {
      left: (ir.left - sr.left) / scale, top: (ir.top - sr.top) / scale,
      width: ir.width / scale, height: ir.height / scale,
    };
    const radius = getComputedStyle(screen).borderRadius;

    // 1) App icon zooms open into a white window holding the logo
    zoom.style.display = 'block';
    zoom.innerHTML = '';
    const z = zoom.animate([
      { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, borderRadius: '15px' },
      { left: '0px', top: '0px', width: `${screen.offsetWidth}px`, height: `${screen.offsetHeight}px`, borderRadius: radius },
    ], { duration: 480, easing: 'cubic-bezier(.2,.9,.25,1)', fill: 'forwards' });
    launcher.classList.add('behind');
    statusbar.classList.add('dark');

    // the splash content scales in with the window
    splash.hidden = false;
    splash.className = 'splash';
    splash.style.zIndex = 41;
    splash.animate([
      { clipPath: `inset(${from.top}px ${screen.offsetWidth - from.left - from.width}px ${screen.offsetHeight - from.top - from.height}px ${from.left}px round 15px)`, transform: 'scale(1)' },
      { clipPath: `inset(0px 0px 0px 0px round ${radius})`, transform: 'scale(1)' },
    ], { duration: 480, easing: 'cubic-bezier(.2,.9,.25,1)' });
    $('.splash-brand', splash).animate([{ transform: 'translateY(-38px) scale(.35)', opacity: 0.4 }, { transform: 'translateY(-38px) scale(1)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.2,.9,.25,1)' });
    await z.finished;
    zoom.style.display = 'none';
    z.cancel();
    launcher.hidden = true;

    // 2) White splash holds
    await wait(1250);

    // 3) Quick fade to the dark splash
    splash.classList.add('dark');
    statusbar.classList.remove('dark');
    await wait(700);

    // 4) Face ID in the Dynamic Island
    island.classList.add('expanded');
    const fid = $('#faceid');
    const spin = $('#fidSpin');
    const done = $('#fidDone');
    fid.classList.remove('out');
    spin.classList.remove('gone');
    done.classList.remove('show');
    await wait(180);
    fid.classList.add('show');
    spin.classList.add('run');

    // the app is revealed underneath while the scan runs
    await wait(420);
    showApp();
    splash.classList.add('fade');
    await wait(500);

    // 5) Rings settle into a circle and a check mark draws in
    spin.classList.add('gone');
    spin.classList.remove('run');
    done.classList.add('show');
    await wait(900);

    // 6) Blur out and collapse the island back to a pill
    fid.classList.add('out');
    await wait(200);
    island.classList.remove('expanded');
    await wait(300);
    fid.classList.remove('show');
    splash.hidden = true;
    splash.className = 'splash';
    launching = false;
  }

  function showApp() {
    app.hidden = false;
    app.classList.add('boot');
    layoutAllTabs();
    setTimeout(() => app.classList.remove('boot'), 700);
  }

  function reset() {
    if (launching) return;
    app.hidden = true;
    splash.hidden = true;
    launcher.hidden = false;
    launcher.classList.remove('behind');
    statusbar.classList.remove('dark');
    island.classList.remove('expanded');
    go('home', false);
    visited.clear();
    visited.add('home');
    $('[data-page="markets"] .ptr-content').classList.remove('loading');
    $('.conv').classList.remove('ready');
    $$('.conv .coin-pick').forEach((p) => { p.innerHTML = '<span class="coin ph"></span><b>--</b> ▾'; });
  }
  $('#replay').addEventListener('click', reset);

  /* ───────────── Tabs with sliding underline ───────────── */
  function layoutTabs(wrap, animate = true) {
    const on = $('button.on', wrap);
    const bar = $('.tabs-bar', wrap);
    if (!on || !bar) return;
    const fixed = bar.classList.contains('short') ? 22 : 0;
    const w = fixed || on.offsetWidth;
    const x = on.offsetLeft + (on.offsetWidth - w) / 2;
    if (!animate) bar.style.transition = 'none';
    bar.style.width = `${w}px`;
    bar.style.transform = `translateX(${x}px)`;
    if (!animate) { bar.offsetWidth; bar.style.transition = ''; }
  }
  function layoutSeg(seg, animate = true) {
    const on = $('button.on', seg);
    const pill = $('.seg-pill', seg);
    if (!on || !pill) return;
    if (!animate) pill.style.transition = 'none';
    pill.style.width = `${on.offsetWidth}px`;
    pill.style.transform = `translateX(${on.offsetLeft}px)`;
    if (!animate) { pill.offsetWidth; pill.style.transition = ''; }
  }
  function layoutAllTabs() {
    $$('[data-tabs]').forEach((t) => layoutTabs(t, false));
    $$('.seg').forEach((s) => layoutSeg(s, false));
  }
  function activate(btn) {
    $$('button', btn.parentElement).forEach((b) => b.classList.toggle('on', b === btn));
    btn.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
  $$('[data-tabs]').forEach((wrap) => {
    $$('button', wrap).forEach((b) => b.addEventListener('click', () => { activate(b); layoutTabs(wrap); }));
  });
  $$('.seg').forEach((seg) => {
    $$('button', seg).forEach((b) => b.addEventListener('click', () => { activate(b); layoutSeg(seg); }));
  });
  $$('[data-chips], .chips').forEach((c) => {
    $$('button', c).forEach((b) => b.addEventListener('click', () => activate(b)));
  });
  window.addEventListener('resize', layoutAllTabs);

  /* ───────────── Bottom tab bar / page switching ───────────── */
  const visited = new Set(['home']);
  const tabbar = $('#tabbar');
  $$('.draw', tabbar).forEach((p) => p.setAttribute('pathLength', '1'));
  let current = 'home';

  function go(name, animate = true) {
    if (name === current && animate) {
      // re-tap: scroll the page to top
      const sc = $(`[data-page="${name}"] .scroller`);
      sc?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    current = name;
    $$('.page').forEach((p) => p.classList.toggle('active', p.dataset.page === name));
    $$('button', tabbar).forEach((b) => {
      const on = b.dataset.go === name;
      b.classList.toggle('on', on);
      b.classList.remove('anim');
      if (on && animate) { b.offsetWidth; b.classList.add('anim'); }
    });
    $('#mascot').style.display = name === 'futures' ? 'none' : '';
    const page = $(`[data-page="${name}"]`);
    requestAnimationFrame(() => {
      $$('[data-tabs]', page).forEach((t) => layoutTabs(t, false));
      $$('.seg', page).forEach((s) => layoutSeg(s, false));
    });
    if (!visited.has(name)) {
      visited.add(name);
      firstLoad(name);
    }
  }
  $$('button', tabbar).forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));

  async function firstLoad(name) {
    if (name === 'markets') {
      const c = $('[data-page="markets"] .ptr-content');
      const loaded = $('.loaded', c);
      c.classList.add('loading');
      await wait(650);
      c.classList.remove('loading');
      loaded.classList.remove('reveal');
      loaded.offsetWidth;
      loaded.classList.add('reveal');
    }
    if (name === 'trade') {
      await wait(700);
      loadConvert();
    }
    if (name === 'assets' || name === 'futures') {
      const c = $(`[data-page="${name}"] .ptr-content`);
      c.classList.remove('reveal');
      c.offsetWidth;
      c.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
  }

  function loadConvert() {
    const picks = $$('.conv .coin-pick');
    picks[0].innerHTML = '<span class="coin" style="--cc:#e9eaec">✕</span><b>XRP</b> ▾';
    picks[1].innerHTML = '<span class="coin" style="--cc:#26a17b;color:#fff">T</span><b>USDT</b> ▾';
    $('.conv-avail').textContent = '0.0000 XRP';
    $('.conv').classList.add('ready');
  }
  let swapRot = 0;
  $('#swapBtn').addEventListener('click', (e) => {
    swapRot += 180;
    e.currentTarget.style.transform = `rotate(${swapRot}deg)`;
    const picks = $$('.conv .coin-pick');
    const a = picks[0].innerHTML;
    picks[0].innerHTML = picks[1].innerHTML;
    picks[1].innerHTML = a;
  });

  /* ───────────── Home: rotating search placeholder ───────────── */
  const HOT = ['🔥 SUI hot search', 'Johnson & Johnson buyable blast', 'Amazon Bezos urges S&P 500 discipline', '🔥 ETH longs going vertical'];
  let hotIdx = 0;
  setInterval(() => {
    const rot = $('#searchRot');
    const old = rot.firstElementChild;
    hotIdx = (hotIdx + 1) % HOT.length;
    const nx = document.createElement('span');
    nx.textContent = HOT[hotIdx];
    nx.className = 'enter';
    rot.appendChild(nx);
    nx.offsetWidth;
    old.classList.add('leave');
    nx.classList.remove('enter');
    setTimeout(() => old.remove(), 500);
  }, 3200);

  /* ───────────── Home: promo carousel ───────────── */
  let promoIdx = 0;
  setInterval(() => {
    promoIdx = (promoIdx + 1) % 3;
    $('#promoTrack').style.transform = `translateX(calc(${promoIdx} * (-100% - 32px)))`;
    $$('#promoDots i').forEach((d, i) => d.classList.toggle('on', i === promoIdx));
  }, 3800);

  /* ───────────── Sparklines ───────────── */
  let gradSeq = 0;
  function spark(svg, { n = 40, trend = -0.3, vol = 1, area = true, color } = {}) {
    const vb = svg.viewBox.baseVal;
    const W = vb.width, H = vb.height;
    const pts = [];
    let v = 0;
    for (let i = 0; i < n; i++) { v += (Math.random() - 0.5 + trend * 0.15) * vol; pts.push(v); }
    const min = Math.min(...pts), max = Math.max(...pts);
    const xy = pts.map((p, i) => [(i / (n - 1)) * W, H - 3 - ((p - min) / (max - min || 1)) * (H - 6)]);
    const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
    const id = `sg${gradSeq++}`;
    const stroke = color || getComputedStyle(svg).getPropertyValue('--c') || '';
    svg.innerHTML = '';
    if (area) {
      const defs = document.createElementNS(SVGNS, 'defs');
      defs.innerHTML = `<linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".45"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient>`;
      svg.appendChild(defs);
      const a = document.createElementNS(SVGNS, 'path');
      a.setAttribute('d', `${d}L${W} ${H}L0 ${H}Z`);
      a.setAttribute('fill', `url(#${id})`);
      svg.appendChild(a);
    }
    const l = document.createElementNS(SVGNS, 'path');
    l.setAttribute('d', d);
    l.setAttribute('class', 'l');
    if (stroke) l.style.stroke = stroke;
    svg.appendChild(l);
  }
  function drawSparks() {
    const red = getComputedStyle(document.documentElement).getPropertyValue('--red');
    const green = getComputedStyle(document.documentElement).getPropertyValue('--green');
    const gold = getComputedStyle(document.documentElement).getPropertyValue('--gold');
    $('#lmxSpark').style.color = red; spark($('#lmxSpark'), { trend: -0.6 });
    $('#idxSpark').style.color = green; spark($('#idxSpark'), { trend: 0.5, n: 50, area: false });
    $('#tpSpark').style.color = gold; spark($('#tpSpark'), { trend: 0.2, n: 30, vol: 2 });
    $('#asSpark').style.color = gold; spark($('#asSpark'), { trend: -0.2, n: 20, area: false });
  }
  drawSparks();

  /* ───────────── Home: market list w/ live ticks ───────────── */
  const COINS = [
    { s: 'LMX', n: 'Lumex Coin', p: 760.07, c: -0.89, cc: '#fcd535' },
    { s: 'BTC', n: 'Bitcoin', p: 82489.38, c: -1.08, cc: '#f7931a' },
    { s: 'ETH', n: 'Ethereum', p: 2536.33, c: -1.01, cc: '#8c9cff' },
    { s: 'SOL', n: 'Solana', p: 112.57, c: -3.20, cc: '#9b5cff' },
    { s: 'XRP', n: 'XRP', p: 1.3997, c: -2.89, cc: '#e9eaec' },
  ];
  const homeList = $('#homeList');
  COINS.forEach((c) => {
    const row = document.createElement('div');
    row.className = 'coin-row';
    row.innerHTML = `<div class="nm"><span class="coin" style="--cc:${c.cc}">${c.s[0]}</span><div><b>${c.s}</b> <small>${c.n}</small></div></div>
      <div class="px"><span class="v"></span><small class="usd"></small></div><div class="chg"></div>`;
    c.el = row;
    homeList.appendChild(row);
    renderCoin(c);
  });
  function renderCoin(c, dir) {
    const d = c.p < 10 ? 4 : 2;
    const v = $('.v', c.el);
    v.textContent = fmt(c.p, d);
    $('.usd', c.el).textContent = `$${fmt(c.p, d)}`;
    const chg = $('.chg', c.el);
    chg.textContent = `${c.c >= 0 ? '+' : ''}${c.c.toFixed(2)}%`;
    chg.classList.toggle('pos', c.c >= 0);
    if (dir) { v.parentElement.classList.remove('flash-up', 'flash-down'); v.parentElement.offsetWidth; v.parentElement.classList.add(dir > 0 ? 'flash-up' : 'flash-down'); }
  }
  function tickCoin(c, mag = 0.0008) {
    const r = (Math.random() - 0.5) * 2 * mag;
    c.p *= 1 + r;
    c.c += r * 100;
    renderCoin(c, Math.sign(r));
    if (c.s === 'LMX') {
      $('#lmxPrice').textContent = fmt(c.p);
      $('#lmxChg').textContent = `${c.c >= 0 ? '▲' : '▼'} ${Math.abs(c.c).toFixed(2)}%`;
      $('#lmxChg').className = c.c >= 0 ? 'up' : 'down';
    }
  }
  setInterval(() => tickCoin(COINS[Math.floor(Math.random() * COINS.length)]), 1400);

  /* ───────────── Futures: order book ───────────── */
  let mid = 2535.30;
  const asksEl = $('#asks'), bidsEl = $('#bids');
  const ROWS = 9;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function amount() {
    const v = Math.random() < 0.15 ? rnd(100, 600) : rnd(1, 60);
    return v >= 1000 ? `${(v / 1000).toFixed(2)}M` : v >= 100 ? `${v.toFixed(2)}K` : `${v.toFixed(2)}${Math.random() < 0.5 ? 'K' : ''}`;
  }
  function buildBook() {
    asksEl.innerHTML = '';
    bidsEl.innerHTML = '';
    for (let i = 0; i < ROWS; i++) {
      asksEl.insertAdjacentHTML('beforeend', '<div class="ob-row"><i></i><span></span><span></span></div>');
      bidsEl.insertAdjacentHTML('beforeend', '<div class="ob-row"><i></i><span></span><span></span></div>');
    }
  }
  function renderBook(full) {
    const a = $$('.ob-row', asksEl), b = $$('.ob-row', bidsEl);
    a.forEach((row, i) => {
      const p = mid + (ROWS - i) * 0.01;
      updRow(row, p, full);
    });
    b.forEach((row, i) => {
      const p = mid - (i + 1) * 0.01;
      updRow(row, p, full);
    });
  }
  function updRow(row, p, full) {
    const [, ps, as] = row.children;
    ps.textContent = fmt(p);
    if (full || Math.random() < 0.35) {
      as.textContent = amount();
      row.firstElementChild.style.width = `${rnd(4, 95)}%`;
      if (!full) { row.classList.add('hit'); setTimeout(() => row.classList.remove('hit'), 280); }
    }
  }
  buildBook();
  renderBook(true);
  setInterval(() => {
    const prev = mid;
    if (Math.random() < 0.45) mid = Math.round((mid + (Math.random() < 0.5 ? -0.01 : 0.01) * Math.ceil(Math.random() * 3)) * 100) / 100;
    renderBook(false);
    const m = $('#midPrice');
    m.textContent = fmt(mid);
    if (mid !== prev) m.className = mid > prev ? 'up' : 'down';
    $('#markPrice').textContent = fmt(mid + 0.27);
    $('#posMark').textContent = fmt(mid + 0.27);
    const pnl = (mid + 0.27 - 2560.91) * 6.847;
    $('#posPnl').textContent = fmt(pnl);
    $('#posRoi').textContent = `${fmt((pnl / 1456.67) * 100)}%`;
  }, 650);

  // funding countdown
  let cd = 2 * 3600 + 43 * 60 + 43;
  setInterval(() => {
    cd = cd > 0 ? cd - 1 : 8 * 3600;
    const h = String(Math.floor(cd / 3600)).padStart(2, '0');
    const m = String(Math.floor((cd % 3600) / 60)).padStart(2, '0');
    const s = String(cd % 60).padStart(2, '0');
    $('#countdown').textContent = `${h}:${m}:${s}`;
  }, 1000);

  /* ───────────── Assets: swipeable pager synced with tabs ───────────── */
  const pager = $('#assetPager');
  const assetTabs = $$('#assetTabs button');
  assetTabs.forEach((b, i) => b.addEventListener('click', () => {
    pager.scrollTo({ left: i * pager.clientWidth, behavior: 'smooth' });
  }));
  let pagerRaf = 0;
  pager.addEventListener('scroll', () => {
    cancelAnimationFrame(pagerRaf);
    pagerRaf = requestAnimationFrame(() => {
      const idx = Math.round(pager.scrollLeft / pager.clientWidth);
      const btn = assetTabs[idx];
      if (btn && !btn.classList.contains('on')) activate(btn);
    });
  });

  /* ───────────── Pull to refresh with logo burst animation ───────────── */
  const ARC_D = ['M21.86 10.25A24 24 0 0 1 42.14 10.25', 'M53.75 21.86A24 24 0 0 1 53.75 42.14', 'M42.14 53.75A24 24 0 0 1 21.86 53.75', 'M10.25 42.14A24 24 0 0 1 10.25 21.86'];
  const DOT_P = [[32, 8], [56, 32], [32, 56], [8, 32]]; // arc midpoints

  function buildRefreshLogo(host) {
    host.innerHTML = `<svg viewBox="0 0 64 64">
      <g class="arcs">${ARC_D.map((d) => `<path class="arc" d="${d}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`).join('')}</g>
      <g class="dots-g">${DOT_P.map(([x, y]) => `<circle class="dot" cx="${x}" cy="${y}" r="4.5"/>`).join('')}</g>
      <path class="core" d="M32 21l11 11-11 11-11-11z"/>
    </svg>`;
  }

  const THRESH = 64, HOLD = 56;

  function setupPTR(sc) {
    const content = $('.ptr-content', sc);
    const ind = $('.ptr-indicator', sc);
    const logo = $('.rlogo', ind);
    buildRefreshLogo(logo);
    const arcs = $$('.arc', logo), core = $('.core', logo), dots = $$('.dot', logo), dotsG = $('.dots-g', logo);
    let startY = null, pull = 0, busy = false, pointerId = null;

    function progress(p) {
      logo.style.opacity = p > 0.04 ? 1 : 0;
      logo.style.transform = `scale(${0.35 + 0.65 * Math.min(1, p)})`;
      core.style.transform = `scale(${clamp(p * 2.2, 0, 1)})`;
      const ap = clamp((p - 0.35) / 0.65, 0, 1);
      arcs.forEach((a) => a.setAttribute('stroke-dashoffset', 1 - ap));
    }
    function setPull(px, animate) {
      pull = px;
      content.style.transition = animate ? 'transform .45s cubic-bezier(.22,1,.36,1)' : 'none';
      content.style.transform = px ? `translateY(${px}px)` : '';
      ind.style.height = `${Math.max(px, 0)}px`;
      ind.style.transition = content.style.transition.replace('transform', 'height');
    }
    function rubber(dy) { return (1 - 1 / (dy * 0.55 / 220 + 1)) * 220; }

    function onStart(y) {
      if (busy || sc.scrollTop > 0) return false;
      startY = y;
      return true;
    }
    function onMove(y, ev) {
      if (startY == null || busy) return;
      const dy = y - startY;
      if (dy <= 0 || sc.scrollTop > 0) { if (pull) setPull(0); return; }
      if (ev.cancelable) ev.preventDefault();
      const px = rubber(dy);
      setPull(px);
      progress(px / THRESH);
    }
    async function onEnd() {
      if (startY == null) return;
      startY = null;
      if (busy) return;
      if (pull >= THRESH) {
        busy = true;
        setPull(HOLD, true);
        progress(1);
        await playRefresh();
        refreshData(sc);
        setPull(0, true);
        await wait(450);
        reset();
        busy = false;
      } else {
        setPull(0, true);
        logo.animate([{ opacity: logo.style.opacity || 0 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).finished.then((a) => { a.cancel?.(); progress(0); });
      }
    }
    function reset() {
      logo.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      progress(0);
    }

    async function playRefresh() {
      const E = 'cubic-bezier(.45,0,.2,1)';
      // A) arcs collapse into dots, core shrinks to a dot
      arcs.forEach((a) => a.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.8)' }], { duration: 220, easing: E, fill: 'forwards' }));
      dots.forEach((d) => d.animate([{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 220, easing: E, fill: 'forwards' }));
      await core.animate([{ transform: 'scale(1)' }, { transform: 'scale(.42)' }], { duration: 220, easing: E, fill: 'forwards' }).finished;
      // B) dots orbit and converge
      dotsG.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(270deg)' }], { duration: 760, easing: E, fill: 'forwards' });
      await Promise.all(dots.map((d, i) => {
        const [x, y] = DOT_P[i];
        const dx = 32 - x, dy = 32 - y;
        return d.animate([
          { transform: 'translate(0,0) scale(1)' },
          { transform: `translate(${dx * 0.55}px,${dy * 0.55}px) scale(.9)`, offset: 0.55 },
          { transform: `translate(${dx}px,${dy}px) scale(.4)` },
        ], { duration: 760, easing: E, fill: 'forwards' }).finished;
      }));
      // C) merge into a single diamond with a little pop
      dots.forEach((d) => d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 80, fill: 'forwards' }));
      await core.animate([{ transform: 'scale(.42)' }, { transform: 'scale(1.25)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out', fill: 'forwards' }).finished;
      // D) shrink away
      await logo.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0)', opacity: 0 }], { duration: 220, easing: 'ease-in', fill: 'forwards' }).finished;
    }

    // touch
    sc.addEventListener('touchstart', (e) => onStart(e.touches[0].clientY), { passive: true });
    sc.addEventListener('touchmove', (e) => onMove(e.touches[0].clientY, e), { passive: false });
    sc.addEventListener('touchend', onEnd);
    sc.addEventListener('touchcancel', onEnd);
    // mouse drag (desktop)
    sc.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      if (onStart(e.clientY)) pointerId = e.pointerId;
    });
    window.addEventListener('pointermove', (e) => { if (pointerId === e.pointerId) onMove(e.clientY, e); });
    window.addEventListener('pointerup', (e) => { if (pointerId === e.pointerId) { pointerId = null; onEnd(); } });
  }
  $$('.scroller.ptr').forEach(setupPTR);

  function refreshData(sc) {
    COINS.forEach((c) => tickCoin(c, 0.003));
    drawSparks();
    const page = sc.closest('.page')?.dataset.page;
    if (page === 'home') {
      const b = $('#balance');
      const v = 4679.48 + rnd(-6, 6);
      b.textContent = `$${fmt(v)}`;
      b.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 400 });
    }
    if (page === 'futures') renderBook(true);
    $('.ptr-content', sc).animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: 350 });
  }

  /* ───────────── Boot ───────────── */
  const params = new URLSearchParams(location.search);
  if (params.has('app')) {
    launcher.hidden = true;
    showApp();
  } else if (params.has('splash')) {
    // start at the splash directly
    const fake = document.createElement('div');
    Object.assign(fake.style, { position: 'absolute', left: '50%', top: '50%', width: '62px', height: '62px' });
    screen.appendChild(fake);
    launch(fake).then(() => fake.remove());
  }
})();
