// Stop hook: reads the session transcript, extracts the final end-of-turn assistant
// text (skipping thinking/tool_use/intermediate blocks), appends it as the RESPONSE
// entry pairing with the most recent PROMPT. Must never block the session.
const fs = require('fs');
const lib = require('./lib');

lib.trace('capture-response invoked', 'cwd=' + process.cwd());

// The transcript is flushed asynchronously and can lag the Stop event, so retry briefly.
async function waitForEndTurn(transcriptPath) {
  const attempts = 20;
  for (let i = 0; i < attempts; i++) {
    const found = lib.findLastEndTurnMessage(transcriptPath);
    if (found) {
      if (i) lib.trace('capture-response found after retries', String(i));
      return found;
    }
    await lib.sleep(250);
  }
  return null;
}

lib.readStdinJson()
  .then(async (data) => {
    const sessionId = data.session_id || data.sessionId;
    const transcriptPath = data.transcript_path || data.transcriptPath;
    lib.trace('capture-response payload', `keys=${Object.keys(data).join(',')} session=${sessionId} transcript=${transcriptPath}`);
    if (!sessionId) return lib.trace('capture-response skip', 'no session_id');
    if (!transcriptPath) return lib.trace('capture-response skip', 'no transcript_path');
    if (!fs.existsSync(transcriptPath)) return lib.trace('capture-response skip', 'transcript missing');

    const found = await waitForEndTurn(transcriptPath);
    if (!found) return lib.trace('capture-response skip', 'no end_turn text after last prompt (gave up)');

    const state = lib.readState(sessionId);
    if (state.lastResponseUuid === found.uuid) return lib.trace('capture-response skip', 'duplicate uuid ' + found.uuid);

    let fpath = lib.findSessionLogFile(sessionId);
    if (!fpath) fpath = lib.createSessionLogFile(sessionId, found.model, data.cwd);

    const content = fs.readFileSync(fpath, 'utf8');
    const num = lib.countEntries(content, 'PROMPT');
    const now = new Date();

    const entry =
`\n[LOG_ENTRY type=RESPONSE num=${num} session=${sessionId}]
timestamp: ${lib.tsUtc(now)}
model: ${found.model || 'unknown'}

${found.text}

---
`;
    fs.appendFileSync(fpath, entry, 'utf8');
    lib.patchPendingPromptModel(fpath, found.model);
    lib.bumpFrontmatter(fpath, found.model);
    lib.writeState(sessionId, { lastResponseUuid: found.uuid });
    lib.trace('capture-response wrote', `num=${num} model=${found.model} file=${fpath}`);
  })
  .catch((e) => lib.trace('capture-response error', String(e && e.stack)))
  .finally(() => process.exit(0));
