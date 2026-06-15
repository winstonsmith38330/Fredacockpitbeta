import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const KEYWORDS = [
  { category: 'Stock', severity: 'Red', words: ['sold out', 'sold-out', 'out of stock', 'no stock', 'short', 'ran out', 'empty'] },
  { category: 'Display/photo', severity: 'Amber', words: ['photo', 'pic', 'picture', 'cabinet', 'display', 'window'] },
  { category: 'Staffing', severity: 'Amber', words: ['sick', 'late', 'shift', 'roster', 'swap', 'no show', 'noshow', 'staff'] },
  { category: 'Cleaning', severity: 'Amber', words: ['clean', 'dirty', 'rubbish', 'bin', 'floor', 'bathroom'] },
  { category: 'Equipment', severity: 'Red', words: ['broken', 'oven', 'fridge', 'freezer', 'fryer', 'machine', 'pos', 'tablet'] },
  { category: 'Closing/leftover', severity: 'Amber', words: ['closing', 'close', 'leftover', 'left over', 'waste'] },
  { category: 'Manager action', severity: 'Amber', words: ['please', 'can you', 'confirm', 'check', 'send', 'call me', 'fix'] }
];

export function parseWhatsappUpload(file) {
  const lower = file.originalname.toLowerCase();
  if (lower.endsWith('.zip')) return parseWhatsappZip(file.path, file.originalname);
  if (lower.endsWith('.txt')) {
    const text = fs.readFileSync(file.path, 'utf8');
    return parseWhatsappText(text, inferStoreName(file.originalname), file.originalname, 0);
  }
  return { ok: false, error: 'Unsupported WhatsApp file type. Upload ZIP or TXT export.' };
}

export function parseWhatsappZip(zipPath, originalName = '') {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const textEntry = entries.find(e => e.entryName.toLowerCase().endsWith('.txt'));
  if (!textEntry) return { ok: false, error: 'No WhatsApp .txt file found inside ZIP.' };
  const text = textEntry.getData().toString('utf8');
  const mediaFiles = entries.filter(e => /\.(jpg|jpeg|png|webp|mp4|mov)$/i.test(e.entryName)).length;
  return parseWhatsappText(text, inferStoreName(originalName || textEntry.entryName), originalName || textEntry.entryName, mediaFiles);
}

export function parseWhatsappText(text, store = 'Unknown', sourceName = 'WhatsApp export', mediaFiles = 0) {
  const lines = String(text || '').split(/\r?\n/).filter(Boolean);
  const messages = lines.map(parseLine).filter(Boolean);
  const signals = [];

  for (const msg of messages) {
    const lower = msg.message.toLowerCase();
    for (const rule of KEYWORDS) {
      if (rule.words.some(w => lower.includes(w))) {
        signals.push({
          category: rule.category,
          severity: rule.severity,
          date: msg.date,
          time: msg.time,
          sender: msg.sender,
          message: msg.message.slice(0, 280),
          store,
          sourceName
        });
        break;
      }
    }
  }

  const categoryCounts = countBy(signals, 'category');
  const actions = signals
    .filter(s => ['Stock', 'Equipment', 'Manager action', 'Display/photo', 'Closing/leftover'].includes(s.category))
    .slice(-12)
    .reverse()
    .map((s, idx) => ({
      id: `WA-${Date.now()}-${idx}`,
      store,
      category: s.category,
      severity: s.severity,
      summary: summariseSignal(s),
      evidence: `${s.sender || 'Unknown'}: ${s.message}`,
      status: 'Open',
      sourceName,
      createdAt: new Date().toISOString()
    }));

  return {
    ok: true,
    store,
    sourceName,
    messages: messages.length,
    mediaFiles,
    signals: signals.length,
    categoryCounts,
    summary: buildSummary(store, messages.length, mediaFiles, categoryCounts),
    actions
  };
}

function parseLine(line) {
  const patterns = [
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2})\s*-\s*([^:]+):\s*(.*)$/,
    /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^:]+):\s*(.*)$/
  ];
  for (const p of patterns) {
    const m = line.match(p);
    if (m) return { date: m[1], time: m[2], sender: m[3].trim(), message: m[4].trim() };
  }
  return { date: '', time: '', sender: '', message: line.trim() };
}

function inferStoreName(name) {
  const s = String(name || '').toLowerCase();
  if (s.includes('penrith') || s.includes(' pn')) return 'Penrith';
  if (s.includes('beverly') || s.includes(' bh')) return 'Beverly Hills';
  if (s.includes('taren') || s.includes(' tp')) return 'Taren Point';
  if (s.includes('pie')) return "Frieda's Pies";
  return 'Unknown';
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    acc[row[key]] = (acc[row[key]] || 0) + 1;
    return acc;
  }, {});
}

function summariseSignal(signal) {
  if (signal.category === 'Stock') return 'Check stock / sold-out risk and confirm recovery.';
  if (signal.category === 'Equipment') return 'Check equipment issue and escalate if unresolved.';
  if (signal.category === 'Display/photo') return 'Review cabinet/display photo and confirm standard.';
  if (signal.category === 'Closing/leftover') return 'Confirm leftover/closing count before next production decision.';
  return 'Manager follow-up needed from WhatsApp message.';
}

function buildSummary(store, messages, mediaFiles, counts) {
  const parts = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ');
  return `${store}: ${messages} messages and ${mediaFiles} media files imported. Signals found: ${parts || 'none'}.`;
}
