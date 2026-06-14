import * as cheerio from 'cheerio';

const DEFAULT_STORES = [
  { id: 'bh', name: 'Beverly Hills', slugEnv: 'REPORTING_STORE_SLUG_BH', fallbackSlug: 'ladonuts_beverlyhills' },
  { id: 'pen', name: 'Penrith', slugEnv: 'REPORTING_STORE_SLUG_PEN', fallbackSlug: 'ladonuts_penrith' },
  { id: 'tp', name: 'Taren Point', slugEnv: 'REPORTING_STORE_SLUG_TP', fallbackSlug: 'ladonuts_tarenpoint' }
];

const DEFAULT_VIEWS = ['dashboard.php', 'eod_summary.php', 'product_sales_summary.php', 'product_sales.php', 'ticket_sales.php', 'busy_hours.php'];

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
  const cookieHeader = env.REPORTING_COOKIE || (env.REPORTING_PHPSESSID ? `PHPSESSID=${env.REPORTING_PHPSESSID}` : '');
  if (!cookieHeader) {
    return { error: 'Missing REPORTING_PHPSESSID or REPORTING_COOKIE in server/.env' };
  }
  return {
    headers: {
      Cookie: cookieHeader,
      'User-Agent': 'Mozilla/5.0 FredaOpsCockpit/0.2 (+https://la-donuts.local)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
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

  for (const store of config.stores) {
    const storeResult = {
      store: store.name,
      slug: store.slug,
      ok: true,
      views: {},
      errors: []
    };

    for (const view of config.views) {
      const url = `${config.baseUrl}/${store.slug}/dashboard/${view}`;
      try {
        const response = await fetchImpl(url, { headers: headerResult.headers, redirect: 'follow' });
        const html = await response.text();
        const looksLoggedOut = response.url.toLowerCase().includes('login') || /login|password|sign\s*in/i.test(html.slice(0, 1000));
        if (!response.ok || looksLoggedOut) {
          const message = looksLoggedOut ? 'Auth failed or session expired' : `HTTP ${response.status}`;
          storeResult.ok = false;
          storeResult.errors.push({ view, url, message });
          storeResult.views[view] = { ok: false, url, message };
          continue;
        }
        const parsed = parseReportingPage(view, html, url);
        storeResult.views[view] = parsed;
      } catch (error) {
        storeResult.ok = false;
        storeResult.errors.push({ view, url, message: error.message });
        storeResult.views[view] = { ok: false, url, message: error.message };
      }
    }

    reportingPOS[store.name] = summarizeReportingStore(store.name, storeResult.views);
    details.push(storeResult);
  }

  return {
    ok: details.some(d => d.ok),
    startedAt,
    finishedAt: new Date().toISOString(),
    reportingPOS,
    details
  };
}

export function parseReportingPage(view, html, url = '') {
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();
  const title = $('title').text().trim();
  const text = normalize($('body').text());
  const tables = parseTables($);
  return {
    ok: true,
    view,
    url,
    title,
    metrics: extractMetrics(view, text),
    tables: tables.slice(0, 4),
    rawTextPreview: text.slice(0, 3000),
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
    ['netSales', /NET\s+SALES\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['totalSales', /TOTAL\s+SALES\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['totalRevenue', /TOTAL\s+REVENUE\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['orders', /ORDERS\s+([\d,]+)\s*(?:Tickets|Ticket|Orders|Commandes|\b)/i],
    ['averageSpend', /AVERAGE\s+(?:SPEND|SALE\s+VALUE|TICKET\s+VALUE).*?\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['cash', /CASH\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['card', /CARD\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['online', /ONLINE\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['refund', /REFUND\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['discount', /DISCOUNT\s+GIVEN\s*\$?\s*(-?[\d,]+(?:\.\d{1,2})?)/i],
    ['totalUnitsSold', /TOTAL\s+UNITS\s+SOLD\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['avgTicketValue', /AVG\s+TICKET\s+VALUE.*?\$?\s*([\d,]+(?:\.\d{1,2})?)/i],
    ['bestDayValue', /BEST\s+DAY\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i]
  ];

  for (const [key, regex] of patterns) {
    const m = t.match(regex);
    if (m) metrics[key] = toNumber(m[1]);
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
    period: 'live',
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
    sourceView: 'reporting.site live connector',
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

function normalize(s) {
  return String(s || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanLabel(s) {
  return normalize(s).replace(/\s{2,}/g, ' ').slice(0, 80);
}

function toNumber(v) {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
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
