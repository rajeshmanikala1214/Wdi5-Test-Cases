#!/usr/bin/env node
/**
 * convert-to-sonar-generic.js  (memory-safe version)
 *
 * Processes JUnit XML files ONE AT A TIME using a simple line-by-line
 * SAX-style state machine — no regex on giant strings, no full-file
 * buffers held in memory simultaneously.
 *
 * Outputs:
 *   reports/junit/combined/all-results.xml   ← merged JUnit (streamed)
 *   reports/sonar/test-execution.xml         ← Sonar Generic format
 *   reports/test-summary.json                ← machine-readable summary
 */
'use strict';

const fs   = require('fs');
const path = require('path');

// ── XML helpers ─────────────────────────────────────────────────────────────
function escXml(s) {
  return String(s ?? '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

/** Pull one attribute value out of an opening-tag string. */
function attr(tagStr, name, fallback) {
  const re = new RegExp('\\b' + name + '=["\']([^"\']*)["\']');
  const m  = tagStr.match(re);
  return m ? m[1] : (fallback ?? '');
}

// ── file discovery ───────────────────────────────────────────────────────────
function findXml(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) out.push(...findXml(full));
    else if (f.endsWith('.xml'))          out.push(full);
  }
  return out;
}

const roots    = ['reports/junit/wdi5', 'reports/junit/opa5', 'reports/junit/uiveri5'];
const xmlFiles = roots.flatMap(findXml);

console.log('\n══════════════════════════════════════════════════');
console.log('  UI5 Test Report Generator  (memory-safe)');
console.log('══════════════════════════════════════════════════');
console.log('Found ' + xmlFiles.length + ' XML file(s):');
xmlFiles.forEach(f => console.log('  ' + f));
console.log('');

// ── output file handles (streamed, never fully buffered) ─────────────────────
fs.mkdirSync('reports/junit/combined', { recursive: true });
fs.mkdirSync('reports/sonar',          { recursive: true });

const junitOut = fs.openSync('reports/junit/combined/all-results.xml', 'w');
const sonarOut = fs.openSync('reports/sonar/test-execution.xml',        'w');

function jWrite(s) { fs.writeSync(junitOut, s); }
function sWrite(s) { fs.writeSync(sonarOut, s); }

// Headers — totals go at the end so we write a placeholder and fix it later
// Strategy: write to tmp file, prepend header at the end.
const junitTmpPath = 'reports/junit/combined/.suites.tmp';
const junitTmp     = fs.openSync(junitTmpPath, 'w');
function jtWrite(s) { fs.writeSync(junitTmp, s); }

sWrite('<?xml version="1.0" encoding="UTF-8"?>\n');
sWrite('<testExecutions version="1">\n');

// ── totals ───────────────────────────────────────────────────────────────────
let gTests = 0, gFail = 0, gErr = 0, gSkip = 0, gTime = 0;
const fwMap  = { wdi5:{t:0,f:0,e:0,s:0}, opa5:{t:0,f:0,e:0,s:0}, uiveri5:{t:0,f:0,e:0,s:0} };

// For the console breakdown (only names — not full bodies — so low memory)
const passedList  = [];
const failedList  = [];
const skippedList = [];

