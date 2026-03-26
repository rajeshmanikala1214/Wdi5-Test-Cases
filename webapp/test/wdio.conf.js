exports.config = {
    runner: 'local',

    specs: [
        './webapp/test/e2e/*.test.js'
    ],

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

    // Use the chromedriver service (works in Docker/CI)
    services: [
        ['chromedriver'],
        'ui5'
    ],

    framework: 'mocha',

    reporters: [
        'spec',
        ['junit', {
            outputDir: './reports/junit',
            outputFileFormat: function (opts) {
                return `results-${opts.cid}.xml`;
            }
        }]
    ],

    mochaOpts: {
        ui: 'bdd',
        timeout: 120000 // 2 minutes per test
    },

    baseUrl: 'http://localhost:8080',

    // Retry failed tests in CI
    specFileRetries: 1,
    specFileRetriesDelay: 3,
    specFileRetriesDeferred: false
};