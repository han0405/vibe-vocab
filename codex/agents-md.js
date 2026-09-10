'use strict';
// Read and rewrite the VibeVocab-managed block inside a project's AGENTS.md.
//
// Codex CLI loads AGENTS.md into every session's context, so this is how the
// Codex adapter does what Claude Code's SessionStart hook does. The block is
// delimited by HTML-comment markers and replaced in place; everything else in
// the file is left exactly as the user wrote it. An empty rule text removes the
// block (and deletes the file if that leaves it empty).
const fs = require('fs');
const path = require('path');

const START =
  '<!-- VIBEVOCAB:START (managed by the vibe-vocab plugin — do not edit this block) -->';
const END = '<!-- VIBEVOCAB:END -->';

function agentsPath(cwd) {
  return path.join(cwd || process.cwd(), 'AGENTS.md');
}

function blockRe() {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Swallow surrounding blank lines so repeated rewrites don't accrete them.
  return new RegExp(`\\n*${esc(START)}[\\s\\S]*?${esc(END)}\\n*`, 'm');
}

// Replace / insert / remove the managed block. `ruleText` is the full injected
// ruleset from buildInjectedRules(); '' means VibeVocab is off for this project.
// Returns { changed, path }. Throws only on a genuine write failure.
function writeAgentsBlock(cwd, ruleText) {
  const file = agentsPath(cwd);
  let doc = '';
  try {
    doc = fs.readFileSync(file, 'utf8');
  } catch (e) {
    /* AGENTS.md doesn't exist yet */
  }

  const body = (ruleText || '').trim();
  const block = body ? `${START}\n\n${body}\n\n${END}\n` : '';
  const re = blockRe();
  const had = re.test(doc);

  let next;
  if (had) {
    next = doc.replace(re, block ? `\n\n${block}` : '\n');
  } else if (block) {
    const head = doc.replace(/\s*$/, '');
    next = head ? `${head}\n\n${block}` : block;
  } else {
    return { changed: false, path: file };
  }
  next = next.replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n');
  if (next && !next.endsWith('\n')) next += '\n';

  if (next === doc) return { changed: false, path: file };

  if (next.trim()) {
    fs.writeFileSync(file, next, 'utf8');
  } else {
    try {
      fs.unlinkSync(file);
    } catch (e) {
      /* nothing to remove */
    }
  }
  return { changed: true, path: file };
}

// The managed block's current contents (without the markers), or '' if absent.
function readAgentsBlock(cwd) {
  try {
    const doc = fs.readFileSync(agentsPath(cwd), 'utf8');
    const m = doc.match(blockRe());
    if (!m) return '';
    return m[0]
      .replace(new RegExp(START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '')
      .replace(new RegExp(END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '')
      .trim();
  } catch (e) {
    return '';
  }
}

module.exports = { writeAgentsBlock, readAgentsBlock, agentsPath, START, END };
