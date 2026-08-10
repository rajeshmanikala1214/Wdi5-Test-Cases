#!/usr/bin/env node
/**
 * Convert WebdriverIO JUnit reports (reports/junit/wdi5/*.log|*.xml, which are
 * standard JUnit XML despite the .log extension) into a single SonarQube
 * "Generic Test Execution" report at reports/test-execution.xml.
 *
 * Sonar's sonar.testExecutionReportPaths does NOT accept JUnit XML — it needs
 * the <testExecutions> schema. This script produces exactly that.
 *
 * No new dependencies: fast-xml-parser ships transitively with wdio.
 */
const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const IN_DIR = process.env.WDI5_JUNIT_DIR || 'reports/junit/wdi5';
const OUT = process.env.WDI5_SONAR_OUT || 'reports/test-execution.xml';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
const asArray = x => (x == null ? [] : Array.isArray(x) ? x : [x]);

// Sonar needs a path relative to the project base dir. WDIO 8 (ESM) emits spec
// names as file:// URLs, so the junit "file" attr looks like
// "file://./webapp/test/e2e/x.test.js". Strip the scheme, URL-decode, drop the
// leading "./", normalize separators, and relativize any absolute remainder.
function normalizePath(raw) {
  let p = String(raw).replace(/\\/g, '/').replace(/^file:\/\//i, '');
  try { p = decodeURIComponent(p); } catch (_) { /* leave as-is */ }
  p = p.replace(/^\.\//, '');
  if (path.isAbsolute(p)) p = path.relative(process.cwd(), p).replace(/\\/g, '/');
  return p;
}

const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => /\.(log|xml)$/i.test(f))
    .map(f => path.join(dir, f));
}

// path -> [{name, duration, status, message, detail}]
const byFile = new Map();

for (const file of collectFiles(IN_DIR)) {
  let doc;
  try { doc = parser.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.warn(`[junit-to-sonar] skip unparseable ${file}: ${e.message}`); continue; }

  // testsuites may be present or the root may be a single testsuite
  const suites = [
    ...asArray(doc?.testsuites?.testsuite),
    ...(doc?.testsuite ? asArray(doc.testsuite) : [])
  ];

  for (const suite of suites) {
    for (const tc of asArray(suite?.testcase)) {
      const rawPath = tc['@_file'] || suite['@_file'] ||
        'webapp/test/e2e/' + String(tc['@_classname'] || suite['@_name'] || 'unknown') + '.test.js';
      const filePath = normalizePath(rawPath);
      const secs = parseFloat(tc['@_time']);
      const duration = Number.isFinite(secs) ? Math.max(0, Math.round(secs * 1000)) : 0;
      const cls = tc['@_classname'] ? `${tc['@_classname']} > ` : '';
      const name = cls + (tc['@_name'] || 'unnamed');

      let status = 'ok', message = '', detail = '';
      if (tc.skipped !== undefined) {
        status = 'skipped';
        message = tc.skipped?.['@_message'] || 'skipped';
      } else if (tc.failure !== undefined) {
        const fl = asArray(tc.failure)[0] || {};
        status = 'failure';
        message = fl['@_message'] || 'assertion failed';
        detail = fl['#text'] || tc['system-err'] || '';
      } else if (tc.error !== undefined) {
        const er = asArray(tc.error)[0] || {};
        status = 'error';
        message = er['@_message'] || 'error';
        detail = er['#text'] || tc['system-err'] || '';
      }
      if (!byFile.has(filePath)) byFile.set(filePath, []);
      byFile.get(filePath).push({ name, duration, status, message, detail });
    }
  }
}

let out = '<?xml version="1.0" encoding="UTF-8"?>\n<testExecutions version="1">\n';
let total = 0, pass = 0, fail = 0, err = 0, skip = 0;
for (const [filePath, cases] of byFile) {
  out += `  <file path="${esc(filePath)}">\n`;
  for (const c of cases) {
    total++;
    out += `    <testCase name="${esc(c.name)}" duration="${c.duration}"`;
    if (c.status === 'ok') { pass++; out += '/>\n'; }
    else {
      out += '>\n';
      const tag = c.status === 'skipped' ? 'skipped' : c.status;
      if (c.status === 'skipped') skip++; else if (c.status === 'error') err++; else fail++;
      out += `      <${tag} message="${esc(c.message)}">${esc(c.detail)}</${tag}>\n`;
      out += '    </testCase>\n';
    }
  }
  out += '  </file>\n';
}
out += '</testExecutions>\n';

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out, 'utf8');
console.log(`[junit-to-sonar] ${IN_DIR} -> ${OUT} | files=${byFile.size} tests=${total} pass=${pass} fail=${fail} error=${err} skipped=${skip}`);