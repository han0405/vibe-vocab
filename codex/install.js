#!/usr/bin/env node
// One-time setup for using VibeVocab with the Codex CLI.
//
//   node codex/install.js
//
// Does three things:
//   1. installs codex/prompts/vocab.md into $CODEX_HOME/prompts/ (default
//      ~/.codex), with this repo's absolute path baked in
//   2. makes sure $CODEX_HOME/config.toml has a `notify` line pointing at
//      codex/notify.js -- and prints guidance instead of clobbering an
//      existing `notify` (Codex allows only one)
//   3. seeds ./AGENTS.md for the current project (no-op unless `/vocab on`)
//
// Idempotent: safe to re-run after `git pull`.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const posix = (p) => p.replace(/\\/g, '/');
const NOTIFY = posix(path.join(ROOT, 'codex', 'notify.js'));
const CODEX_HOME = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const CONFIG = path.join(CODEX_HOME, 'config.toml');
const say = (s) => console.log(s);

say(`vibe-vocab → Codex install`);
say(`  repo      : ${ROOT}`);
say(`  CODEX_HOME: ${CODEX_HOME}`);
say('');

// 1. custom prompt -----------------------------------------------------------
try {
  const promptsDir = path.join(CODEX_HOME, 'prompts');
  fs.mkdirSync(promptsDir, { recursive: true });
  const tpl = fs.readFileSync(
    path.join(ROOT, 'codex', 'prompts', 'vocab.md'),
    'utf8'
  );
  const dest = path.join(promptsDir, 'vocab.md');
  // Forward slashes in the baked-in paths: they work for `node` args on every
  // platform and avoid backslash-escaping surprises in the shell Codex spawns.
  fs.writeFileSync(dest, tpl.replace(/__VIBE_VOCAB_ROOT__/g, posix(ROOT)), 'utf8');
  say(`✓ /vocab prompt installed  ->  ${dest}`);
} catch (e) {
  say('✗ could not install the /vocab prompt: ' + e.message);
}

// 2. notify hook -----------------------------------------------------------
const notifyLine = `notify = ["node", ${JSON.stringify(NOTIFY)}]`;
try {
  fs.mkdirSync(CODEX_HOME, { recursive: true });
  let toml = '';
  try {
    toml = fs.readFileSync(CONFIG, 'utf8');
  } catch (e) {
    /* new config.toml */
  }
  const existing = toml.match(/^[ \t]*notify[ \t]*=.*$/m);
  if (!existing) {
    const sep = toml && !toml.endsWith('\n') ? '\n' : '';
    fs.writeFileSync(CONFIG, toml + sep + notifyLine + '\n', 'utf8');
    say(`✓ notify hook added  ->  ${CONFIG}`);
  } else if (existing[0].includes('vibe-vocab')) {
    // keep it current if the repo moved
    if (!existing[0].includes(NOTIFY)) {
      fs.writeFileSync(CONFIG, toml.replace(existing[0], notifyLine), 'utf8');
      say(`✓ notify hook path updated  ->  ${CONFIG}`);
    } else {
      say('✓ notify hook already points at vibe-vocab');
    }
  } else {
    say('! ~/.codex/config.toml already has a different `notify` line:');
    say('    ' + existing[0].trim());
    say('  Codex runs only one notifier. To keep both, point `notify` at a');
    say('  small wrapper that runs your current one and then:');
    say(`    node ${NOTIFY} "$1"`);
    say('  (Codex passes the event JSON as the first argument.)');
  }
} catch (e) {
  say('✗ could not update ' + CONFIG + ': ' + e.message);
}

// 3. seed AGENTS.md for the current project --------------------------------
try {
  const line = execFileSync(
    'node',
    [path.join(ROOT, 'codex', 'sync.js'), process.cwd()],
    { encoding: 'utf8' }
  ).trim();
  say('· ' + line);
} catch (e) {
  say('· AGENTS.md not seeded (' + e.message + ')');
}

say('');
say('Next:');
say('  1. restart Codex so it picks up the prompt and config change');
say('  2. in a project:  /vocab on   then   /vocab   to check status');
say('  3. optional global opt-in for every project:  /vocab on always');
