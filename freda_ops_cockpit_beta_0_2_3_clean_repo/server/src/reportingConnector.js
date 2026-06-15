import * as cheerio from 'cheerio';

const DEFAULT_STORES = [
  { id: 'bh', name: 'Beverly Hills', slugEnv: 'REPORTING_STORE_SLUG_BH', fallbackSlug: 'ladonuts_beverlyhills' },
  { id: 'pen', name: 'Penrith', slugEnv: 'REPORTING_STORE_SLUG_PEN', fallbackSlug: 'ladonuts_penrith' },
  { id: 'tp', name: 'Taren Point', slugEnv: 'REPORTING_STORE_SLUG_TP', fallbackSlug: 'ladonuts_tarenpoint' }
];

const DEFAULT_VIEWS = [
  // Keep server sync intentionally light. The full reporting.site pages can be slow
  // and JavaScript-rendered; too many sequential fetches caused browser timeouts.
  'daily_sales.php',
  'dashboard.php',
  'eod_summary.php',
  'busy_hours.php',
  'ticket_sales.php'
];

// reporting.site pages often render KPI cards with JavaScript. These endpoints are
// visible in the dashboard directory listing and are tried after the normal pages.
// They are deliberately broad and non-destructive: if an endpoint is missing, the
// connector records diagnostics and moves on.
const ENDPOINT_CANDIDATES = [
  'get_data.php',
  'get_data_period.php',
  'fetch_data.php'
];

export function getReportingConfig(env = process.env) {
  const baseUrl = (env.REPORTING_BASE_URL || 'https://reporting.site').replace(/\/$/, '');
  const views = (env.REPORTING_VIEWS || DEFAULT_VIEWS.join(','))
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
  const stores = DEFAULT_STORES.map(s => ({
    id: s.id,
    name: s.name,
    slug: env[s.slugEnv] || s.fallbackSlug
  }));
  return { baseUrl, views, stores };
}

export function buildReportingHeaders(env = process.env) {
  const rawSession = String(env.REPORTING_PHPSESSID || '').trim().replace(/^PHPSESSID=/i, '');
  const rawCookie = String(env.REPORTING_COOKIE || '').trim();
  const cookieHeader = rawCookie || (rawSession ? `PHPSESSID=${rawSession}` : '');
  if (!cookieHeader) {
    return { error: 'Missing REPORTING_PHPSESSID or REPORTING_COOKIE in server/.env' };
  }
  return {
    headers: {
      Cookie: cookieHeader,
      'User-Agent': 'Mozilla/5.0 FredaOpsCockpit/0.2.6 (+https://la-donuts.local)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-AU,en;q=0.9,fr;q=0.8',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache'
    }
  };
}

