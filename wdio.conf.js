// wdio.conf.js – WDI5 / WebdriverIO configuration
// FIX: removed 'chromedriver' from services.
// ppiper/node-browsers already has chromedriver on PATH – no plugin needed.

const path = require('path');

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

    // ── FIX: only 'ui5' service; 'chromedriver' removed (causes plugin-not-found error)
    services: ['ui5'],

    reporters: [
        'spec',
        ['junit', {
            outputDir: path.join(__dirname, 'reports/junit/wdi5'),
            outputFileFormat: (opts) => `wdi5-results-${opts.cid}.xml`,
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

    onPrepare() {
        const fs = require('fs');
        ['reports/junit/wdi5', 'reports/json/wdi5'].forEach(d =>
            fs.mkdirSync(d, { recursive: true })
        );
    },

    afterTest(test, _ctx, { error }) {
        if (error) {
            const ts   = new Date().toISOString().replace(/[:.]/g, '-');
            const name = test.title.replace(/\s/g, '_').substring(0, 50);
            const file = `reports/screenshots/${name}_${ts}.png`;
            const fs   = require('fs');
            fs.mkdirSync('reports/screenshots', { recursive: true });
            browser.saveScreenshot(file).catch(() => {});
        }
    }
};