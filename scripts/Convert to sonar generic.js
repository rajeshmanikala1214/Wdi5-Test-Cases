/**
 * scripts/convert-to-sonar-generic.js
 *
 * Converts wdio JUnit XML reports → SonarQube Generic Test Execution format.
 * SonarQube 7.x uses sonar.testExecutionReportPaths to show test counts
 * (passed / failed / skipped) on the dashboard.
 *
 * Generic format spec:
 * https://docs.sonarqube.org/latest/analyzing-source-code/test-coverage/generic-test-data/
 *
 * Run: node scripts/convert-to-sonar-generic.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// Simple XML attribute extractor
function attr(tag, name) {
    const m = new RegExp(`${name}="([^"]*)"`, 'i').exec(tag);
    return m ? m[1] : null;
}

// Parse all testcase elements from XML string
function parseTestcases(xml) {
    const results = [];
    const re = /<testcase([^>]*)>([\s\S]*?)<\/testcase>|<testcase([^>]*)\/>/gi;
    let m;
    while ((m = re.exec(xml)) !== null) {
        const attrs   = m[1] || m[3] || '';
        const inner   = m[2] || '';
        const name     = attr(attrs, 'name')      || 'unknown';
        const classname = attr(attrs, 'classname') || 'unknown';
        const timeStr  = attr(attrs, 'time')       || '0';
        const duration = Math.round(parseFloat(timeStr) * 1000);

        let status = 'ok';
        let message = '';
        if (/<failure/i.test(inner)) {
            status  = 'failure';
            const fm = /<failure[^>]*message="([^"]*)"/.exec(inner);
            message = fm ? fm[1] : 'test failed';
        } else if (/<error/i.test(inner)) {
            status  = 'error';
            const em = /<error[^>]*message="([^"]*)"/.exec(inner);
            message = em ? em[1] : 'test error';
        } else if (/<skipped/i.test(inner)) {
            status = 'skipped';
        }

        results.push({ name, classname, duration, status, message });
    }
    return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────
const JUNIT_DIRS = [
    'reports/junit/wdi5',
    'reports/junit/opa5',
    'reports/junit/uiveri5'
];
const OUT_FILE = 'reports/sonar-test-execution.xml';

let allTests = [];   // { file, name, duration, status, message }

for (const dir of JUNIT_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const xmlFiles = fs.readdirSync(dir).filter(f => f.endsWith('.xml'));
    for (const xmlFile of xmlFiles) {
        const xml      = fs.readFileSync(path.join(dir, xmlFile), 'utf8');
        const testcases = parseTestcases(xml);
        const relFile  = `webapp/test/e2e/${xmlFile.replace('.xml', '.js')}`;
        for (const tc of testcases) {
            allTests.push({ file: relFile, ...tc });
        }
    }
}

// Group by file
const byFile = {};
for (const t of allTests) {
    if (!byFile[t.file]) byFile[t.file] = [];
    byFile[t.file].push(t);
}

// Build Generic Test Execution XML
let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<testExecutions version="1">\n';

for (const [file, tests] of Object.entries(byFile)) {
    xml += `  <file path="${file}">\n`;
    for (const t of tests) {
        const safeName = t.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        xml += `    <testCase name="${safeName}" duration="${t.duration}"`;
        if (t.status === 'ok') {
            xml += '/>\n';
        } else if (t.status === 'skipped') {
            xml += '>\n      <skipped message="skipped"/>\n    </testCase>\n';
        } else {
            const safeMsg = (t.message || t.status).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            xml += `>\n      <failure message="${safeMsg}"/>\n    </testCase>\n`;
        }
    }
    xml += '  </file>\n';
}

xml += '</testExecutions>\n';

fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync(OUT_FILE, xml);

const total   = allTests.length;
const passed  = allTests.filter(t => t.status === 'ok').length;
const failed  = allTests.filter(t => t.status !== 'ok' && t.status !== 'skipped').length;
const skipped = allTests.filter(t => t.status === 'skipped').length;

console.log(`SonarQube generic test execution report written: ${OUT_FILE}`);
console.log(`Total: ${total}  Passed: ${passed}  Failed: ${failed}  Skipped: ${skipped}`);