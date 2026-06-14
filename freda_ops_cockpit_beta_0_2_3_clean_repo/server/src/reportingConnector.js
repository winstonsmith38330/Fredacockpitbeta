import * as cheerio from 'cheerio';

const DEFAULT_STORES = [
  { id: 'bh', name: 'Beverly Hills', slugEnv: 'REPORTING_STORE_SLUG_BH', fallbackSlug: 'ladonuts_beverlyhills' },
  { id: 'pen', name: 'Penrith', slugEnv: 'REPORTING_STORE_SLUG_PEN', fallbackSlug: 'ladonuts_penrith' },
  { id: 'tp', name: 'Taren Point', slugEnv: 'REPORTING_STORE_SLUG_TP', fallbackSlug: 'ladonuts_tarenpoint' }
];

const DEFAULT_VIEWS = [
  'dashboard.php',
  'eod_summary.php',
  'product_sales_summary.php',
  'product_sales.php',
  'ticket_sales.php',
  'busy_hours.php',
  'sold_out_date.php',
  'category_sales.php'
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
      'User-Agent': 'Mozilla/5.0 FredaOpsCockpit/0.2.3 (+https://la-donuts.local)',
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
      try {
        const response = await fetchImpl(url, { headers: headerResult.headers, redirect: 'follow' });
        const html = await response.text();
        const firstChunk = html.slice(0, 1600);
        const looksLoggedOut = response.url.toLowerCase().includes('login') || /login|password|sign\s*in|se connecter|mot de passe/i.test(firstChunk);
        if (!response.ok || looksLoggedOut) {
          const message = looksLoggedOut ? 'Auth failed or session expired' : `HTTP ${response.status}`;
          storeResult.ok = false;
          storeResult.errors.push({ view, url, message });
          storeResult.views[view] = { ok: false, url, message, fetchedAt: new Date().toISOString() };
          continue;
        }
        const parsed = parseReportingPage(view, html, url);
        storeResult.views[view] = parsed;
        if (hasNumericMetric(parsed.metrics)) storeResult.hasMetrics = true;
      } catch (error) {
        storeResult.ok = false;
        storeResult.errors.push({ view, url, message: error.message });
        storeResult.views[view] = { ok: false, url, message: error.message, fetchedAt: new Date().toISOString() };
      }
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
        message: 'Pages fetched, but no sales KPI was parsed. This reporting.site view may inject data with browser JavaScript. Use browser capture or manual snapshot while connector parsing is tightened.'
      });
    }
    summary.connectorDiagnostic = {
      hasMetrics: storeResult.hasMetrics,
      successfulViews: Object.keys(storeResult.views).filter(v => storeResult.views[v]?.ok),
      metricViews: Object.entries(storeResult.views)
        .filter(([, v]) => hasNumericMetric(v?.metrics))
        .map(([view, v]) => ({ view, keys: Object.keys(v.metrics || {}).filter(k => typeof v.metrics[k] === 'number') }))
    };
    reportingPOS[store.name] = summary;
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
    ['totalSales', /([\d\s,]+(?:\.\d{1,2})?)\s*\$\s*AU.*?Valeur\s+totale\s+des\s+articles\s+vendus/i],
    ['orders', /([\d\s,]+)\s+Commandes\s+qui\s+ont\s+g[ée]n[ée]r[ée]\s+des\s+ventes/i],
    ['averageSpend', /([\d\s,]+(?:\.\d{1,2})?)\s*\$\s*AU.*?Valeur\s+moyenne\s+des\s+articles\s+vendus\s+par\s+commande/i],
    ['transactions', /([\d\s,]+)\s+TRANSACTIONS\s+FINALIS[ÉE]ES/i],
    ['totalCollected', /([\d\s,]+(?:\.\d{1,2})?)\s*\$\s+TOTAL\s+ENCAISS[ÉE]/i],
    ['netSales', /([\d\s,]+(?:\.\d{1,2})?)\s*\$\s+VENTES\s+NETTES/i]
  ];

  for (const [key, regex] of [...extraPatterns, ...patterns]) {
    const m = t.match(regex);
    if (m && metrics[key] == null) metrics[key] = toNumber(m[1]);
  }

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
    views,
    sourceView: `reporting.site live connector (${Object.keys(views).filter(v => views[v]?.ok).join(', ') || 'no successful views'})`,
    capturedAt: new Date().toISOString()
  };
}

export function parsePageTextCapture(source, text) {
  const normalized = normalize(text || '');
  return {
    source,
    metrics: extractMetrics(source || 'capture', normalized),
    rawTextPreview: normalized.slice(0, 2000)
  };
}

function hasNumericMetric(metrics = {}) {
  return Object.entries(metrics).some(([key, value]) => !['view', 'extractedAt'].includes(key) && typeof value === 'number' && Number.isFinite(value));
}

function hasUsefulSummary(summary = {}) {
  return [summary.totalSales, summary.netSales, summary.grossSales, summary.orders, summary.averageSpend].some(v => typeof v === 'number' && Number.isFinite(v));
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
