// ─────────────────────────────────────────────────────────────────────────────
// wdio.conf.js  –  WDI5 / WebdriverIO configuration
// Reporters : JUnit XML  (→ SonarQube)  +  JSON  (→ archive)
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');

exports.config = {
    runner: 'local',

    // ── Test specs ───────────────────────────────────────────────────────────
    specs: ['./webapp/test/e2e/**/*.test.js'],
    exclude: [],
    maxInstances: 1,

    // ── Browser ──────────────────────────────────────────────────────────────
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

    // ── Framework ────────────────────────────────────────────────────────────
    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    },

    // ── Services ─────────────────────────────────────────────────────────────
    services: ['ui5', 'chromedriver'],

    // ── Reporters  ───────────────────────────────────────────────────────────
    // JUnit XML  → consumed by Jenkins junit() + SonarQube
    // JSON       → archived as build artifact
    reporters: [
        'spec',
        ['junit', {
            outputDir: path.join(__dirname, 'reports/junit/wdi5'),
            outputFileFormat: (opts) => `wdi5-results-${opts.cid}.xml`,
            classNameTemplate: (v) => `${v.activeFeatureName}.${v.filename}`,
            titleTemplate: (v) => v.title,
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

    // ── Base URL ─────────────────────────────────────────────────────────────
    baseUrl: process.env.BASE_URL || 'http://localhost:8080',

    // ── Hooks ────────────────────────────────────────────────────────────────
    onPrepare() {
        const fs = require('fs');
        ['reports/junit/wdi5', 'reports/json/wdi5'].forEach(d =>
            fs.mkdirSync(d, { recursive: true })
        );
        console.log('📁 Report directories created.');
    },

    afterTest(test, _ctx, { error }) {
        if (error) {
            // Take screenshot on failure for easier debugging
            const ts   = new Date().toISOString().replace(/[:.]/g, '-');
            const file = `reports/screenshots/${test.title.replace(/\s/g, '_')}_${ts}.png`;
            const fs   = require('fs');
            fs.mkdirSync('reports/screenshots', { recursive: true });
            browser.saveScreenshot(file).catch(() => {});
        }
    }
};