// ── Process each file individually ──────────────────────────────────────────
for (const file of xmlFiles) {
  const framework = file.includes('/wdi5/')    ? 'wdi5'
                  : file.includes('/opa5/')    ? 'opa5'
                  : file.includes('/uiveri5/') ? 'uiveri5' : 'unknown';

  // Read file in one go — individual files are small (1-20 KB each)
  const src = fs.readFileSync(file, 'utf8');

  // ── Simple state-machine parser (avoids catastrophic backtracking) ──────
  // We walk the XML character by character tracking depth.
  // States: OUTER → in <testsuite> → in <testcase>

  let pos = 0;

  while (pos < src.length) {
    // Find next tag
    const tagStart = src.indexOf('<', pos);
    if (tagStart === -1) break;

    const tagEnd = src.indexOf('>', tagStart);
    if (tagEnd === -1) break;

    const rawTag = src.slice(tagStart, tagEnd + 1);
    pos = tagEnd + 1;

    // ── <testsuite ...> ──────────────────────────────────────────────────
    if (/^<testsuite\b/i.test(rawTag) && !rawTag.startsWith('</') && !rawTag.startsWith('<testsuites')) {
      const sTests = parseInt(attr(rawTag, 'tests'),    10) || 0;
      const sFail  = parseInt(attr(rawTag, 'failures'), 10) || 0;
      const sErr   = parseInt(attr(rawTag, 'errors'),   10) || 0;
      const sSkip  = parseInt(attr(rawTag, 'skipped'),  10) || 0;
      const sTime  = parseFloat(attr(rawTag, 'time'))       || 0;

      gTests += sTests; gFail += sFail; gErr += sErr; gSkip += sSkip; gTime += sTime;
      if (fwMap[framework]) {
        fwMap[framework].t += sTests;
        fwMap[framework].f += sFail;
        fwMap[framework].e += sErr;
        fwMap[framework].s += sSkip;
      }

      const suiteName = attr(rawTag, 'name');
      const suiteFile = attr(rawTag, 'file');

      // Write suite opening to merged JUnit
      jtWrite('  ' + rawTag + '\n');

      // Find the end of this testsuite block (no nesting in JUnit)
      const suiteEnd = src.indexOf('</testsuite>', pos);
      const suiteBody = suiteEnd !== -1 ? src.slice(pos, suiteEnd) : '';
      pos = suiteEnd !== -1 ? suiteEnd + '</testsuite>'.length : src.length;

      // Write suite body + closing tag
      jtWrite(suiteBody);
      jtWrite('  </testsuite>\n');

      // ── parse testcases within this suite body ────────────────────────
      // We use a simple forward scan — suiteBody is small per file
      let cp = 0;
      while (cp < suiteBody.length) {
        const tcStart = suiteBody.indexOf('<testcase', cp);
        if (tcStart === -1) break;

        const tcTagEnd = suiteBody.indexOf('>', tcStart);
        if (tcTagEnd === -1) break;

        const selfClose = suiteBody[tcTagEnd - 1] === '/';
        const tcTag     = suiteBody.slice(tcStart, tcTagEnd + 1);

        let tcBody = '';
        if (!selfClose) {
          const tcClose = suiteBody.indexOf('</testcase>', tcTagEnd);
          if (tcClose !== -1) {
            tcBody = suiteBody.slice(tcTagEnd + 1, tcClose);
            cp     = tcClose + '</testcase>'.length;
          } else {
            cp = tcTagEnd + 1;
          }
        } else {
          cp = tcTagEnd + 1;
        }

        // ── determine status ────────────────────────────────────────────
        const name      = escXml(attr(tcTag, 'name'));
        const classname = attr(tcTag, 'classname');
        const fileAttr  = attr(tcTag, 'file');
        const timeMs    = Math.round((parseFloat(attr(tcTag, 'time', '0')) || 0) * 1000);

        let status  = 'OK';
        let message = '';

        if (/<skipped/i.test(tcBody)) {
          status = 'SKIPPED';
        } else if (/<failure/i.test(tcBody)) {
          status  = 'FAILED';
          const fm = tcBody.match(/<failure[^>]*message="([^"]*)"/);
          const ft = tcBody.match(/<failure[^>]*>([\s\S]*?)<\/failure>/);
          const raw = fm ? fm[1] : (ft ? ft[1].trim().replace(/\n.*/s, '') : 'Test failure');
          message = escXml(raw.slice(0, 200));
        } else if (/<error/i.test(tcBody)) {
          status  = 'ERROR';
          const em = tcBody.match(/<error[^>]*message="([^"]*)"/);
          message = escXml((em ? em[1] : 'Test error').slice(0, 200));
        }

        // ── resolve spec file path ──────────────────────────────────────
        let specFile = fileAttr || suiteFile || '';
        // Strip absolute prefix that wdio injects
        specFile = specFile
          .replace(/^file:\/+/, '')
          .replace(/^\/var\/jenkins_home\/workspace\/[^/]+\//, '');

        if (!specFile || /^chrome\s/i.test(specFile) || specFile.startsWith('/')) {
          if (classname && classname.startsWith('webapp')) {
            specFile = classname.replace(/\./g, '/') + '.js';
          } else {
            const slug = (suiteName || 'unknown')
              .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            specFile = 'webapp/test/e2e/' + slug + '.test.js';
          }
        }

        // ── write to Sonar Generic XML ──────────────────────────────────
        // We group by specFile by accumulating into a per-file buffer.
        // Since individual files are small this is fine.
        if (!global._sonarBuf) global._sonarBuf = new Map();
        if (!global._sonarBuf.has(specFile)) global._sonarBuf.set(specFile, []);

        const escapedName = name; // already escaped above
        if (status === 'OK' || status === 'SKIPPED') {
          global._sonarBuf.get(specFile).push(
            '    <testCase name="' + escapedName + '" duration="' + timeMs + '" status="' + status + '"/>'
          );
        } else {
          const tag = status === 'FAILED' ? 'failure' : 'error';
          global._sonarBuf.get(specFile).push(
            '    <testCase name="' + escapedName + '" duration="' + timeMs + '" status="' + status + '">\n' +
            '      <' + tag + ' message="' + message + '"/>\n' +
            '    </testCase>'
          );
        }

        // ── console tracking ────────────────────────────────────────────
        const label = '[' + framework.toUpperCase() + '] ' + attr(tcTag, 'name').slice(0, 70);
        if (status === 'OK')                       passedList.push(label);
        else if (status === 'SKIPPED')             skippedList.push(label);
        else failedList.push(label + (message ? '\n         ↳ ' + message.replace(/&[a-z]+;/g,'').slice(0,100) : ''));
      }
      // end testcase loop
    }
    // end testsuite handling
  }
  // Done with this file — release the string from memory
  // (GC will collect it on next cycle)
}

