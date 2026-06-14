(function () {
  const seed = window.FREDA_OPS_SEED;
  const apiBase = localStorage.getItem('freda.apiBase') || '';
  const state = {
    activeTab: localStorage.getItem('freda.activeTab') || 'today',
    role: localStorage.getItem('freda.role') || 'Freda / Owner',
    actions: loadActions(),
    audits: loadAudits(),
    uploads: JSON.parse(localStorage.getItem('freda.uploads') || '[]'),
    chat: JSON.parse(localStorage.getItem('freda.chat') || '[]'),
    live: seed.liveSamples || {},
    serverOnline: false,
    syncing: false,
    lastError: null
  };

  const tabs = [
    { id: 'today', label: 'Today' },
    { id: 'live', label: 'Live Sales' },
    { id: 'freda', label: 'Freda Priorities' },
    { id: 'stores', label: 'Stores' },
    { id: 'production', label: 'Production' },
    { id: 'actions', label: 'WhatsApp' },
    { id: 'assistant', label: 'Ask AI' },
    { id: 'training', label: 'Training/SOP' },
    { id: 'hiring', label: 'Hiring' },
    { id: 'audits', label: 'Audits' },
    { id: 'market', label: 'Market' },
    { id: 'data', label: 'Data' }
  ];

  function $(id) { return document.getElementById(id); }
  function esc(v) { return String(v ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
  function fmtMoney(n) { return n == null || Number.isNaN(Number(n)) ? '—' : '$' + Number(n).toLocaleString('en-AU', { maximumFractionDigits: 0 }); }
  function fmtMoney2(n) { return n == null || Number.isNaN(Number(n)) ? '—' : '$' + Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function ragClass(r) { return r === 'Green' ? 'Green' : r === 'Red' ? 'Red' : 'Amber'; }
  function severityRank(s) { return s === 'Red' ? 3 : s === 'Amber' ? 2 : 1; }
  function pct(n) { return n == null ? '—' : `${Math.round(n)}%`; }
  function loadActions() {
    const saved = JSON.parse(localStorage.getItem('freda.actions') || 'null');
    if (Array.isArray(saved)) return saved;
    return seed.whatsapp.actions.map(a => ({ ...a }));
  }
  function saveActions() { localStorage.setItem('freda.actions', JSON.stringify(state.actions)); }
  function loadAudits() {
    const saved = JSON.parse(localStorage.getItem('freda.audits') || 'null');
    if (Array.isArray(saved)) return saved;
    return seed.audits.map(a => ({ ...a }));
  }
  function saveAudits() { localStorage.setItem('freda.audits', JSON.stringify(state.audits)); }
  function saveChat() { localStorage.setItem('freda.chat', JSON.stringify(state.chat.slice(-40))); }

  async function init() {
    $('roleSelect').value = state.role;
    $('roleSelect').addEventListener('change', e => {
      state.role = e.target.value;
      localStorage.setItem('freda.role', state.role);
      render();
    });
    renderTabs();
    render();
    await loadLiveSummary(false);
    setupPwaInstall();
    if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
  }

  async function api(path, options = {}) {
    const res = await fetch(apiBase + path, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
    let body = null;
    try { body = await res.json(); } catch (_) { body = {}; }
    if (!res.ok) throw new Error(body.error || body.result?.error || body.message || `HTTP ${res.status}`);
    return body;
  }

  async function loadLiveSummary(showErrors = true) {
    try {
      const body = await api('/api/live/summary');
      state.live = body.live || state.live;
      state.serverOnline = true;
      state.lastError = null;
      $('syncStatus').textContent = 'Live server connected';
      $('syncStatus').style.background = '#ecfdf5';
      $('syncStatus').style.color = '#047857';
      render();
    } catch (error) {
      state.serverOnline = false;
      state.lastError = error.message;
      $('syncStatus').textContent = 'Offline sample mode';
      $('syncStatus').style.background = '#fef3c7';
      $('syncStatus').style.color = '#92400e';
      if (showErrors) alert('Live server not connected yet. The app is still usable with sample/offline data.\n\n' + error.message);
    }
  }

  function renderTabs() {
    const nav = $('tabs');
    nav.innerHTML = tabs.map(t => `<button class="tab ${state.activeTab === t.id ? 'active' : ''}" data-tab="${t.id}">${esc(t.label)}</button>`).join('');
    nav.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      state.activeTab = btn.dataset.tab;
      localStorage.setItem('freda.activeTab', state.activeTab);
      renderTabs(); render(); window.scrollTo({ top: 0, behavior: 'smooth' });
    }));
  }

  function render() {
    const map = {
      today: renderToday,
      live: renderLiveSales,
      freda: renderFredaPriorities,
      stores: renderStores,
      production: renderProduction,
      actions: renderActions,
      assistant: renderAssistant,
      training: renderTraining,
      hiring: renderHiring,
      audits: renderAudits,
      market: renderMarket,
      data: renderData
    };
    $('screen').innerHTML = (map[state.activeTab] || renderToday)();
    wireScreenEvents();
  }

  function mergedWhatsappActions() {
    const liveActions = state.live.whatsapp?.actions || [];
    const ids = new Set(liveActions.map(a => a.id));
    return [...liveActions, ...state.actions.filter(a => !ids.has(a.id))];
  }

  function storeMetrics(store) {
    const pos = state.live.reportingPOS?.[store.name] || seed.liveSamples?.reportingPOS?.[store.name] || null;
    const uber = state.live.uberEats?.[store.name] || seed.liveSamples?.uberEats?.[store.name] || null;
    const square = state.live.square?.[store.name] || seed.liveSamples?.square?.[store.name] || null;
    const posSales = value(pos, ['totalSales', 'netSales', 'grossSales', 'sales']);
    const uberSales = value(uber, ['sales', 'totalSales', 'netSales']);
    const squareSales = value(square, ['netSales', 'totalCollected', 'sales']);
    const isPies = store.name.includes('Pies');
    const channelSales = isPies ? (squareSales || 0) : (uberSales || 0);
    const totalCaptured = (posSales || 0) + channelSales;
    const baseline = store.recentAvgDay;
    // RAG should not mix Today POS with weekly Uber or monthly Square. Use POS vs baseline when POS is available; otherwise keep seeded status.
    const ratio = baseline && posSales ? posSales / baseline : null;
    const rag = ratio == null ? store.rag : ratio >= 0.95 ? 'Green' : ratio >= 0.80 ? 'Amber' : 'Red';
    return { pos, uber, square, posSales, uberSales, squareSales, totalLive: totalCaptured || null, totalCaptured: totalCaptured || null, baseline, ratio, rag, isPies };
  }

  function periodLabel(m, fallback = 'captured') {
    const p = String(m?.period || fallback || '').trim();
    if (!p) return 'captured';
    if (/^(this_week|week_to_date|wtd)$/i.test(p)) return 'WTD';
    if (/^(today|current_day)$/i.test(p) || /^\d{4}-\d{2}-\d{2}$/.test(p)) return 'Today';
    if (/^(this_month|month_to_date|mtd)$/i.test(p) || /\bMTD\b/i.test(p)) return 'MTD';
    if (/month|\d{4}-\d{2}-\d{2}\s+to\s+\d{4}-\d{2}-\d{2}/i.test(p)) return 'Captured period';
    return p;
  }

  function channelLabel(store, m) {
    if (store.name.includes('Pies')) return `Square ${periodLabel(m.square, 'MTD')}`;
    return `Uber ${periodLabel(m.uber, 'this_week')}`;
  }

  function value(obj, keys) {
    if (!obj) return null;
    for (const k of keys) {
      const v = obj[k];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
    }
    return null;
  }

  function renderToday() {
    const actions = mergedWhatsappActions().filter(a => a.status !== 'Done').sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
    const stores = seed.stores.map(s => ({ ...s, metrics: storeMetrics(s) }));
    const redStores = stores.filter(s => s.metrics.rag === 'Red').length;
    const liveSales = stores.reduce((acc, s) => acc + (s.metrics.totalLive || 0), 0);
    const sourceLabel = state.serverOnline ? 'Live server' : 'Sample/offline';
    return `
      <section class="hero-card">
        <div class="status-row"><span class="badge">${esc(seed.meta.version)}</span><span class="mini-badge">${esc(state.role)}</span><span class="mini-badge">${sourceLabel}</span><span class="mini-badge">Updated ${esc((state.live.updatedAt || seed.liveSamples?.lastUpdated || '').slice(0, 16).replace('T', ' '))}</span></div>
        <h2 style="margin-top:12px">What needs attention today</h2>
        <ol class="priority">${dailyPriorities(stores, actions).map(b => `<li>${esc(b)}</li>`).join('')}</ol>
        <div class="action-controls"><button class="primary-btn" id="refreshLiveBtn">Refresh live summary</button><button class="ghost-btn" id="syncReportingBtn">Sync reporting.site POS</button></div>
        ${state.lastError ? `<p class="footer-note">Live note: ${esc(state.lastError)}</p>` : ''}
      </section>
      <section class="grid three">
        <div class="kpi"><div class="label">Live sales captured</div><div class="value">${fmtMoney(liveSales)}</div></div>
        <div class="kpi"><div class="label">Open actions</div><div class="value">${actions.length}</div></div>
        <div class="kpi"><div class="label">Red stores</div><div class="value">${redStores}</div></div>
      </section>
      <section class="card"><h2>Store status</h2><div class="grid two">${stores.map(storeCard).join('')}</div></section>
      <section class="card"><h2>Top open actions</h2><div class="grid">${actions.slice(0, 5).map(actionCard).join('') || '<div class="empty">No open actions.</div>'}</div></section>
      <section class="card"><h2>Quick ask</h2><p class="muted">Use the assistant for Freda’s one-minute manager workflow.</p><button class="primary-btn" data-open-assistant="What needs my attention today?">Ask: what needs my attention today?</button></section>
    `;
  }

  function dailyPriorities(stores, actions) {
    const items = [];
    const pen = stores.find(s => s.name === 'Penrith');
    const bh = stores.find(s => s.name === 'Beverly Hills');
    const tp = stores.find(s => s.name === 'Taren Point');
    const fp = stores.find(s => s.name.includes('Pies'));
    if (pen?.metrics.posSales) items.push(`Penrith POS is ${fmtMoney2(pen.metrics.posSales)} with ${pen.metrics.pos?.orders || '—'} orders captured. Protect afternoon cabinet before 3pm.`);
    else items.push('Sync Penrith reporting.site POS first; it is the priority live-sales test store.');
    if (bh?.metrics.uberSales) items.push(`Beverly Hills Uber WTD is ${fmtMoney2(bh.metrics.uberSales)} in the captured snapshot. Do not judge BH from POS alone, but do not treat WTD Uber as today.`);
    else items.push('Beverly Hills remains the volume engine. Refresh POS + Uber before adjusting production.');
    if (tp?.metrics.uberSales) items.push(`Taren Point Uber WTD is ${fmtMoney2(tp.metrics.uberSales)} in the captured snapshot; still protect early trade and stock/display follow-up.`);
    else items.push('Taren Point needs stock/display confirmation from WhatsApp and early-trade protection.');
    if (fp?.metrics.squareSales) items.push(`Frieda’s Pies Square MTD/captured-period snapshot is ${fmtMoney2(fp.metrics.squareSales)} with ${fp.metrics.square?.transactions || '—'} transactions. This is not Uber and not necessarily today.`);
    else items.push('Frieda’s Pies needs Square export/API or manual snapshot before pie sales advice is trusted.');
    items.push('New Freda priority: compare hour-by-hour to same day last week / last 4 weeks, then flag sell-outs that happen 3+ hours earlier than normal.');
    items.push('Production priority: confirm balls vs rings mix; specials may now use about 65% balls, so total donut count is not enough.');
    items.push(`Open WhatsApp/action items: ${actions.filter(a => a.status !== 'Done').length}. Close only after manager confirmation/photo.`);
    return items;
  }

  function storeCard(s) {
    const m = s.metrics || storeMetrics(s);
    const open = mergedWhatsappActions().filter(a => a.store === s.name && a.status !== 'Done').length;
    return `<article class="store-card">
      <div class="store-title"><div><h3>${esc(s.name)}</h3><div class="muted small">${esc(s.role)}</div></div><span class="rag ${ragClass(m.rag)}"><span class="dot ${ragClass(m.rag)}"></span>${esc(m.rag)}</span></div>
      <div class="kpi-row">
        <div class="kpi"><div class="label">POS ${periodLabel(m.pos, m.pos?.sourceView?.includes('screenshot sample') ? 'sample' : 'today')}</div><div class="value money">${fmtMoney(m.posSales)}</div></div>
        <div class="kpi"><div class="label">${channelLabel(s, m)}</div><div class="value money">${fmtMoney(s.name.includes('Pies') ? m.squareSales : m.uberSales)}</div></div>
        <div class="kpi"><div class="label">POS vs avg</div><div class="value">${m.ratio == null ? '—' : pct(m.ratio * 100)}</div></div>
      </div>
      <p><strong>Focus:</strong> ${esc(s.todayFocus)}</p>
      <p class="muted small"><strong>Opening rule:</strong> ${esc(s.openingRule)}</p>
      <p class="footer-note">Actions open: ${open}. Source: ${esc(m.pos?.sourceView || (s.name.includes('Pies') ? m.square?.sourceView : m.uber?.sourceView) || 'seeded analysis')}.</p>
    </article>`;
  }

  function renderLiveSales() {
    const stores = seed.stores.map(s => ({ ...s, metrics: storeMetrics(s) }));
    return `<section class="hero-card"><h2>Live Sales</h2><p class="muted">Beta 0.2.3 separates POS Today, Uber WTD/daily manual snapshots and Square MTD/captured-period values. It also adds Freda’s requested hour-by-hour, sell-out, stock, production-mix and training/hiring priorities.</p><div class="action-controls"><button class="primary-btn" id="syncReportingBtn">Sync reporting.site POS</button><button class="ghost-btn" id="refreshLiveBtn">Refresh summary</button></div></section>
      <section class="card"><h2>Store sales snapshot</h2><div class="grid">${stores.map(liveStoreCard).join('')}</div></section>
      <section class="card"><h2>Uber WTD / daily manual snapshot</h2><div class="grid two">${Object.entries(state.live.uberEats || {}).filter(([store, m]) => Number(m.sales || m.totalSales || 0) > 0).map(([store, m]) => metricMiniCard(store, `Uber ${periodLabel(m, 'this_week')}`, m.sales || m.totalSales, `${m.orders || '—'} orders · AOV ${fmtMoney2(m.aov || m.averageSpend)} · not POS`)).join('') || '<div class="empty">No Uber WTD snapshot captured yet.</div>'}</div></section>
      <section class="card"><h2>Square MTD / captured period - Frieda’s Pies</h2><div class="grid two">${Object.entries(state.live.square || {}).map(([store, m]) => metricMiniCard(store, `Square ${periodLabel(m, 'captured')}`, m.netSales || m.totalCollected || m.sales, `${m.transactions || '—'} transactions · ${esc(m.period || 'captured period')} · not Uber`)).join('') || '<div class="empty">No Square snapshot captured yet.</div>'}</div></section>
      <section class="card"><h2>Manual live snapshot</h2>${manualSnapshotForm()}</section>`;
  }

  function liveStoreCard(s) {
    const m = s.metrics;
    const pos = m.pos || {};
    const channelAmount = s.name.includes('Pies') ? m.squareSales : m.uberSales;
    return `<article class="action-card"><div class="action-head"><div><strong>${esc(s.name)}</strong><br><span class="muted small">${esc(s.primaryWindow)}</span></div><span class="rag ${ragClass(m.rag)}"><span class="dot ${ragClass(m.rag)}"></span>${m.rag}</span></div>
      <div class="kpi-row"><div class="kpi"><div class="label">POS ${periodLabel(m.pos, m.pos?.sourceView?.includes('screenshot sample') ? 'sample' : 'today')}</div><div class="value">${fmtMoney2(m.posSales)}</div></div><div class="kpi"><div class="label">${channelLabel(s, m)}</div><div class="value">${fmtMoney2(channelAmount)}</div></div><div class="kpi"><div class="label">Captured total*</div><div class="value">${fmtMoney2(m.totalCaptured)}</div></div></div>
      <p class="muted small">Orders: ${pos.orders || '—'} · AOV: ${fmtMoney2(pos.averageSpend || pos.aov)} · Top product: ${esc(pos.topProduct || '—')} · Top category: ${esc(pos.topCategory || '—')}</p>
      <p class="footer-note">${esc(pos.sourceView || 'No live POS synced yet; sample/offline mode may be shown.')} ${s.name.includes('Pies') ? 'Square is a captured-period value, not Uber.' : 'Uber is WTD unless captured as a daily snapshot.'} *Captured total may mix periods.</p></article>`;
  }

  function metricMiniCard(title, label, amount, detail) {
    return `<div class="card compact"><div class="store-title"><h3>${esc(title)}</h3><span class="mini-badge">${esc(label)}</span></div><div class="kpi"><div class="label">Captured sales</div><div class="value">${fmtMoney2(amount)}</div></div><p class="muted small">${esc(detail || '')}</p></div>`;
  }

  function manualSnapshotForm() {
    return `<form id="manualSnapshotForm" class="form-grid"><select class="input" id="snapshotSource"><option value="uberEats">Uber Eats</option><option value="square">Square / Frieda's Pies</option><option value="reportingPOS">Reporting POS manual</option></select><select class="input" id="snapshotStore">${seed.stores.map(s => `<option>${esc(s.name)}</option>`).join('')}</select><input class="input" id="snapshotPeriod" placeholder="Period, e.g. 2026-06-14, this_week, or MTD Jun 2026"/><input class="input" id="snapshotSales" type="number" step="0.01" placeholder="Sales / net sales"/><input class="input" id="snapshotOrders" type="number" step="1" placeholder="Orders / transactions"/><input class="input" id="snapshotAov" type="number" step="0.01" placeholder="AOV / average spend"/><textarea id="snapshotNote" placeholder="Optional note"></textarea><button class="primary-btn">Save snapshot</button><div id="manualSnapshotResult" class="muted small"></div></form>`;
  }

  function renderFredaPriorities() {
    const f = seed.fredaFeedback || {};
    const ops = seed.operationsIntelligence || {};
    const items = f.priorityChanges || [];
    return `<section class="hero-card"><div class="status-row"><span class="badge">Freda feedback</span><span class="mini-badge">Beta 0.2.3</span></div><h2>What Freda wants the assistant to focus on next</h2><p class="muted">${esc(f.summary || 'Feedback captured. The app is being shifted toward early operational warning signals rather than static dashboards.')}</p></section>
      <section class="card"><h2>Priority changes requested</h2><div class="grid two">${items.map(x => `<div class="action-card"><div class="action-head"><strong>${esc(x.area)}</strong><span class="mini-badge">Requested</span></div><p>${esc(x.request)}</p></div>`).join('')}</div></section>
      <section class="card"><h2>Hour-by-hour comparison</h2><p class="muted">${esc(ops.hourlyComparison?.status || '')}</p><ul class="list">${(ops.hourlyComparison?.views || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="footer-note">Next data requirement: reliable busy_hours / ticket-sales hourly extraction by store.</p></section>
      <section class="card"><h2>Sell-out and leftovers tracker</h2><div class="grid two"><div class="card compact"><h3>Sell-out timing</h3><p>${esc(ops.sellOutTracker?.signals?.join(' · ') || '')}</p><p class="footer-note">Rule: ${esc(ops.sellOutTracker?.fomoRule || '')}</p></div><div class="card compact"><h3>Leftovers / first sold out</h3><p>Track what is left over most often, what sells out first, and whether sell-out was planned FOMO or an operational miss.</p></div></div></section>
      <section class="card"><h2>Balls vs rings production mix</h2><p>${esc(ops.ballsRingsMix?.currentAssumption || '')}</p><div class="kpi-row"><div class="kpi"><div class="label">Current seed rule</div><div class="value">65% balls</div></div><div class="kpi"><div class="label">Risk</div><div class="value">Specials</div></div><div class="kpi"><div class="label">Action</div><div class="value" style="font-size:16px">Confirm counts</div></div></div></section>
      <section class="card"><h2>Stock trip planner</h2><p>${esc(ops.stockTripPlanner?.goal || '')}</p><ul class="list">${(ops.stockTripPlanner?.outputs || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>
      <section class="card"><h2>Hiring and training focus</h2><p>${esc(ops.trainingHiringFocus?.status || '')}</p><ul class="list">${(ops.trainingHiringFocus?.focus || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="footer-note">Freda’s note: right staff and training are now the biggest issue, especially after social/pie momentum lifted demand.</p></section>`;
  }

  function renderStores() {
    return `<section class="hero-card"><h2>Stores</h2><p class="muted">The assistant applies different rules by store; live sales are layered on top of the existing operating logic.</p></section><div class="grid">${seed.stores.map(s => renderStoreDetail(s)).join('')}</div>`;
  }

  function renderStoreDetail(s) {
    const m = storeMetrics(s);
    return `<section class="card" id="store-${s.id}"><div class="store-title"><h2>${esc(s.name)}</h2><span class="rag ${ragClass(m.rag)}"><span class="dot ${ragClass(m.rag)}"></span>${m.rag}</span></div><p class="muted">${esc(s.role)}</p><div class="kpi-row"><div class="kpi"><div class="label">Recent avg/day</div><div class="value">${fmtMoney(s.recentAvgDay)}</div></div><div class="kpi"><div class="label">Captured total</div><div class="value">${fmtMoney(m.totalLive)}</div></div><div class="kpi"><div class="label">Open actions</div><div class="value">${mergedWhatsappActions().filter(a => a.store === s.name && a.status !== 'Done').length}</div></div></div><h3>Peak pattern</h3>${renderDayparts(s)}<h3>AI operating rule</h3><p>${esc(s.openingRule)}</p><h3>Manager message draft</h3><p class="muted">${esc(s.managerPrompt)}</p>${s.ticketHistory ? `<p class="footer-note">Ticket history import: ${s.ticketHistory.rows.toLocaleString()} rows, ${esc(s.ticketHistory.dateRange)}. Used for time/product signal.</p>` : ''}</section>`;
  }

  function renderDayparts(s) {
    if (!s.dayparts || !s.dayparts.length) return '<p class="muted">No daypart data yet.</p>';
    const max = Math.max(...s.dayparts.map(x => x.sales || 0), 1);
    return `<div class="bar-wrap">${s.dayparts.map(d => `<div class="bar-row"><span>${esc(d.name)}</span><div class="bar-track"><div class="bar-fill" style="width:${d.sales ? (d.sales / max) * 100 : d.share || 0}%"></div></div><strong>${d.share == null ? '—' : d.share + '%'}</strong></div>`).join('')}</div>`;
  }

  function renderProduction() {
    const total = seed.production.laDonutsTotal || seed.production.byStore.reduce((a, b) => a + b.totalPlan, 0);
    const maxStore = Math.max(...seed.production.byStore.map(x => x.totalPlan), 1);
    const liveCards = seed.stores.map(s => {
      const m = storeMetrics(s);
      const action = productionAction(s, m);
      return `<div class="card compact"><div class="store-title"><h3>${esc(s.name)}</h3><span class="rag ${ragClass(m.rag)}"><span class="dot ${ragClass(m.rag)}"></span>${m.rag}</span></div><p>${esc(action)}</p><p class="muted small">Captured: ${fmtMoney2(m.totalLive)} · Baseline: ${fmtMoney(s.recentAvgDay)}</p></div>`;
    }).join('');
    return `<section class="hero-card"><h2>Sales & Production</h2><p class="muted">Production advice now checks the captured live sales layer before using the production/cook plans.</p></section><section class="card"><h2>Live production risk</h2><div class="grid two">${liveCards}</div></section><section class="card"><h2>L.A. Donuts weekly production plan</h2><div class="kpi-row"><div class="kpi"><div class="label">Week</div><div class="value" style="font-size:18px">${esc(seed.production.weekLabel)}</div></div><div class="kpi"><div class="label">Total plan</div><div class="value">${total.toLocaleString()}</div></div><div class="kpi"><div class="label">Risk</div><div class="value" style="font-size:18px">Reserve</div></div></div><div class="bar-wrap">${seed.production.byStore.map(x => `<div class="bar-row"><span>${esc(x.store)}</span><div class="bar-track"><div class="bar-fill" style="width:${(x.totalPlan / maxStore) * 100}%"></div></div><strong>${x.totalPlan.toLocaleString()}</strong></div>`).join('')}</div></section><section class="card"><h2>Frieda's Pies plan</h2><div class="kpi-row"><div class="kpi"><div class="label">Target bake</div><div class="value">${seed.production.friedasPies.totalTarget.toLocaleString()}</div></div><div class="kpi"><div class="label">Forecast gross</div><div class="value money">${fmtMoney(seed.production.friedasPies.forecastGrossSales)}</div></div><div class="kpi"><div class="label">Square MTD/captured</div><div class="value money">${fmtMoney2(storeMetrics(seed.stores.find(s => s.name.includes('Pies'))).squareSales)}</div></div></div><ul class="list">${seed.production.friedasPies.topProducts.map(p => `<li><strong>${esc(p.product)}</strong><br><span class="muted">${p.targetBake.toLocaleString()} target bake</span></li>`).join('')}</ul></section><section class="card"><h2>Freda production controls</h2><div class="grid two"><div class="card compact"><h3>Balls vs rings</h3><p>Seed rule: specials may now require about 65% balls. Track ball shortage separately from total donut quantity.</p><p class="footer-note">Needs: daily production count by balls/rings and specials usage.</p></div><div class="card compact"><h3>Sell-out vs leftover</h3><p>Track what sells out first and what is left over most often. Planned late sell-out can be strategic FOMO; repeated 3+ hour early sell-out is a production alert.</p></div></div></section><section class="card"><h2>Recent product signals from ticket history</h2><div class="grid">${Object.values(seed.ticketHistory).map(h => `<div class="card compact"><h3>${esc(h.store)}</h3><p class="muted small">${esc(h.dataCaveat)}</p><div class="bar-wrap">${(h.recentTopProducts || []).slice(0, 5).map(p => `<div class="bar-row"><span>${esc(p.name)}</span><div class="bar-track"><div class="bar-fill" style="width:${(p.qty / ((h.recentTopProducts || [{ qty: 1 }])[0].qty || 1)) * 100}%"></div></div><strong>${p.qty}</strong></div>`).join('')}</div></div>`).join('')}</div></section>`;
  }

  function productionAction(s, m) {
    if (s.name === 'Beverly Hills') return m.totalLive && m.ratio > 1 ? 'Demand is above recent daily average. Protect reserve and do not cut weekend production.' : 'Use live POS + Uber before production cuts; BH is scale-sensitive around lunch.';
    if (s.name === 'Penrith') return 'Check cabinet before the 15:00-18:00 peak and protect pie/combo readiness.';
    if (s.name === 'Taren Point') return 'Do not push opening later by default. Confirm sold-out signals and keep early trade protected.';
    return 'Use Square sales plus leftover count before setting net bake.';
  }

  function renderActions() {
    const open = mergedWhatsappActions().filter(a => a.status !== 'Done').sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
    const done = mergedWhatsappActions().filter(a => a.status === 'Done');
    const summaries = [...(seed.whatsapp.summaries || []), ...(state.live.whatsapp?.summaries || [])];
    return `<section class="hero-card"><h2>WhatsApp Actions</h2><p class="muted">Beta 0.2 imports WhatsApp ZIP/TXT exports and turns them into manager follow-up items. It does not scrape WhatsApp Web.</p><div class="kpi-row"><div class="kpi"><div class="label">Open</div><div class="value">${open.length}</div></div><div class="kpi"><div class="label">Done</div><div class="value">${done.length}</div></div><div class="kpi"><div class="label">Groups</div><div class="value">${summaries.length}</div></div></div></section><section class="card"><h2>Upload WhatsApp export</h2><p class="muted">Upload the ZIP or TXT export from the store group. The server extracts stock, equipment, cleaning, closing, photo and manager-action signals.</p><input id="serverUpload" class="file-input" type="file" accept=".zip,.txt"/><div id="serverUploadResult" class="muted small" style="margin-top:8px"></div></section><section class="card"><h2>Store digests</h2><div class="grid">${summaries.slice(-8).map(s => `<div class="card compact"><h3>${esc(s.store)}</h3><p>${esc(s.summary)}</p><p class="muted small">${s.messages} messages · ${s.mediaFiles} media files</p></div>`).join('')}</div></section><section class="card"><h2>Open actions</h2><div class="grid">${open.map(actionCard).join('') || '<div class="empty">No open actions.</div>'}</div></section><section class="card"><h2>Completed</h2><div class="grid">${done.map(actionCard).join('') || '<div class="empty">Nothing marked done yet.</div>'}</div></section>`;
  }

  function actionCard(a) {
    return `<article class="action-card ${a.status === 'Done' ? 'done' : ''}" data-action-id="${esc(a.id)}"><div class="action-head"><div><span class="rag ${ragClass(a.severity)}"><span class="dot ${ragClass(a.severity)}"></span>${esc(a.severity)}</span> <span class="mini-badge">${esc(a.store)}</span> <span class="mini-badge">${esc(a.category)}</span></div><span class="mini-badge">${esc(a.status)}</span></div><div class="summary"><strong>${esc(a.summary)}</strong></div><div class="muted small">Evidence: ${esc(a.evidence)}</div><div class="action-controls"><button class="ghost-btn" data-copy-message="${esc(a.store)}">Draft manager message</button><button class="primary-btn" data-toggle-action="${esc(a.id)}">${a.status === 'Done' ? 'Reopen' : 'Mark done'}</button></div></article>`;
  }

  function renderAssistant() {
    const messages = state.chat.length ? state.chat : [{ role: 'ai', text: assistantAnswer('What needs my attention today?') }];
    const suggestions = ['What needs my attention today?', 'Show live sales by store', 'Which store is underperforming?', 'How much Uber should I add?', 'Draft a message to Taren Point manager', 'How do I make a thickshake?'];
    return `<section class="hero-card"><h2>Ask Freda AI</h2><p class="muted">The assistant now checks POS Today, Uber WTD/daily snapshots and Square MTD/captured-period snapshots first, then falls back to seed analysis, WhatsApp exports and production logic.</p></section><section class="chat-panel"><div id="chatLog" class="chat-log">${messages.map(m => `<div class="bubble ${m.role}">${esc(m.text)}</div>`).join('')}</div><div class="suggestions">${suggestions.map(s => `<button class="suggestion" data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}</div><form id="chatForm" class="chat-form"><input class="input" id="chatInput" placeholder="Ask Freda Ops..." autocomplete="off"/><button class="primary-btn">Send</button></form></section>`;
  }

  function assistantAnswer(q) {
    const query = (q || '').toLowerCase();
    const actions = mergedWhatsappActions().filter(a => a.status !== 'Done').sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
    const stores = seed.stores.map(s => ({ ...s, metrics: storeMetrics(s) }));
    if (query.includes('live') || query.includes('sales')) {
      return stores.map(s => `${s.name}: POS ${fmtMoney2(s.metrics.posSales)}, channel ${fmtMoney2(s.name.includes('Pies') ? s.metrics.squareSales : s.metrics.uberSales)}, captured total ${fmtMoney2(s.metrics.totalLive)}, status ${s.metrics.rag}.`).join('\n') + '\n\nReminder: Uber is separate from POS and is WTD unless a daily snapshot is manually captured from the chart. Square for Frieda’s Pies is not Uber and should be read as MTD/captured period unless a daily export is entered.';
    }
    if (query.includes('attention') || query.includes('today')) return dailyPriorities(stores, actions).map((x, i) => `${i + 1}. ${x}`).join('\n') + `\n\nSource confidence: POS ${state.serverOnline ? 'live when synced' : 'sample/offline'}, Uber/Square MTD/captured/manual, WhatsApp export medium, hiring/training/audit demo.`;
    if (query.includes('hour') || query.includes('sell out') || query.includes('sold out')) return `Freda priority: compare hour-by-hour against the same weekday last week and the last 4-week same-day average. Track sell-out time, products sold out first, leftovers, and whether it was planned FOMO or an early production miss.`;
    if (query.includes('balls') || query.includes('rings') || query.includes('production mix')) return `Freda priority: total donut count is not enough. Specials may now need around 65% balls. Track ball/ring production separately and flag ball shortage before weekend decorating.`;
    if (query.includes('stock') || query.includes('driver') || query.includes('trip')) return `Freda priority: use WhatsApp stock-order photos/emails to estimate weekly stock usage and plan two stock trips instead of daily driver runs. Output should be Trip 1 pick list, Trip 2 pick list, and urgent exceptions.`;
    if (query.includes('training') || query.includes('staff') || query.includes('hiring')) return `Freda priority: right staff and consistent training are the biggest issues. Next build needs current job roles, hiring questions, SOPs and training docs so the app can help screen, train and track staff properly.`;
    if (query.includes('uber')) return `Uber is not included in reporting.site POS. Current captured Uber WTD/daily snapshot:\n${Object.entries(state.live.uberEats || {}).map(([s, m]) => `- ${s}: ${fmtMoney2(m.sales || m.totalSales)} · ${m.orders || '—'} orders · AOV ${fmtMoney2(m.aov || m.averageSpend)}`).join('\n') || 'No Uber snapshot yet.'}`;
    if (query.includes('underperform')) {
      const ranked = stores.filter(s => s.metrics.ratio != null).sort((a, b) => a.metrics.ratio - b.metrics.ratio);
      if (ranked[0]) return `${ranked[0].name} is lowest against recent average in the captured data (${pct(ranked[0].metrics.ratio * 100)} of avg). Check whether the source is complete before acting. Taren Point remains the store with the most execution risk if stock/display signals are open.`;
      return `No complete live comparison yet. Sync reporting.site POS first, then add Uber/Square snapshots. Operationally, Taren Point is still the highest execution-risk store from the seeded analysis.`;
    }
    if (query.includes('taren') || query.includes('tp')) return `Taren Point: keep 6:00am as default, confirm stock/display from WhatsApp, and do not move to 8:00am as normal setting. Draft: “Can you please confirm current stock, any sold-out risk, and send cabinet/closing photos today?”`;
    if (query.includes('beverly') || query.includes('bh')) return `Beverly Hills: volume engine. Release reserve before the 12:00-16:00 window and add Uber to POS before judging total demand. Weekend production should not be reduced just because the store opens later.`;
    if (query.includes('penrith')) return `Penrith: live POS test store. Captured POS is ${fmtMoney2(storeMetrics(seed.stores.find(s => s.name === 'Penrith')).posSales)}. Protect the 15:00-18:00 peak and check cabinet before 3pm.`;
    if (query.includes('frieda') || query.includes('pie') || query.includes('square')) return `Frieda’s Pies: use Square snapshot/export plus leftover count. Square MTD/captured period is ${fmtMoney2(storeMetrics(seed.stores.find(s => s.name.includes('Pies'))).squareSales)}. This is not Uber and should be treated as MTD/captured period unless a daily Square export is entered. Do not trust net bake without leftovers.`;
    if (query.includes('thickshake') || query.includes('milkshake')) { const sop = seed.sops.find(s => s.id === 'SOP-THICKSHAKE'); return `${sop.title}:\n${sop.steps.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\nStatus: ${sop.status}`; }
    if (query.includes('sop') || query.includes('cabinet') || query.includes('close')) { const sop = query.includes('close') ? seed.sops.find(s => s.id === 'SOP-CLOSE') : seed.sops.find(s => s.id === 'SOP-CABINET'); return `${sop.title}:\n${sop.steps.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\nStatus: ${sop.status}`; }
    if (query.includes('message') || query.includes('draft')) return `Draft message:\n“Hi team, can you please confirm today’s cabinet status, any stockout risk, and send the next photo update? If anything is low before peak trade, please flag it now so we can fix it before customers see it.”`;
    if (query.includes('hire') || query.includes('candidate')) { const c = seed.candidates[0]; return `Strongest demo candidate: ${c.name}, ${c.score}/100, ${c.recommendation}. Reason: ${c.summary}. Risk flags: ${c.flags.join(', ')}.`; }
    return `I can answer live sales, store status, WhatsApp actions, production, SOPs, hiring, audits and competitor questions. Try: “Show live sales by store” or “What needs my attention today?”`;
  }

  function renderTraining() {
    return `<section class="hero-card"><h2>Training & SOP</h2><p class="muted">Draft SOP answers are usable in beta but need Freda approval before being treated as final policy.</p><input id="sopSearch" class="input" placeholder="Search SOPs: thickshake, cabinet, closing, Penrith, Taren Point..."/></section><section id="sopResults" class="card"><h2>SOP results</h2>${sopResultsHtml('')}</section><section class="card"><h2>Training modules</h2><div class="grid">${seed.trainingModules.map(m => `<div class="card compact"><div class="store-title"><h3>${esc(m.code)} · ${esc(m.title)}</h3><span class="mini-badge">${esc(m.status)}</span></div><p class="muted">${esc(m.tier)}</p><div class="bar-row"><span>Completion</span><div class="bar-track"><div class="bar-fill" style="width:${m.completion}%"></div></div><strong>${m.completion}%</strong></div><p class="small muted">${esc(m.due)}</p></div>`).join('')}</div></section><section class="card"><h2>Quick quiz</h2><p>When should Beverly Hills release top-up reserve?</p><button class="quiz-option" data-quiz="wrong">After the cabinet becomes thin.</button><button class="quiz-option" data-quiz="correct">Before the 12:00-16:00 peak window.</button><button class="quiz-option" data-quiz="wrong">Only after closing.</button><div id="quizFeedback" class="muted small"></div></section>`;
  }

  function sopResultsHtml(query) {
    const q = query.toLowerCase().trim();
    const results = seed.sops.filter(s => !q || s.title.toLowerCase().includes(q) || s.tags.join(' ').toLowerCase().includes(q) || s.store.toLowerCase().includes(q));
    if (!results.length) return '<div class="empty">No SOP found. Try cabinet, thickshake, closing, Penrith or Taren Point.</div>';
    return `<div class="grid">${results.map(s => `<div class="card compact"><div class="store-title"><h3>${esc(s.title)}</h3><span class="mini-badge">${esc(s.store)}</span></div><ol>${s.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol><p class="footer-note">${esc(s.status)}</p></div>`).join('')}</div>`;
  }

  function renderHiring() {
    return `<section class="hero-card"><h2>Hiring Assistant</h2><p class="muted">Demo flow is ready. Replace scoring once current job roles and hiring questions are confirmed.</p></section><section class="card"><h2>Shortlist</h2><div class="grid">${seed.candidates.map(c => `<div class="card compact"><div class="store-title"><div><h3>${esc(c.name)} · ${c.score}/100</h3><p class="muted small">${esc(c.store)} · ${esc(c.role)}</p></div><span class="rag ${ragClass(c.risk)}"><span class="dot ${ragClass(c.risk)}"></span>${esc(c.recommendation)}</span></div><p>${esc(c.summary)}</p><p class="muted small">Flags: ${c.flags.map(esc).join(', ')}</p><details><summary><strong>Interview questions</strong></summary><ol>${c.questions.map(q => `<li>${esc(q)}</li>`).join('')}</ol></details></div>`).join('')}</div></section><section class="card"><h2>Candidate application form preview</h2><form class="form-grid" id="candidateForm"><input class="input" placeholder="Candidate name" required/><select class="input"><option>Preferred store: Penrith</option><option>Beverly Hills</option><option>Taren Point</option></select><textarea placeholder="Availability, transport, experience and why L.A. Donuts?"></textarea><button class="primary-btn">Score demo candidate</button><div id="candidateResult" class="muted"></div></form></section>`;
  }

  function renderAudits() {
    const open = state.audits.filter(a => a.status !== 'Done');
    return `<section class="hero-card"><h2>Store Audits</h2><p class="muted">Photo upload and scoring workflow is present. Real AI vision scoring waits for reference photos and OpenAI vision setup.</p></section><section class="card"><h2>Submit opening audit</h2><form id="auditForm" class="form-grid"><select class="input" id="auditStore">${seed.stores.map(s => `<option>${esc(s.name)}</option>`).join('')}</select><select class="input" id="auditScore"><option value="9">9 - Green</option><option value="7">7 - Amber</option><option value="4">4 - Red</option></select><input class="file-input" type="file" accept="image/*"/><textarea id="auditComment" placeholder="Short comment / issue found"></textarea><button class="primary-btn">Create audit record</button></form></section><section class="card"><h2>Audit records</h2><div class="grid">${open.map(a => `<div class="action-card"><div class="action-head"><div><span class="rag ${ragClass(a.rag)}"><span class="dot ${ragClass(a.rag)}"></span>${esc(a.rag)}</span> <span class="mini-badge">${esc(a.store)}</span> <span class="mini-badge">${esc(a.type)}</span></div><strong>${a.score}/10</strong></div><p>${esc(a.comment)}</p><button class="primary-btn" data-close-audit="${esc(a.id)}">Mark resolved</button></div>`).join('') || '<div class="empty">No open audits.</div>'}</div></section>`;
  }

  function renderMarket() {
    return `<section class="hero-card"><h2>Market Intelligence</h2><p class="muted">Competitor/trend files become Freda-ready commercial actions.</p><div class="kpi-row"><div class="kpi"><div class="label">Tracked</div><div class="value">${seed.market.boardPack.competitorsTracked}</div></div><div class="kpi"><div class="label">Completeness</div><div class="value">${seed.market.boardPack.averageDataCompleteness}%</div></div><div class="kpi"><div class="label">Threat</div><div class="value" style="font-size:15px">${esc(seed.market.boardPack.biggestDirectThreat)}</div></div></div></section><section class="card"><h2>Top competitors</h2><div class="grid">${seed.market.topCompetitors.map(c => `<div class="card compact"><div class="store-title"><h3>${esc(c.name)}</h3><span class="mini-badge">${c.score}</span></div><p class="muted small">${esc(c.category)}</p><p>${esc(c.why)}</p></div>`).join('')}</div></section><section class="card"><h2>Opportunities</h2><div class="grid">${seed.market.opportunities.map(o => `<div class="action-card"><div class="action-head"><span class="rag ${o.priority === 'High' ? 'Red' : 'Amber'}"><span class="dot ${o.priority === 'High' ? 'Red' : 'Amber'}"></span>${esc(o.priority)}</span><span class="mini-badge">Score ${o.score}</span></div><strong>${esc(o.title)}</strong><p>${esc(o.action)}</p></div>`).join('')}</div><p class="footer-note">${esc(seed.market.guardrail)}</p></section>`;
  }

  function renderData() {
    const status = state.live.connectorStatus || {};
    const bookmarklet = `javascript:(()=>{fetch('${location.origin}/api/bookmarklet/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:location.href,title:document.title,text:document.body.innerText})}).then(()=>alert('Captured for Freda Ops')).catch(e=>alert('Capture failed: '+e.message));})();`;
    return `<section class="hero-card"><h2>Data & Connectors</h2><p class="muted">Beta 0.2.3 is live-sales capable and diagnostic. POS can sync from reporting.site with a secure session env var. Uber/Square can be captured manually, via export, or later through safer API/OAuth paths.</p><div class="action-controls"><button class="primary-btn" id="syncReportingBtn">Sync reporting.site POS</button><button class="ghost-btn" id="refreshLiveBtn">Refresh summary</button></div></section><section class="card"><h2>Connector status</h2>${seed.sourceStatus.map(s => `<div class="source-row"><div><strong>${esc(s.source)}</strong><br><span class="muted small">${esc(s.notes)}</span></div><span class="mini-badge">${esc(s.status)} · ${esc(s.confidence)}</span></div>`).join('')}<hr/><p class="muted small">Last reporting sync: ${esc(status.reportingSite?.lastSync || 'not synced in this browser yet')} ${status.reportingSite?.error ? '· Error: ' + esc(status.reportingSite.error) : ''}</p>${reportingDiagnosticsHtml(status)}</section><section class="card"><h2>Manual Uber / Square / POS snapshot</h2>${manualSnapshotForm()}</section><section class="card"><h2>WhatsApp export upload</h2><input id="serverUpload" class="file-input" type="file" accept=".zip,.txt"/><div id="serverUploadResult" class="muted small" style="margin-top:8px"></div></section><section class="card"><h2>Browser capture bookmarklet</h2><p class="muted">For pages where login is difficult, open Uber/Square/reporting page in the browser and run this capture bookmarklet. Best on desktop first.</p><textarea readonly class="input" style="min-height:120px">${esc(bookmarklet)}</textarea><p class="footer-note">This posts page text to this app server and parses KPI cards. It avoids saving passwords in the app.</p></section><section class="card"><h2>Local upload test</h2><p class="muted">Fallback browser-only summary for CSV/TXT files.</p><input id="dataUpload" class="file-input" type="file" multiple accept=".csv,.txt,.json"/><div id="uploadResults" class="grid" style="margin-top:12px">${state.uploads.map(uploadCard).join('')}</div></section>`;
  }

  function reportingDiagnosticsHtml(status) {
    const stores = status.reportingSite?.stores || [];
    if (!stores.length) return '<p class="footer-note">No reporting.site diagnostics yet. Press Sync reporting.site POS.</p>';
    return `<div class="grid" style="margin-top:12px">${stores.map(s => `<div class="source-row"><div><strong>${esc(s.store)}</strong><br><span class="muted small">${s.ok ? 'Parsed' : 'Needs manual/browser capture'}${s.errors?.length ? ' · ' + esc((s.errors[0]?.message || '').slice(0, 120)) : ''}</span></div><span class="mini-badge">${s.ok ? 'OK' : 'Check'}</span></div>`).join('')}</div>`;
  }

  function uploadCard(u) { return `<div class="card compact"><h3>${esc(u.name)}</h3><p class="muted small">${esc(u.type)} · ${esc(u.when)}</p><p>${esc(u.summary)}</p></div>`; }

  function wireScreenEvents() {
    document.querySelectorAll('#refreshLiveBtn').forEach(btn => btn.addEventListener('click', () => loadLiveSummary(true)));
    document.querySelectorAll('#syncReportingBtn').forEach(btn => btn.addEventListener('click', syncReporting));
    document.querySelectorAll('[data-toggle-action]').forEach(btn => btn.addEventListener('click', async () => {
      const id = btn.dataset.toggleAction;
      const local = state.actions.find(x => x.id === id);
      if (local) { local.status = local.status === 'Done' ? 'Open' : 'Done'; saveActions(); }
      if (state.serverOnline && String(id).startsWith('WA-')) {
        try { const body = await api('/api/actions/' + encodeURIComponent(id) + '/status', { method: 'POST', body: JSON.stringify({ status: 'Done' }) }); state.live = body.live || state.live; } catch (_) {}
      }
      render();
    }));
    document.querySelectorAll('[data-copy-message]').forEach(btn => btn.addEventListener('click', () => { const store = btn.dataset.copyMessage; const s = seed.stores.find(x => x.name === store) || seed.stores[0]; const msg = `Hi ${store} team, ${s.managerPrompt}`; navigator.clipboard?.writeText(msg); alert('Manager message copied:\n\n' + msg); }));
    document.querySelectorAll('[data-open-assistant]').forEach(btn => btn.addEventListener('click', () => { const q = btn.dataset.openAssistant; state.activeTab = 'assistant'; localStorage.setItem('freda.activeTab', state.activeTab); renderTabs(); state.chat.push({ role: 'user', text: q }, { role: 'ai', text: assistantAnswer(q) }); saveChat(); render(); }));
    const chatForm = $('chatForm');
    if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); const input = $('chatInput'); const q = input.value.trim(); if (!q) return; state.chat.push({ role: 'user', text: q }, { role: 'ai', text: assistantAnswer(q) }); saveChat(); input.value = ''; render(); setTimeout(() => { const log = $('chatLog'); if (log) log.scrollTop = log.scrollHeight; }, 30); });
    document.querySelectorAll('[data-suggest]').forEach(btn => btn.addEventListener('click', () => { const q = btn.dataset.suggest; state.chat.push({ role: 'user', text: q }, { role: 'ai', text: assistantAnswer(q) }); saveChat(); render(); }));
    const sopSearch = $('sopSearch');
    if (sopSearch) sopSearch.addEventListener('input', e => { $('sopResults').innerHTML = '<h2>SOP results</h2>' + sopResultsHtml(e.target.value); });
    document.querySelectorAll('[data-quiz]').forEach(btn => btn.addEventListener('click', () => { document.querySelectorAll('[data-quiz]').forEach(b => b.classList.remove('correct', 'wrong')); if (btn.dataset.quiz === 'correct') { btn.classList.add('correct'); $('quizFeedback').textContent = 'Correct. BH reserve should be released before the 12:00-16:00 peak window.'; } else { btn.classList.add('wrong'); $('quizFeedback').textContent = 'Not quite. The point is to act before the cabinet is already thin.'; } }));
    const candidateForm = $('candidateForm');
    if (candidateForm) candidateForm.addEventListener('submit', e => { e.preventDefault(); $('candidateResult').textContent = 'Demo candidate scored 73/100: MAYBE. Use real questions once current roles and screening questions are confirmed.'; });
    const auditForm = $('auditForm');
    if (auditForm) auditForm.addEventListener('submit', e => { e.preventDefault(); const score = Number($('auditScore').value); const rag = score >= 8 ? 'Green' : score >= 5 ? 'Amber' : 'Red'; state.audits.unshift({ id: 'AUD-' + Date.now(), store: $('auditStore').value, type: 'Opening', score, rag, comment: $('auditComment').value || 'Photo placeholder submitted. AI scoring not enabled yet.', status: 'Open' }); saveAudits(); render(); });
    document.querySelectorAll('[data-close-audit]').forEach(btn => btn.addEventListener('click', () => { const a = state.audits.find(x => x.id === btn.dataset.closeAudit); if (a) a.status = 'Done'; saveAudits(); render(); }));
    const dataUpload = $('dataUpload');
    if (dataUpload) dataUpload.addEventListener('change', handleLocalUploads);
    const serverUpload = $('serverUpload');
    if (serverUpload) serverUpload.addEventListener('change', handleServerUpload);
    const manualSnapshot = $('manualSnapshotForm');
    if (manualSnapshot) manualSnapshot.addEventListener('submit', handleManualSnapshot);
  }

  async function syncReporting() {
    state.syncing = true; render();
    try {
      const body = await api('/api/live/reporting/sync', { method: 'POST', body: '{}' });
      state.live = body.live || state.live;
      state.serverOnline = true;
      const diag = body.result?.diagnostic;
      const stores = body.result?.details || [];
      const statusLine = diag ? `${diag.storesWithMetrics || 0}/${diag.storesAttempted || stores.length} stores returned usable POS KPIs.` : 'Sync response received.';
      const detailLine = stores.map(s => `${s.store}: ${s.hasMetrics ? 'KPI parsed' : 'no KPI parsed'}`).join('\n');
      alert('Reporting.site sync finished.\n' + statusLine + (detailLine ? '\n\n' + detailLine : ''));
    } catch (error) {
      alert('Reporting.site sync did not return usable POS data yet. Check REPORTING_PHPSESSID, then use Data → browser capture/manual snapshot if pages are JavaScript-rendered.\n\n' + error.message);
      state.lastError = error.message;
    } finally {
      state.syncing = false; render();
    }
  }

  async function handleManualSnapshot(e) {
    e.preventDefault();
    const payload = { source: $('snapshotSource').value, store: $('snapshotStore').value, period: $('snapshotPeriod').value, sales: $('snapshotSales').value, totalSales: $('snapshotSales').value, netSales: $('snapshotSales').value, orders: $('snapshotOrders').value, transactions: $('snapshotOrders').value, aov: $('snapshotAov').value, averageSpend: $('snapshotAov').value, note: $('snapshotNote').value };
    try {
      const body = await api('/api/live/manual-snapshot', { method: 'POST', body: JSON.stringify(payload) });
      state.live = body.live || state.live;
      state.serverOnline = true;
      $('manualSnapshotResult').textContent = 'Snapshot saved. Use period 2026-06-14 for daily Uber, this_week for Uber WTD, or MTD Jun 2026 for Square.';
      render();
    } catch (error) {
      $('manualSnapshotResult').textContent = 'Could not save to server. Saved locally in this browser only.';
      const store = payload.store;
      if (payload.source === 'uberEats') state.live.uberEats = { ...(state.live.uberEats || {}), [store]: { sales: Number(payload.sales), orders: Number(payload.orders), aov: Number(payload.aov), period: payload.period, sourceView: 'local manual entry' } };
      else if (payload.source === 'square') state.live.square = { ...(state.live.square || {}), [store]: { netSales: Number(payload.sales), transactions: Number(payload.orders), period: payload.period, sourceView: 'local manual entry' } };
      else state.live.reportingPOS = { ...(state.live.reportingPOS || {}), [store]: { totalSales: Number(payload.sales), orders: Number(payload.orders), averageSpend: Number(payload.aov), period: payload.period, sourceView: 'local manual entry' } };
      render();
    }
  }

  async function handleServerUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const out = $('serverUploadResult');
    out.textContent = 'Uploading and parsing...';
    const form = new FormData(); form.append('file', file);
    try {
      const res = await fetch(apiBase + '/api/uploads', { method: 'POST', body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Upload failed');
      state.live = body.live || state.live;
      out.textContent = body.parsed ? body.parsed.summary : 'File uploaded.';
      render();
    } catch (error) {
      out.textContent = 'Server upload failed. Use local upload fallback or start the server. ' + error.message;
    }
  }

  function handleLocalUploads(e) {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || '');
        let summary = '';
        if (file.name.toLowerCase().endsWith('.csv')) { const lines = text.split(/\r?\n/).filter(Boolean); const header = lines[0] || ''; summary = `${lines.length - 1} data rows detected. Headers: ${header.slice(0, 140)}`; }
        else if (file.name.toLowerCase().endsWith('.txt')) { const sold = (text.match(/sold out/gi) || []).length; const close = (text.match(/closing|leftover/gi) || []).length; const clean = (text.match(/clean|rubbish/gi) || []).length; summary = `WhatsApp-style text: ${sold} sold-out mentions, ${close} closing/leftover mentions, ${clean} cleanliness mentions.`; }
        else summary = `Loaded ${Math.round(file.size / 1024)} KB. Parser placeholder only.`;
        state.uploads.unshift({ name: file.name, type: file.type || 'file', when: new Date().toLocaleString('en-AU'), summary });
        state.uploads = state.uploads.slice(0, 8); localStorage.setItem('freda.uploads', JSON.stringify(state.uploads)); render();
      };
      reader.readAsText(file);
    });
  }

  function setupPwaInstall() {
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; const btn = $('installBtn'); btn.hidden = false; btn.onclick = async () => { btn.hidden = true; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; }; });
    window.addEventListener('appinstalled', () => { $('installBtn').hidden = true; });
  }

  init();
})();
