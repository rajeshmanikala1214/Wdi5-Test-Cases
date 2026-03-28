/**
 * scripts/convert-to-sonar-generic.js
 *
 * Converts wdio JUnit XML → SonarQube Generic Test Execution XML.
 *
 * KEY FIX: wdio JUnit reporter puts the REAL test file path in the
 * <testsuite file="..."> attribute.  We extract that so SonarQube can
 * match the testCase to an indexed test file and show pass/fail counts
 * on the Measures → Tests dashboard.
 *
 * SonarQube Generic Test Execution spec (version 1):
 *   <testExecutions version="1">
 *     <file path="relative/path/to/test.js">
 *       <testCase name="suite > test" duration="123"/>           ← passed
 *       <testCase name="suite > test" duration="123">
 *         <failure message="reason"/>                            ← failed
 *       </testCase>
 *       <testCase name="suite > test" duration="0">
 *         <skipped message="skipped"/>                           ← skipped
 *       </testCase>
 *     </file>
 *   </testExecutions>
 *
 * The path must be relative to the project root (sonar.projectBaseDir).
 * SonarQube must have indexed that file under sonar.tests.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── XML helpers ──────────────────────────────────────────────────────────────

/** Extract a single attribute value from a tag string */
function attr(tagStr, name) {
    const re = new RegExp(`\\s${name}="([^"]*)"`, 'i');
    const m  = re.exec(tagStr);
    return m ? m[1] : null;
}

/** Escape special XML chars */
function esc(s) {
    return (s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/** Convert an absolute or workspace-relative path to a project-relative path */
function toRelative(filePath) {
    if (!filePath) return null;

    // Strip the workspace prefix that Jenkins injects
    // e.g. /var/jenkins_home/workspace/UI5-Framework-Tests/webapp/test/e2e/basic.test.js
    //   → webapp/test/e2e/basic.test.js
    const markers = [
        '/webapp/',
        '/test/',
        'webapp/',
    ];
    for (const marker of markers) {
        const idx = filePath.indexOf(marker);
        if (idx !== -1) {
            // Return from "webapp/" onward
            const webappIdx = filePath.indexOf('/webapp/');
            if (webappIdx !== -1) return filePath.slice(webappIdx + 1); // drop leading /
            return filePath.slice(idx);
        }
    }

    // Already relative?
    if (!path.isAbsolute(filePath)) return filePath;

    return null; // can't determine
}

// ── Parse a single JUnit XML file ────────────────────────────────────────────

/**
 * Returns an array of:
 *   { file: 'webapp/test/e2e/basic.test.js', name: 'suite > test',
 *     duration: 123, status: 'ok'|'failure'|'error'|'skipped', message: '' }
 */
function parseJUnit(xml) {
    const results = [];

    // Match every <testsuite> block
    const suiteRe = /<testsuite([^>]*)>([\s\S]*?)<\/testsuite>/gi;
    let suiteMatch;

    while ((suiteMatch = suiteRe.exec(xml)) !== null) {
        const suiteAttrs = suiteMatch[1];
        const suiteBody  = suiteMatch[2];

        // wdio puts the real file path in the "file" attribute of <testsuite>
        let filePath = attr(suiteAttrs, 'file') || attr(suiteAttrs, 'name') || '';

        // Convert to project-relative path
        const relFile = toRelative(filePath) || 'webapp/test/e2e/unknown.test.js';

        // Parse every <testcase> inside this suite
        const caseRe = /<testcase([^>]*)>([\s\S]*?)<\/testcase>|<testcase([^>]*)\/>/gi;
        let caseMatch;

        while ((caseMatch = caseRe.exec(suiteBody)) !== null) {
            const caseAttrs = caseMatch[1] || caseMatch[3] || '';
            const inner     = caseMatch[2] || '';

            const name     = attr(caseAttrs, 'name')      || 'unknown';
            const suite    = attr(caseAttrs, 'classname') || '';
            const timeStr  = attr(caseAttrs, 'time')      || '0';
            const duration = Math.round(parseFloat(timeStr) * 1000);

            // Full test name = "Suite > Test Name"
            const fullName = suite ? `${suite} > ${name}` : name;

            let status  = 'ok';
            let message = '';

            if (/<failure/i.test(inner)) {
                status  = 'failure';
                const fm = /<failure[^>]*message="([^"]*)"/i.exec(inner);
                if (!fm) {
                    // message might be in CDATA / element text
                    const txt = inner.replace(/<[^>]+>/g, '').trim();
                    message = txt.substring(0, 300);
                } else {
                    message = fm[1];
                }
            } else if (/<error/i.test(inner)) {
                status  = 'error';
                const em = /<error[^>]*message="([^"]*)"/i.exec(inner);
                message = em ? em[1] : 'test error';
            } else if (/<skipped/i.test(inner)) {
                status = 'skipped';
            }

            results.push({ file: relFile, name: fullName, duration, status, message });
        }
    }

    return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const JUNIT_DIRS = [
    'reports/junit/wdi5',
    'reports/junit/opa5',
    'reports/junit/uiveri5',
];
const OUT_FILE   = 'reports/sonar-test-execution.xml';
const SUMMARY_FILE = 'reports/test-summary.json';

