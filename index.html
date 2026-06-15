import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncReportingSite, parsePageTextCapture, summarizeReportingStore } from './src/reportingConnector.js';
import { parseWhatsappUpload } from './src/whatsappParser.js';
import { readJson, writeJson, emptyLiveState, mergeLive, addSyncRun, upsertManualSnapshot, addCapture } from './src/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const upload = multer({ dest: path.join(__dirname, 'uploads/') });
const PORT = process.env.PORT || 8787;
const DATA_PATH = path.resolve(__dirname, process.env.SEED_DATA_PATH || '../seed-data.json');
const LIVE_PATH = path.resolve(__dirname, process.env.LIVE_DATA_PATH || './data/live-snapshots.json');
const WEB_PATH = path.resolve(__dirname, '../web');

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(x => x.trim());
app.use(cors({ origin: allowedOrigins.includes('*') ? true : allowedOrigins, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

function seed() { return readJson(DATA_PATH, {}); }
function liveRaw() { return readJson(LIVE_PATH, emptyLiveState()); }
function saveLive(data) { writeJson(LIVE_PATH, data); return data; }
function liveMerged() { return mergeLive(seed(), liveRaw()); }

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'freda-ops-cockpit-server', version: '0.2.7', livePath: LIVE_PATH });
});

app.get('/api/seed', (_req, res) => res.json(seed()));

app.get('/api/live/summary', (_req, res) => {
  res.json({ ok: true, live: liveMerged(), generatedAt: new Date().toISOString() });
});

app.post('/api/live/reporting/sync', async (_req, res) => {
  const state = liveRaw();
  const result = await syncReportingSite(process.env, fetch);
  let next = { ...state };
  if (result.reportingPOS && Object.keys(result.reportingPOS).length) {
    next.reportingPOS = { ...(state.reportingPOS || {}), ...result.reportingPOS };
  }
  next.connectorStatus = {
    ...(state.connectorStatus || {}),
    reportingSite: {
      ok: result.ok,
      lastSync: result.finishedAt,
      error: result.error || null,
      stores: (result.details || []).map(d => ({ store: d.store, ok: d.ok, errors: d.errors }))
    }
  };
  next = addSyncRun(next, {
    source: 'reporting.site',
    ok: result.ok,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    error: result.error || null,
    stores: Object.keys(result.reportingPOS || {})
  });
  saveLive(next);
  res.status(result.error && result.error.startsWith('Missing ') ? 400 : 200).json({ ok: result.ok, result, live: mergeLive(seed(), next) });
});

app.post('/api/live/manual-snapshot', (req, res) => {
  const next = upsertManualSnapshot(liveRaw(), req.body || {});
  saveLive(next);
  res.json({ ok: true, live: mergeLive(seed(), next) });
});

app.post('/api/bookmarklet/capture', (req, res) => {
  const body = req.body || {};
  const source = body.source || body.url || 'browser-capture';
  const parsed = parsePageTextCapture(source, body.text || body.pageText || '');
  const sourceText = `${source || ''} ${body.url || ''} ${body.title || ''}`.toLowerCase();
  const store = body.store
    || (sourceText.includes('beverly') ? 'Beverly Hills'
    : sourceText.includes('penrith') ? 'Penrith'
    : sourceText.includes('taren') ? 'Taren Point'
    : sourceText.includes('frieda') || sourceText.includes('frida') ? "Frieda's Pies"
    : null);

  let next = addCapture(liveRaw(), {
    source,
    store: store || '',
    period: body.period || parsed.metrics?.period || 'captured',
    url: body.url || '',
    title: body.title || '',
    parsed
  });

  if (store && parsed.metrics) {
    const period = body.period || parsed.metrics.period || 'captured';
    if (sourceText.includes('uber') || source === 'uberEats') {
      next.uberEats = {
        ...(next.uberEats || {}),
        [store]: {
          sales: firstMetric(parsed.metrics, ['sales', 'totalSales', 'totalRevenue', 'netSales']),
          totalSales: firstMetric(parsed.metrics, ['sales', 'totalSales', 'totalRevenue', 'netSales']),
          orders: firstMetric(parsed.metrics, ['orders', 'transactions']),
          aov: firstMetric(parsed.metrics, ['aov', 'averageSpend', 'averageOrderValue']),
          averageSpend: firstMetric(parsed.metrics, ['aov', 'averageSpend', 'averageOrderValue']),
          period,
          periodLabel: /^\d{4}-\d{2}-\d{2}$/.test(period) ? 'Today/daily' : period,
          hourlyRows: parsed.hourlyRows || [],
          sourceView: `browser view capture: ${body.title || body.url || source}`,
          capturedAt: new Date().toISOString()
        }
      };
    } else if (sourceText.includes('square') || source === 'square') {
      const sales = firstMetric(parsed.metrics, ['netSales', 'totalCollected', 'sales', 'totalSales', 'totalRevenue']);
      next.square = {
        ...(next.square || {}),
        [store]: {
          netSales: sales,
          totalCollected: sales,
          sales,
          transactions: firstMetric(parsed.metrics, ['transactions', 'orders']),
          period,
          periodLabel: /^\d{4}-\d{2}-\d{2}$/.test(period) ? 'Today/daily' : 'MTD/captured period',
          sourceView: `browser view capture: ${body.title || body.url || source}`,
          capturedAt: new Date().toISOString()
        }
      };
    } else {
      const posSummary = summarizeReportingStore(store, { capture: { metrics: parsed.metrics, hourlyRows: parsed.hourlyRows || [], ok: true } });
      next.reportingPOS = { ...(next.reportingPOS || {}), [store]: { ...posSummary, period, sourceView: `browser view capture: ${body.title || body.url || source}` } };
    }
  }
  saveLive(next);
  res.json({ ok: true, parsed, live: mergeLive(seed(), next) });
});

