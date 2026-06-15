import fs from 'fs';
import path from 'path';

export function readJson(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return { ...fallback, _readError: error.message };
  }
}

export function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

export function emptyLiveState() {
  return {
    version: '0.2.4',
    updatedAt: null,
    reportingPOS: {},
    uberEats: {},
    square: {},
    whatsapp: { summaries: [], actions: [] },
    captures: [],
    syncRuns: []
  };
}

export function mergeLive(seed, stored) {
  const sample = seed.liveSamples || {};
  return {
    version: '0.2.4',
    updatedAt: stored.updatedAt || sample.lastUpdated || seed.meta?.generatedAt,
    reportingPOS: { ...(sample.reportingPOS || {}), ...(stored.reportingPOS || {}) },
    uberEats: { ...(sample.uberEats || {}), ...(stored.uberEats || {}) },
    square: { ...(sample.square || {}), ...(stored.square || {}) },
    whatsapp: {
      summaries: [...(seed.whatsapp?.summaries || []), ...(stored.whatsapp?.summaries || [])],
      actions: [...(stored.whatsapp?.actions || [])]
    },
    captures: stored.captures || [],
    syncRuns: stored.syncRuns || [],
    connectorStatus: stored.connectorStatus || {}
  };
}

export function addSyncRun(state, run) {
  const next = { ...state };
  next.syncRuns = [run, ...(state.syncRuns || [])].slice(0, 20);
  next.updatedAt = run.finishedAt || new Date().toISOString();
  return next;
}

export function upsertManualSnapshot(state, body) {
  const source = body.source || 'manual';
  const store = body.store || 'Unknown';
  const period = body.period || 'manual';
  const payload = {
    period,
    sales: num(body.sales),
    totalSales: num(body.totalSales ?? body.sales),
    netSales: num(body.netSales),
    orders: int(body.orders),
    aov: num(body.aov),
    averageSpend: num(body.averageSpend ?? body.aov),
    transactions: int(body.transactions),
    note: body.note || '',
    sourceView: 'manual entry',
    capturedAt: new Date().toISOString()
  };
  const next = { ...state, updatedAt: new Date().toISOString() };
  if (source === 'uberEats') next.uberEats = { ...(state.uberEats || {}), [store]: payload };
  else if (source === 'square') next.square = { ...(state.square || {}), [store]: payload };
  else next.reportingPOS = { ...(state.reportingPOS || {}), [store]: payload };
  return next;
}

export function addCapture(state, capture) {
  const next = { ...state, updatedAt: new Date().toISOString() };
  next.captures = [{ ...capture, capturedAt: new Date().toISOString() }, ...(state.captures || [])].slice(0, 50);
  return next;
}

export function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).replace(/[^0-9.\-]/g, '');
  if (!s || s === '-' || s === '.') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function int(v) {
  const n = num(v);
  return n == null ? null : Math.round(n);
}