export async function syncReportingSite(env = process.env, fetchImpl = fetch) {
  const config = getReportingConfig(env);
  const headerResult = buildReportingHeaders(env);
  const startedAt = new Date().toISOString();
  if (headerResult.error) {
    return {
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      error: headerResult.error,
      reportingPOS: {},
      details: []
    };
  }

  const details = [];
  const reportingPOS = {};
  let storesWithMetrics = 0;

  const timeoutMs = Number(env.REPORTING_FETCH_TIMEOUT_MS || 4500);
  const deepSync = String(env.REPORTING_DEEP_SYNC || '').toLowerCase() === 'true';

  for (const store of config.stores) {
    const storeResult = {
      store: store.name,
      slug: store.slug,
      ok: true,
      hasMetrics: false,
      views: {},
      errors: []
    };

    for (const view of config.views) {
      const url = `${config.baseUrl}/${store.slug}/dashboard/${view}`;
      const parsed = await fetchAndParse(url, view, headerResult.headers, fetchImpl, timeoutMs);
      storeResult.views[view] = parsed;
      if (!parsed.ok) {
        storeResult.ok = false;
        storeResult.errors.push({ view, url, message: parsed.message || 'Fetch/parse failed' });
      }
      if (hasNumericMetric(parsed.metrics)) storeResult.hasMetrics = true;
    }

    // Try AJAX/data endpoints with common date parameter names. This is the main
    // Beta 0.2.6 improvement for reporting.site sync.
    const endpointResults = await tryReportingEndpoints(config.baseUrl, store.slug, headerResult.headers, fetchImpl, env);
    for (const result of endpointResults) {
      storeResult.views[result.view] = result;
      if (!result.ok) storeResult.errors.push({ view: result.view, url: result.url, message: result.message || 'Endpoint did not parse' });
      if (hasNumericMetric(result.metrics)) storeResult.hasMetrics = true;
    }

    const summary = summarizeReportingStore(store.name, storeResult.views);
    if (hasUsefulSummary(summary)) {
      storeResult.hasMetrics = true;
      storesWithMetrics += 1;
    } else if (storeResult.ok) {
      storeResult.ok = false;
      storeResult.errors.push({
        view: 'summary',
        url: `${config.baseUrl}/${store.slug}/dashboard/`,
        message: 'Pages fetched, but no sales KPI was parsed. This reporting.site view may inject data with browser JavaScript. Use Data -> browser capture/manual snapshot while endpoint mapping is tightened.'
      });
    }
    summary.connectorDiagnostic = {
      hasMetrics: storeResult.hasMetrics,
      successfulViews: Object.keys(storeResult.views).filter(v => storeResult.views[v]?.ok),
      metricViews: Object.entries(storeResult.views)
        .filter(([, v]) => hasNumericMetric(v?.metrics))
        .map(([view, v]) => ({ view, keys: Object.keys(v.metrics || {}).filter(k => typeof v.metrics[k] === 'number') }))
    };
    // Only merge usable summaries. Failed syncs should not overwrite existing seed/manual values.
    if (hasUsefulSummary(summary)) reportingPOS[store.name] = summary;
    details.push(storeResult);
  }

  const ok = storesWithMetrics > 0;
  return {
    ok,
    startedAt,
    finishedAt: new Date().toISOString(),
    error: ok ? null : 'Reporting.site pages were reached but no POS sales KPI was parsed. Use browser capture/manual snapshot, or check that the server session can access the same dashboard data as the browser.',
    reportingPOS,
    details,
    diagnostic: { storesWithMetrics, storesAttempted: config.stores.length }
  };
}


async function fetchAndParse(url, view, headers, fetchImpl, timeoutMs = 4500) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetchImpl(url, { headers, redirect: 'follow', signal: controller.signal });
    clearTimeout(timer);
    const text = await response.text();
    const firstChunk = text.slice(0, 1600);
    const looksLoggedOut = response.url.toLowerCase().includes('login') || /login|password|sign\s*in|se connecter|mot de passe/i.test(firstChunk);
    if (!response.ok || looksLoggedOut) {
      const message = looksLoggedOut ? 'Auth failed or session expired' : `HTTP ${response.status}`;
      return { ok: false, view, url, message, status: response.status, fetchedAt: new Date().toISOString(), rawTextPreview: firstChunk };
    }
    return parseReportingAny(view, text, url, response.headers.get('content-type') || '');
  } catch (error) {
    return { ok: false, view, url, message: error.message, fetchedAt: new Date().toISOString() };
  }
}

async function tryReportingEndpoints(baseUrl, slug, headers, fetchImpl, env = process.env, timeoutMs = 4500) {
  const today = env.REPORTING_DATE || australiaDate();
  const paramsList = [
    '',
    `?date=${encodeURIComponent(today)}`,
    `?start_date=${encodeURIComponent(today)}&end_date=${encodeURIComponent(today)}`,
    `?from=${encodeURIComponent(today)}&to=${encodeURIComponent(today)}`,
    `?from_date=${encodeURIComponent(today)}&to_date=${encodeURIComponent(today)}`,
    `?range=today`,
    `?period=today`
  ];
  const results = [];
  for (const endpoint of ENDPOINT_CANDIDATES) {
    for (const qs of paramsList) {
      const view = `endpoint:${endpoint}${qs || ''}`;
      const url = `${baseUrl}/${slug}/dashboard/${endpoint}${qs}`;
      const parsed = await fetchAndParse(url, view, headers, fetchImpl, timeoutMs);
      results.push(parsed);
      if (hasNumericMetric(parsed.metrics) || hasHourlyRows(parsed)) {
        // Keep trying a few more endpoints, but avoid excessive calls once one useful response exists.
        break;
      }
    }
  }
  return results;
}