// ── Flush Sonar Generic XML ──────────────────────────────────────────────────
if (global._sonarBuf) {
  for (const [filePath, lines] of global._sonarBuf.entries()) {
    sWrite('  <file path="' + escXml(filePath) + '">\n');
    for (const l of lines) sWrite(l + '\n');
    sWrite('  </file>\n');
  }
  global._sonarBuf = null; // release
}
sWrite('</testExecutions>\n');
fs.closeSync(sonarOut);

// ── Finalise merged JUnit (prepend header) ───────────────────────────────────
fs.closeSync(junitTmp);

const header = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<testsuites name="UI5-All-Tests"',
  '            tests="'    + gTests + '"',
  '            failures="' + gFail  + '"',
  '            errors="'   + gErr   + '"',
  '            skipped="'  + gSkip  + '"',
  '            time="'     + gTime.toFixed(3) + '">',
  ''
].join('\n');

jWrite(header);

// Stream the tmp body into the final file in 64 KB chunks
const CHUNK = 64 * 1024;
const tmpFd = fs.openSync(junitTmpPath, 'r');
const buf   = Buffer.allocUnsafe(CHUNK);
let   bytesRead;
while ((bytesRead = fs.readSync(tmpFd, buf, 0, CHUNK)) > 0) {
  fs.writeSync(junitOut, buf, 0, bytesRead);
}
fs.closeSync(tmpFd);
fs.unlinkSync(junitTmpPath);

jWrite('\n</testsuites>\n');
fs.closeSync(junitOut);

// ── Console breakdown ────────────────────────────────────────────────────────
console.log('┌─────────────────────────────────────────────────────────────');
console.log('│  FULL TEST BREAKDOWN');
console.log('└─────────────────────────────────────────────────────────────');

if (failedList.length) {
  console.log('\n❌  FAILED / ERROR (' + failedList.length + '):');
  failedList.forEach(t => console.log('  [FAIL] ' + t));
}
if (passedList.length) {
  console.log('\n✅  PASSED (' + passedList.length + '):');
  passedList.forEach(t => console.log('  [PASS] ' + t));
}
if (skippedList.length) {
  console.log('\n⏭   SKIPPED (' + skippedList.length + '):');
  skippedList.forEach(t => console.log('  [SKIP] ' + t));
}

console.log('\n══════════════════════════════════════════════════');
console.log('  SUMMARY');
console.log('══════════════════════════════════════════════════');
console.log('  Total   : ' + gTests);
console.log('  Passed  : ' + passedList.length);
console.log('  Failed  : ' + (gFail + gErr));
console.log('  Skipped : ' + gSkip);
console.log('  Time    : ' + gTime.toFixed(1) + 's');
console.log('');
['wdi5','opa5','uiveri5'].forEach(fw => {
  const c = fwMap[fw];
  console.log('  [' + fw.toUpperCase() + ']  tests=' + c.t + '  fail=' + (c.f+c.e) + '  skip=' + c.s);
});
console.log('══════════════════════════════════════════════════\n');

// ── JSON summary ─────────────────────────────────────────────────────────────
const sonarBufKeys = global._sonarBuf ? [...global._sonarBuf.keys()] : [];
const summary = {
  timestamp   : new Date().toISOString(),
  totals      : { tests: gTests, passed: passedList.length, failed: gFail + gErr, skipped: gSkip, time: +gTime.toFixed(1) },
  byFramework : fwMap,
  specFiles   : sonarBufKeys.length ? sonarBufKeys : passedList.concat(failedList).concat(skippedList).map(l => l.split(']')[1]?.trim().split(' ')[0] ?? '').filter(Boolean)
};
fs.writeFileSync('reports/test-summary.json', JSON.stringify(summary, null, 2), 'utf8');

console.log('✅  Merged JUnit  → reports/junit/combined/all-results.xml');
console.log('✅  Sonar Generic → reports/sonar/test-execution.xml');
console.log('✅  Summary JSON  → reports/test-summary.json');