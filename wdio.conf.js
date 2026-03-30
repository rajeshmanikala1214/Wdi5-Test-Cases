const path = require('path');
const fs   = require('fs');

exports.config = {
    runner: 'local',

    specs: ['./webapp/test/e2e/**/*.test.js'],
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

    services: ['ui5'],

    reporters: [
        'spec',

        ['junit', {
            outputDir: path.join(__dirname, 'reports/junit/wdi5'),
            outputFileFormat: (opts) => `wdi5-${opts.cid}.xml`,
            addFileAttribute: true
        }],

        ['json', {
            outputDir: path.join(__dirname, 'reports/json/wdi5'),
            outputFile: 'results.json'
        }]
    ],

    baseUrl: process.env.BASE_URL || 'http://localhost:8080',

    onPrepare() {
        ['reports/junit/wdi5', 'reports/json/wdi5', 'coverage']
            .forEach(d => fs.mkdirSync(d, { recursive: true }));
    }
};