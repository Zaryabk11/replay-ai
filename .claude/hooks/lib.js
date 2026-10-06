// Shared helpers for the prompt/response capture hooks.
// Never throw past the caller's try/catch — a logging failure must not block the session.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
// CAPTURE_* env overrides exist so the hooks can be tested without touching real logs.
const LOG_DIR = process.env.CAPTURE_LOG_DIR || path.join(REPO_ROOT, '.agent-logs');
const STATE_DIR = process.env.CAPTURE_STATE_DIR || path.join(REPO_ROOT, '.claude', 'hooks', '.state');
const DEBUG_TRACE = path.join(STATE_DIR, 'trace.log');

function trace(label, extra) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.appendFileSync(DEBUG_TRACE, `${new Date().toISOString()} ${label} ${extra || ''}\n`, 'utf8');
  } catch (e) {}
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function tsUtc(d) {
  d = d || new Date();
  return (
    d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) +
    'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) +
    '.' + String(d.getUTCMilliseconds()).padStart(3, '0') + 'Z'
  );
}

function fileStamp(d) {
  d = d || new Date();
  return (
    d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) +
    '_' + pad(d.getUTCHours()) + '-' + pad(d.getUTCMinutes()) + '-' + pad(d.getUTCSeconds())
  );
}

function readStdinJson() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on('data', (c) => chunks.push(c));
    process.stdin.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim();
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    process.stdin.on('error', reject);
  });
}

function findSessionLogFile(sessionId) {
  if (!fs.existsSync(LOG_DIR)) return null;
  const suffix = `_${sessionId}.md`;
  const files = fs.readdirSync(LOG_DIR).filter((f) => f.endsWith(suffix));
  return files.length ? path.join(LOG_DIR, files[0]) : null;
}

function createSessionLogFile(sessionId, model, cwd) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const now = new Date();
  const fname = `${fileStamp(now)}_${sessionId}.md`;
  const fpath = path.join(LOG_DIR, fname);
  const project = path.basename(cwd || REPO_ROOT);
  const shortId = sessionId.split('-')[0];
  const header =
`---
session_id: ${sessionId}
date: ${now.toISOString().slice(0, 10)}
author: Zaryabk11
model: ${model || 'unknown'}
tool: claude-code
project: ${project}
total_exchanges: 0
first_prompt_time: ${tsUtc(now)}
last_prompt_time: ${tsUtc(now)}
---

# Session Log - ${now.toISOString().slice(0, 10)}

Session: \`${shortId}\` | Project: \`${project}\` | Author: \`Zaryabk11\`

---
`;
  fs.writeFileSync(fpath, header, 'utf8');
  return fpath;
}

function countEntries(content, type) {
  const re = new RegExp(`\\[LOG_ENTRY type=${type} `, 'g');
  return (content.match(re) || []).length;
}

function bumpFrontmatter(fpath, model) {
  let content = fs.readFileSync(fpath, 'utf8');
  const fmRe = /^---\n([\s\S]*?)\n---\n/;
  const m = content.match(fmRe);
  if (!m) return;
  let fm = m[1];
  const promptCount = countEntries(content, 'PROMPT');
  fm = fm.replace(/total_exchanges: \d+/, `total_exchanges: ${promptCount}`);
  fm = fm.replace(/last_prompt_time: .*/, `last_prompt_time: ${tsUtc()}`);
  if (model) fm = fm.replace(/model: .*/, `model: ${model}`);
  content = content.replace(fmRe, `---\n${fm}\n---\n`);
  fs.writeFileSync(fpath, content, 'utf8');
}

// Replace "model: pending" on the most recent PROMPT entry that still has it.
function patchPendingPromptModel(fpath, model) {
  if (!model) return;
  const content = fs.readFileSync(fpath, 'utf8');
  const re = /(\[LOG_ENTRY type=PROMPT [^\n]*\]\ntimestamp: [^\n]*\nmodel: )pending(\n)/g;
  let last = null;
  let m;
  while ((m = re.exec(content))) last = m;
  if (!last) return;
  const out = content.slice(0, last.index) + last[1] + model + last[2] + content.slice(last.index + last[0].length);
  fs.writeFileSync(fpath, out, 'utf8');
}

function readTranscriptLines(transcriptPath) {
  const out = [];
  for (const line of fs.readFileSync(transcriptPath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch (e) {}
  }
  return out;
}

// Most recent real model name on an assistant message (skips synthetic placeholders).
function findLatestModel(transcriptPath) {
  try {
    const lines = readTranscriptLines(transcriptPath);
    for (let i = lines.length - 1; i >= 0; i--) {
      const d = lines[i];
      const model = d.type === 'assistant' && d.message && d.message.model;
      if (model && !/^<.*>$/.test(model)) return model;
    }
  } catch (e) {}
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function readState(sessionId) {
  const fpath = path.join(STATE_DIR, `${sessionId}.json`);
  try {
    return JSON.parse(fs.readFileSync(fpath, 'utf8'));
  } catch (e) {
    return {};
  }
}

function writeState(sessionId, state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const fpath = path.join(STATE_DIR, `${sessionId}.json`);
  fs.writeFileSync(fpath, JSON.stringify(state), 'utf8');
}

// Last end-of-turn assistant text that came after the most recent human prompt.
function findLastEndTurnMessage(transcriptPath) {
  const lines = readTranscriptLines(transcriptPath);
  let promptIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const d = lines[i];
    if (d.type === 'user' && d.message && !d.isMeta && !d.isSidechain &&
        (typeof d.message.content === 'string' ||
         (Array.isArray(d.message.content) && !d.message.content.some((b) => b && b.type === 'tool_result')))) {
      promptIdx = i;
      break;
    }
  }
  for (let i = lines.length - 1; i > promptIdx; i--) {
    const d = lines[i];
    if (d.type === 'assistant' && d.message && d.message.stop_reason === 'end_turn' && Array.isArray(d.message.content)) {
      const texts = d.message.content.filter((b) => b && b.type === 'text' && b.text).map((b) => b.text);
      if (texts.length) return { text: texts.join('\n\n'), model: d.message.model, uuid: d.uuid };
    }
  }
  return null;
}

module.exports = {
  REPO_ROOT,
  LOG_DIR,
  trace,
  tsUtc,
  readStdinJson,
  findSessionLogFile,
  createSessionLogFile,
  countEntries,
  bumpFrontmatter,
  patchPendingPromptModel,
  readState,
  writeState,
  findLastEndTurnMessage,
  findLatestModel,
  sleep,
};