let allTests = [];

for (const dir of JUNIT_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const xmlFiles = fs.readdirSync(dir)
        .filter(f => f.endsWith('.xml'))
        .sort();

    for (const xmlFile of xmlFiles) {
        const xml      = fs.readFileSync(path.join(dir, xmlFile), 'utf8');
        const testcases = parseJUnit(xml);
        allTests = allTests.concat(testcases);
    }
}

// ── Group by file ─────────────────────────────────────────────────────────────
const byFile = {};
for (const t of allTests) {
    if (!byFile[t.file]) byFile[t.file] = [];
    byFile[t.file].push(t);
}

// ── Build Generic Test Execution XML ─────────────────────────────────────────
let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<testExecutions version="1">\n';

for (const [file, tests] of Object.entries(byFile)) {
    xml += `  <file path="${esc(file)}">\n`;
    for (const t of tests) {
        xml += `    <testCase name="${esc(t.name)}" duration="${t.duration}"`;
        if (t.status === 'ok') {
            xml += '/>\n';
        } else if (t.status === 'skipped') {
            xml += '>\n      <skipped message="skipped"/>\n    </testCase>\n';
        } else {
            xml += `>\n      <failure message="${esc(t.message || t.status)}"/>\n    </testCase>\n`;
        }
    }
    xml += '  </file>\n';
}
xml += '</testExecutions>\n';

fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync(OUT_FILE, xml);

// ── Human-readable summary ────────────────────────────────────────────────────
const total   = allTests.length;
const passed  = allTests.filter(t => t.status === 'ok').length;
const failed  = allTests.filter(t => t.status === 'failure' || t.status === 'error').length;
const skipped = allTests.filter(t => t.status === 'skipped').length;

// Per-file breakdown
const fileBreakdown = {};
for (const [file, tests] of Object.entries(byFile)) {
    fileBreakdown[file] = {
        total:   tests.length,
        passed:  tests.filter(t => t.status === 'ok').length,
        failed:  tests.filter(t => t.status === 'failure' || t.status === 'error').length,
        skipped: tests.filter(t => t.status === 'skipped').length,
        failedTests: tests
            .filter(t => t.status === 'failure' || t.status === 'error')
            .map(t => ({ name: t.name, message: t.message })),
        passedTests: tests
            .filter(t => t.status === 'ok')
            .map(t => t.name),
    };
}

const summary = {
    generatedAt: new Date().toISOString(),
    total, passed, failed, skipped,
    byFile: fileBreakdown,
};

fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2));

// ── Console output ────────────────────────────────────────────────────────────
console.log('\n========================================');
console.log('  TEST EXECUTION SUMMARY');
console.log('========================================');
console.log(`  Total  : ${total}`);
console.log(`  ✅ Passed : ${passed}`);
console.log(`  ❌ Failed : ${failed}`);
console.log(`  ⏭  Skipped: ${skipped}`);
console.log('----------------------------------------');

for (const [file, stats] of Object.entries(fileBreakdown)) {
    if (stats.total === 0) continue;
    const icon = stats.failed > 0 ? '❌' : '✅';
    console.log(`\n${icon} ${file}`);
    console.log(`   Passed: ${stats.passed}  Failed: ${stats.failed}  Skipped: ${stats.skipped}`);
    if (stats.failedTests.length > 0) {
        console.log('   FAILED TESTS:');
        for (const ft of stats.failedTests) {
            console.log(`     ✖ ${ft.name}`);
            if (ft.message) {
                console.log(`       → ${ft.message.substring(0, 120)}`);
            }
        }
    }
}

console.log('\n========================================');
console.log(`Sonar XML  : ${OUT_FILE}`);
console.log(`Summary    : ${SUMMARY_FILE}`);
console.log('========================================\n');