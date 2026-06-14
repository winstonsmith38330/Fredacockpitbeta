import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { syncReportingSite } from '../src/reportingConnector.js';
import { readJson, writeJson, emptyLiveState, addSyncRun } from '../src/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const livePath = path.resolve(__dirname, '..', process.env.LIVE_DATA_PATH || './data/live-snapshots.json');

const state = readJson(livePath, emptyLiveState());
const result = await syncReportingSite(process.env, fetch);
let next = { ...state };
if (result.reportingPOS) next.reportingPOS = { ...(state.reportingPOS || {}), ...result.reportingPOS };
next.connectorStatus = { ...(state.connectorStatus || {}), reportingSite: { ok: result.ok, lastSync: result.finishedAt, error: result.error || null } };
next = addSyncRun(next, { source: 'reporting.site', ok: result.ok, startedAt: result.startedAt, finishedAt: result.finishedAt, error: result.error || null, stores: Object.keys(result.reportingPOS || {}) });
writeJson(livePath, next);
console.log(JSON.stringify({ ok: result.ok, error: result.error || null, stores: Object.keys(result.reportingPOS || {}) }, null, 2));
process.exit(result.ok ? 0 : 1);