app.post('/api/uploads', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded' });
  const lower = req.file.originalname.toLowerCase();
  try {
    if (lower.includes('whatsapp') || lower.endsWith('.zip') || lower.endsWith('.txt')) {
      const parsed = parseWhatsappUpload(req.file);
      if (!parsed.ok) return res.status(400).json(parsed);
      const state = liveRaw();
      const next = {
        ...state,
        updatedAt: new Date().toISOString(),
        whatsapp: {
          summaries: [parsed, ...(state.whatsapp?.summaries || [])].slice(0, 20),
          actions: [...(parsed.actions || []), ...(state.whatsapp?.actions || [])].slice(0, 100)
        }
      };
      saveLive(next);
      return res.json({ ok: true, type: 'whatsapp', parsed, live: mergeLive(seed(), next) });
    }
    return res.json({ ok: true, originalName: req.file.originalname, size: req.file.size, status: 'Stored locally. CSV/XLSX parsers are next backlog items.' });
  } finally {
    fs.promises.unlink(req.file.path).catch(() => {});
  }
});

app.post('/api/actions/:id/status', (req, res) => {
  const state = liveRaw();
  const id = req.params.id;
  const nextActions = (state.whatsapp?.actions || []).map(a => a.id === id ? { ...a, status: req.body.status || 'Done', closedAt: new Date().toISOString() } : a);
  const next = { ...state, updatedAt: new Date().toISOString(), whatsapp: { ...(state.whatsapp || {}), actions: nextActions } };
  saveLive(next);
  res.json({ ok: true, id, status: req.body.status || 'Done', live: mergeLive(seed(), next) });
});

app.post('/api/assistant', (req, res) => {
  const question = String(req.body?.question || '').toLowerCase();
  const live = liveMerged();
  const stores = Object.entries(live.reportingPOS || {}).map(([store, m]) => `${store}: ${money(m.totalSales || m.netSales || m.sales)} POS, ${m.orders || '—'} orders`);
  const uber = Object.entries(live.uberEats || {}).map(([store, m]) => `${store}: ${money(m.sales || m.totalSales)} Uber ${m.period || 'captured'}`);
  let answer = `Live snapshot available. POS: ${stores.join('; ') || 'not synced yet'}. Uber: ${uber.join('; ') || 'not captured yet'}.`;
  if (question.includes('attention') || question.includes('today')) {
    answer = `Today: refresh POS first, then check Penrith cabinet before 3pm, Beverly Hills reserve before lunch, Taren Point stock/display confirmation, and Frieda's Pies Square/leftover position. ${answer}`;
  }
  if (question.includes('uber')) answer = `Uber is separate from POS. Current captured Uber: ${uber.join('; ') || 'none yet'}. Add it on top of reporting.site POS before judging total revenue.`;
  if (question.includes('square') || question.includes('frieda') || question.includes('pie')) answer = `Frieda's Pies is Square-led. Current captured Square data: ${JSON.stringify(live.square?.["Frieda's Pies"] || {})}. Use export/API token for stronger accuracy.`;
  res.json({ ok: true, answer, liveUpdatedAt: live.updatedAt });
});

app.use(express.static(WEB_PATH, { extensions: ['html'] }));
app.get('*', (_req, res) => res.sendFile(path.join(WEB_PATH, 'index.html')));

app.listen(PORT, () => console.log(`Freda Ops Cockpit Beta 0.2.7 running on http://localhost:${PORT}`));

function firstMetric(obj = {}, keys = []) {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function money(n) {
  return n == null ? '—' : '$' + Math.round(Number(n)).toLocaleString('en-AU');
}
