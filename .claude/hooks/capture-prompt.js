// UserPromptSubmit hook: appends the verbatim prompt to this session's log file.
// Must never block the turn, so every failure path exits 0 silently.

const fs = require('fs');
const lib = require('./lib');

lib.trace('capture-prompt invoked', 'cwd=' + process.cwd());

lib.readStdinJson()
  .then((data) => {
    const sessionId = data.session_id || data.sessionId;
    const transcriptPath = data.transcript_path || data.transcriptPath;
    lib.trace('capture-prompt payload', `keys=${Object.keys(data).join(',')} session=${sessionId} transcript=${transcriptPath}`);
    if (!sessionId) return lib.trace('capture-prompt skip', 'no session_id');
    const prompt = typeof data.prompt === 'string' ? data.prompt : '';
    const now = new Date();

    // Model comes from the transcript. On a session's first prompt there is no assistant
    // message yet, so it stays "pending" and the Stop hook fills it in.
    const model = (transcriptPath && fs.existsSync(transcriptPath) && lib.findLatestModel(transcriptPath)) || null;

    let fpath = lib.findSessionLogFile(sessionId);
    if (!fpath) fpath = lib.createSessionLogFile(sessionId, model, data.cwd);

    const content = fs.readFileSync(fpath, 'utf8');
    const num = lib.countEntries(content, 'PROMPT') + 1;

    const entry =
`\n[LOG_ENTRY type=PROMPT num=${num} session=${sessionId}]
timestamp: ${lib.tsUtc(now)}
model: ${model || 'pending'}

${prompt}

`;
    fs.appendFileSync(fpath, entry, 'utf8');
    lib.bumpFrontmatter(fpath, model);
    lib.trace('capture-prompt wrote', `num=${num} model=${model || 'pending'} file=${fpath}`);
  })
  .catch((e) => lib.trace('capture-prompt error', String(e && e.stack)))
  .finally(() => process.exit(0));
