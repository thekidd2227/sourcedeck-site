#!/usr/bin/env node
// scripts/check-demo-parity.js
//
// Asserts the SourceDeck parity-protected pair stays byte-identical:
//   app/demo/index.html              ← canonical
//   app/downloads/sourcedeck-lcc.html ← mirror
//
// Why this exists:
//   The download mirror is intentionally a byte-exact copy of the demo.
//   If they drift, downstream users get a different artifact than the
//   one they previewed. This guardrail fails fast at validation time
//   instead of waiting for someone to notice in production.
//
// Usage:
//   node scripts/check-demo-parity.js
//
// Exit code:
//   0 = identical
//   1 = missing file or sha mismatch
//
// No external dependencies. Pure Node.

'use strict';
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

function findRepoRoot(start) {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return start;
}
const REPO = findRepoRoot(__dirname);

const A = path.join(REPO, 'app', 'demo', 'index.html');
const B = path.join(REPO, 'app', 'downloads', 'sourcedeck-lcc.html');

function sha256OfFile(p) {
  const buf = fs.readFileSync(p);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

let problems = 0;
if (!fs.existsSync(A)) { console.log('DEMO PARITY FAIL: missing ' + path.relative(REPO, A)); problems++; }
if (!fs.existsSync(B)) { console.log('DEMO PARITY FAIL: missing ' + path.relative(REPO, B)); problems++; }

if (problems > 0) process.exit(1);

const shaA = sha256OfFile(A);
const shaB = sha256OfFile(B);

if (shaA !== shaB) {
  console.log('DEMO PARITY FAIL: files are not byte-identical');
  console.log('  ' + path.relative(REPO, A) + '  sha256=' + shaA);
  console.log('  ' + path.relative(REPO, B) + '  sha256=' + shaB);
  console.log('Action: re-sync the mirror so both files match. Either');
  console.log('  (a) copy demo over the download mirror, or');
  console.log('  (b) make the same edit in both files in the same commit.');
  process.exit(1);
}

console.log('DEMO PARITY OK');
console.log('  ' + path.relative(REPO, A));
console.log('  ' + path.relative(REPO, B));
console.log('  sha256 = ' + shaA);
process.exit(0);
