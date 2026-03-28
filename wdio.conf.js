// wdio.conf.js – WDI5 / WebdriverIO configuration
// JUnit reporter is configured to emit the real spec file path in
// the <testsuite file="..."> attribute so SonarQube can match tests
// to indexed test files and display pass/fail counts on the dashboard.

const path = require('path');
const fs   = require('fs');

exports.config = {
    runner: 'local',

    specs: ['./webapp/test/e2e/**/*.test.js'],
    exclude: [],

    maxInstances: 1,

    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: [
                '--headless',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        }
    }],

    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    },

    // ui5 service only – no chromedriver service needed
    services: ['ui5'],

    reporters: [
        'spec',

        // ── JUnit reporter ─────────────────────────────────────────────────
        // suiteName  → written into <testsuite name="...">
        // classname  → written into <testcase classname="...">
        // The "file" attribute in <testsuite> is what SonarQube Generic Test
        // Execution needs. wdio/junit-reporter sets it from the spec file path.
        ['junit', {
            outputDir: path.join(__dirname, 'reports/junit/wdi5'),
            outputFileFormat: (opts) => `wdi5-results-${opts.cid}.xml`,

            // classname = suite description (used in converter to build full test name)
            classNameTemplate: (v) => v.activeFeatureName || v.title || 'ui5',

            // suite name = spec filename (shown in SonarQube test file list)
            suiteName: (v) => {
                if (v && v.file) {
                    // Convert absolute → relative path e.g.
                    // /var/jenkins_home/.../webapp/test/e2e/basic.test.js
                    // → webapp/test/e2e/basic.test.js
                    const idx = v.file.indexOf('/webapp/');
                    return idx !== -1 ? v.file.slice(idx + 1) : v.file;
                }
                return 'ui5-tests';
            },

            errorOptions: {
                error:      'message',
                failure:    'message',
                stacktrace: 'stack'
            },

            // Add spec file path as <property> inside each <testsuite>
            // so the converter can always find the real path
            addFileAttribute: true,   // wdio ≥8: emits file="..." on <testsuite>
        }],

        // ── JSON reporter ──────────────────────────────────────────────────
        ['json', {
            outputDir:  path.join(__dirname, 'reports/json/wdi5'),
            outputFile: 'wdi5-results.json'
        }]
    ],

    baseUrl: process.env.BASE_URL || 'http://localhost:8080',

    // ── Lifecycle hooks ───────────────────────────────────────────────────────

    onPrepare() {
        ['reports/junit/wdi5', 'reports/json/wdi5',
         'coverage', '.nyc_output', 'reports/screenshots']
            .forEach(d => fs.mkdirSync(d, { recursive: true }));
        console.log('[wdio] Directories created.');
    },

    afterTest(test, _ctx, { error }) {
        // Screenshot on failure
        if (error) {
            try {
                const ts   = new Date().toISOString().replace(/[:.]/g, '-');
                const name = (test.title || 'test').replace(/\W+/g, '_').slice(0, 50);
                fs.mkdirSync('reports/screenshots', { recursive: true });
                browser.saveScreenshot(`reports/screenshots/${name}_${ts}.png`);
            } catch (_) { /* ignore */ }
        }
    },

    after() {
        // Collect browser-side coverage if app is instrumented with window.__coverage__
        // (requires istanbul-middleware or @istanbuljs/schema on the app side)
        try {
            const coverage = browser.execute(() =>
                typeof window !== 'undefined' ? (window.__coverage__ || null) : null
            );
            if (coverage && Object.keys(coverage).length > 0) {
                const outDir = path.join(__dirname, '.nyc_output');
                fs.mkdirSync(outDir, { recursive: true });
                const outFile = path.join(outDir, `coverage-${Date.now()}.json`);
                fs.writeFileSync(outFile, JSON.stringify(coverage));
                console.log('[wdio] Browser coverage saved to', outFile);
            }
        } catch (_) {
            // App not instrumented with window.__coverage__ — that's OK
        }
    }
};