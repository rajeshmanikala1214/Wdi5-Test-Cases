// wdio.conf.js – WDI5 / WebdriverIO configuration
// Coverage: collected via nyc wrapping wdio, produces coverage/lcov.info
// Reporters: JUnit XML (SonarQube test counts) + JSON (archive)

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

    // ui5 service only – chromedriver binary is already on PATH in ppiper/node-browsers
    services: ['ui5'],

    reporters: [
        'spec',
        ['junit', {
            outputDir: path.join(__dirname, 'reports/junit/wdi5'),
            outputFileFormat: (opts) => `wdi5-results-${opts.cid}.xml`,
            // ── These classname/suitename settings make SonarQube show test names
            classNameTemplate: (v) => `${v.activeFeatureName}`,
            titleTemplate:     (v) => v.title,
            errorOptions: {
                error: 'message',
                failure: 'message',
                stacktrace: 'stack'
            }
        }],
        ['json', {
            outputDir: path.join(__dirname, 'reports/json/wdi5'),
            outputFile: 'wdi5-results.json'
        }]
    ],

    baseUrl: process.env.BASE_URL || 'http://localhost:8080',

    // ── Hooks ────────────────────────────────────────────────────────────────
    onPrepare() {
        ['reports/junit/wdi5', 'reports/json/wdi5', 'coverage', 'reports/screenshots']
            .forEach(d => fs.mkdirSync(d, { recursive: true }));
        console.log('Report directories created.');
    },

    afterTest(test, _ctx, { error }) {
        if (error) {
            const ts   = new Date().toISOString().replace(/[:.]/g, '-');
            const name = test.title.replace(/\W/g, '_').substring(0, 50);
            fs.mkdirSync('reports/screenshots', { recursive: true });
            browser.saveScreenshot(`reports/screenshots/${name}_${ts}.png`).catch(() => {});
        }
    },

    // Collect browser-side coverage after each test session
    after(result, capabilities, specs) {
        // If the app instruments itself with window.__coverage__, collect it
        try {
            const coverage = browser.execute(() => window.__coverage__ || null);
            if (coverage) {
                const outDir = path.join(__dirname, '.nyc_output');
                fs.mkdirSync(outDir, { recursive: true });
                const file = path.join(outDir, `coverage-${Date.now()}.json`);
                fs.writeFileSync(file, JSON.stringify(coverage));
                console.log('Browser coverage written to', file);
            }
        } catch (e) {
            // App not instrumented – coverage from nyc wrapping wdio process instead
        }
    }
};