function parseReportingAny(view, text, url, contentType = '') {
  const trimmed = String(text || '').trim();
  if (contentType.includes('json') || /^[\[{]/.test(trimmed)) {
    try {
      const data = JSON.parse(trimmed);
      const flatText = flattenJson(data).join(' ');
      const metrics = { ...extractMetrics(view, flatText), ...extractMetricsFromJson(data) };
      const hourlyRows = extractHourlyRowsFromJson(data);
      return { ok: true, view, url, title: 'JSON/data endpoint', metrics, hourlyRows, rawTextPreview: trimmed.slice(0, 3000), fetchedAt: new Date().toISOString() };
    } catch (_) {
      // fall through to HTML/text parser
    }
  }
  const parsed = parseReportingPage(view, text, url);
  parsed.hourlyRows = extractHourlyRowsFromText(parsed.rawTextPreview || text);
  return parsed;
}

function flattenJson(value, out = []) {
  if (value == null) return out;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') out.push(String(value));
  else if (Array.isArray(value)) value.forEach(v => flattenJson(v, out));
  else if (typeof value === 'object') Object.entries(value).forEach(([k, v]) => { out.push(k); flattenJson(v, out); });
  return out;
}

function extractMetricsFromJson(data) {
  const metrics = {};
  function walk(obj, parentKey = '') {
    if (obj == null) return;
    if (Array.isArray(obj)) return obj.forEach(v => walk(v, parentKey));
    if (typeof obj !== 'object') return;
    for (const [key, val] of Object.entries(obj)) {
      const k = String(key).toLowerCase();
      const n = toNumber(val);
      if (n != null) {
        if (/gross.*sale|gross.*revenue/.test(k)) metrics.grossSales ??= n;
        else if (/net.*sale|net.*revenue/.test(k)) metrics.netSales ??= n;
        else if (/total.*sale|total.*revenue|sales_total|revenue/.test(k)) metrics.totalSales ??= n;
        else if (/order|ticket|transaction/.test(k)) metrics.orders ??= n;
        else if (/aov|average.*spend|average.*sale|avg.*ticket/.test(k)) metrics.averageSpend ??= n;
        else if (/cash/.test(k)) metrics.cash ??= n;
        else if (/card|eftpos/.test(k)) metrics.card ??= n;
        else if (/online/.test(k)) metrics.online ??= n;
      }
      walk(val, k);
    }
  }
  walk(data);
  return metrics;
}

function extractHourlyRowsFromJson(data) {
  const rows = [];
  function walk(obj) {
    if (obj == null) return;
    if (Array.isArray(obj)) return obj.forEach(walk);
    if (typeof obj !== 'object') return;
    const keys = Object.keys(obj).reduce((a, k) => ({ ...a, [k.toLowerCase()]: k }), {});
    const hourKey = keys.hour || keys.time || keys.label || keys.period;
    const salesKey = keys.sales || keys.revenue || keys.total || keys.amount || keys.net_sales || keys.total_sales;
    if (hourKey && salesKey) {
      const hour = String(obj[hourKey]);
      const sales = toNumber(obj[salesKey]);
      if (sales != null && /\d{1,2}(:\d{2})?|am|pm/i.test(hour)) rows.push({ hour, sales });
    }
    Object.values(obj).forEach(walk);
  }
  walk(data);
  return rows.slice(0, 48);
}

function extractHourlyRowsFromText(text) {
  const rows = [];
  const t = String(text || '');
  const regex = /\b(\d{1,2}:00|\d{1,2}\s*(?:am|pm))\b[^$\d]{0,40}\$?\s*([\d,]+(?:\.\d{1,2})?)/gi;
  let m;
  while ((m = regex.exec(t)) && rows.length < 48) rows.push({ hour: m[1].replace(/\s+/g, ''), sales: toNumber(m[2]) });
  return rows;
}

function hasHourlyRows(parsed = {}) {
  return Array.isArray(parsed.hourlyRows) && parsed.hourlyRows.length > 0;
}

export function parseReportingPage(view, html, url = '') {
  const $ = cheerio.load(html);
  const title = $('title').text().trim();
  const scriptsText = $('script').map((_, el) => $(el).html() || '').get().join(' ');
  $('script, style, noscript').remove();
  const bodyText = normalize($('body').text());
  const combined = normalize(`${bodyText} ${scriptsText.slice(0, 200000)}`);
  const tables = parseTables($);
  return {
    ok: true,
    view,
    url,
    title,
    metrics: extractMetrics(view, combined),
    tables: tables.slice(0, 4),
    rawTextPreview: combined.slice(0, 3000),
    fetchedAt: new Date().toISOString()
  };
}

function parseTables($) {
  const tables = [];
  $('table').each((_, table) => {
    const rows = [];
    $(table).find('tr').each((__, tr) => {
      const cells = [];
      $(tr).find('th,td').each((___, cell) => {
        cells.push(normalize($(cell).text()).slice(0, 120));
      });
      if (cells.length) rows.push(cells);
    });
    if (rows.length) tables.push(rows.slice(0, 30));
  });
  return tables;
}

function extractMetrics(view, text) {
  const t = text.replace(/\s+/g, ' ');
  const metrics = {};

  const patterns = [
    ['grossSales', /GROSS\s+SALES\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['grossSales', /\$\s*([\d,]+(?:\.\d{1,2})?)\s*GROSS\s+SALES/i],
    ['netSales', /NET\s+SALES\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['netSales', /\$\s*([\d,]+(?:\.\d{1,2})?)\s*NET\s+SALES/i],
    ['totalSales', /TOTAL\s+SALES\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['totalSales', /\$\s*([\d,]+(?:\.\d{1,2})?)\s*TOTAL\s+SALES/i],
    ['totalRevenue', /TOTAL\s+REVENUE\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['totalRevenue', /\$\s*([\d,]+(?:\.\d{1,2})?)\s*TOTAL\s+REVENUE/i],
    ['orders', /ORDERS\s+([\d,]+)\s*(?:Tickets|Ticket|Orders|Commandes|\b)/i],
    ['orders', /([\d,]+)\s+ORDERS/i],
    ['averageSpend', /AVERAGE\s+(?:SPEND|SALE\s+VALUE|TICKET\s+VALUE).*?\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['averageSpend', /\$\s*([\d,]+(?:\.\d{1,2})?)\s*AVERAGE\s+(?:SPEND|SALE\s+VALUE|TICKET\s+VALUE)/i],
    ['cash', /CASH\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['card', /CARD\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['online', /ONLINE\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['refund', /REFUND\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['discount', /DISCOUNT\s+GIVEN\s*\$?\s*(-?[\d,]+(?:\.\d{1,2})?)/i],
    ['totalUnitsSold', /TOTAL\s+UNITS\s+SOLD\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['avgTicketValue', /AVG\s+TICKET\s+VALUE.*?\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['bestDayValue', /BEST\s+DAY\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    // common JSON / JS names used by chart dashboards
    ['totalSales', /["']?(?:total_sales|totalSales|sales_total|total)["']?\s*[:=]\s*["']?([\d,.]+)["']?/i],
    ['netSales', /["']?(?:net_sales|netSales)["']?\s*[:=]\s*["']?([\d,.]+)["']?/i],
    ['grossSales', /["']?(?:gross_sales|grossSales)["']?\s*[:=]\s*["']?([\d,.]+)["']?/i],
    ['orders', /["']?(?:orders|tickets|ticket_count)["']?\s*[:=]\s*["']?([\d,.]+)["']?/i],
    ['averageSpend', /["']?(?:average_spend|averageSpend|aov|average_order_value)["']?\s*[:=]\s*["']?([\d,.]+)["']?/i]
  ];

  const extraPatterns = [
    // Uber Eats French/English cards: label then value
    ['totalSales', /Ventes\s+([\d\s,.]+)\s*\$?\s*AU/i],
    ['orders', /Commandes\s+r[ée]serv[ée]es\s+([\d\s,]+)/i],
    ['orders', /Commandes\s+qui\s+ont\s+g[ée]n[ée]r[ée]\s+des\s+ventes\s+([\d\s,]+)/i],
    ['averageSpend', /Montant\s+moyen\s+des\s+commandes\s+([\d\s,.]+)\s*\$?\s*AU/i],
    ['averageSpend', /Valeur\s+moyenne\s+des\s+articles\s+vendus\s+par\s+commande\s+([\d\s,.]+)\s*\$?\s*AU/i],
    // Uber Eats older layout: value then French label
    ['totalSales', /([\d\s,]+(?:\.\d{1,2})?)\s*\$\s*AU.*?Valeur\s+totale\s+des\s+articles\s+vendus/i],
    ['orders', /([\d\s,]+)\s+Commandes\s+qui\s+ont\s+g[ée]n[ée]r[ée]\s+des\s+ventes/i],
    ['averageSpend', /([\d\s,]+(?:\.\d{1,2})?)\s*\$\s*AU.*?Valeur\s+moyenne\s+des\s+articles\s+vendus\s+par\s+commande/i],
    // Reporting.site daily / EOD cards
    ['netSales', /TOTAL\s+NET\s+SALES\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['netSales', /TOTAL\s+NET\s*\(\$\)\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['grossSales', /GROSS\s+TAKINGS\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['orders', /([\d,]+)\s+tickets?\s+in\s+this\s+trading\s+range/i],
    ['orders', /Tickets\s+([\d,]+)/i],
    ['averageSpend', /AVERAGE\s+ORDER\s+VALUE.*?\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    // Square French cards
    ['transactions', /([\d\s,]+)\s+TRANSACTIONS\s+FINALIS[ÉE]ES/i],
    ['totalCollected', /([\d\s,]+(?:\.\d{1,2})?)\s*\$\s+TOTAL\s+ENCAISS[ÉE]/i],
    ['netSales', /([\d\s,]+(?:\.\d{1,2})?)\s*\$\s+VENTES\s+NETTES/i]
  ];

  for (const [key, regex] of [...extraPatterns, ...patterns]) {
    const m = t.match(regex);
    if (m && metrics[key] == null) metrics[key] = toNumber(m[1]);
  }

  if (metrics.sales == null) metrics.sales = firstNumber(metrics.totalSales, metrics.totalRevenue, metrics.netSales);

  const topProduct = t.match(/TOP\s+PRODUCT\s+([A-Za-z0-9 &()'\-]+?)\s+Revenue/i) || t.match(/Top Product\s+([A-Za-z0-9 &()'\-]+)/i);
  if (topProduct) metrics.topProduct = cleanLabel(topProduct[1]);

  const bestCategory = t.match(/BEST\s+SELLING\s+CATEGORY\s+([A-Za-z0-9 &()'\-]+?)\s+Total/i);
  if (bestCategory) metrics.bestSellingCategory = cleanLabel(bestCategory[1]);

  const leastCategory = t.match(/LEAST\s+SELLING\s+CATEGORY\s+([A-Za-z0-9 &()'\-]+?)\s+Total/i);
  if (leastCategory) metrics.leastSellingCategory = cleanLabel(leastCategory[1]);

  metrics.view = view;
  metrics.extractedAt = new Date().toISOString();
  return metrics;
}

export function summarizeReportingStore(storeName, views) {
  const dash = views['dashboard.php']?.metrics || {};
  const eod = views['eod_summary.php']?.metrics || {};
  const product = views['product_sales.php']?.metrics || {};
  const productSummary = views['product_sales_summary.php']?.metrics || {};
  const category = views['category_sales.php']?.metrics || {};

  const totalSales = firstNumber(dash.totalSales, eod.netSales, eod.grossSales, product.totalRevenue, productSummary.totalRevenue, category.totalRevenue);
  const netSales = firstNumber(eod.netSales, dash.netSales, dash.totalSales, totalSales);
  const orders = firstNumber(dash.orders, eod.orders);
  const averageSpend = firstNumber(dash.averageSpend, eod.averageSpend, product.avgTicketValue, orders && totalSales ? totalSales / orders : null);

  return {
    store: storeName,
    period: 'today',
    totalSales,
    netSales,
    grossSales: firstNumber(eod.grossSales, totalSales),
    orders,
    averageSpend,
    cash: firstNumber(eod.cash, dash.cash),
    card: firstNumber(eod.card, dash.card),
    online: firstNumber(eod.online, dash.online),
    topProduct: product.topProduct,
    topCategory: firstText(productSummary.bestSellingCategory, category.bestSellingCategory),
    leastCategory: firstText(productSummary.leastSellingCategory, category.leastSellingCategory),
    hourlyRows: collectHourlyRows(views),
    views,
    sourceView: `reporting.site live connector (${Object.keys(views).filter(v => views[v]?.ok).join(', ') || 'no successful views'})`,
    capturedAt: new Date().toISOString()
  };
}

export function parsePageTextCapture(source, text) {
  const normalized = normalize(text || '');
  const metrics = extractMetrics(source || 'capture', normalized);
  const hourlyRows = extractHourlyRowsFromText(normalized);
  const detected = [];
  if (metrics.sales || metrics.totalSales || metrics.netSales || metrics.grossSales) detected.push('sales');
  if (metrics.orders || metrics.transactions) detected.push('orders/transactions');
  if (metrics.averageSpend || metrics.aov) detected.push('AOV');
  if (hourlyRows.length) detected.push(`${hourlyRows.length} hourly rows`);
  return {
    source,
    metrics,
    hourlyRows,
    summary: detected.length ? `Captured ${detected.join(', ')} from ${source}.` : `Captured text from ${source}, but no KPI was parsed yet.`,
    rawTextPreview: normalized.slice(0, 2000)
  };
}


function collectHourlyRows(views = {}) {
  const rows = [];
  for (const v of Object.values(views)) {
    if (Array.isArray(v?.hourlyRows)) rows.push(...v.hourlyRows);
  }
  const seen = new Set();
  return rows.filter(r => {
    const key = `${r.hour}|${r.sales}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 48);
}

function hasNumericMetric(metrics = {}) {
  return Object.entries(metrics).some(([key, value]) => !['view', 'extractedAt'].includes(key) && typeof value === 'number' && Number.isFinite(value));
}

function hasUsefulSummary(summary = {}) {
  return [summary.totalSales, summary.netSales, summary.grossSales, summary.orders, summary.averageSpend].some(v => typeof v === 'number' && Number.isFinite(v));
}

function australiaDate() {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const get = type => parts.find(p => p.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch (_) {
    return new Date().toISOString().slice(0, 10);
  }
}

function normalize(s) {
  return String(s || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanLabel(s) {
  return normalize(s).replace(/\s{2,}/g, ' ').slice(0, 80);
}

function toNumber(v) {
  if (v === null || v === undefined) return null;
  let s = String(v).trim().replace(/\s+/g, '').replace(/[^0-9,.-]/g, '');
  if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function firstNumber(...values) {
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

function firstText(...values) {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}
