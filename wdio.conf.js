exports.config = {
    runner: 'local',
    specs: ['./e2e/**/*.test.js'], // make sure your test files are inside ./e2e/
    maxInstances: 1,
    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: ['--headless', '--no-sandbox', '--disable-dev-shm-usage']
        }
    }],
    services: [
        'ui5', 
        'chromedriver' // use the official WDIO chromedriver service
    ],
    framework: 'mocha',
    reporters: [
        ['junit', {
            outputDir: './reports/junit',
            outputFileFormat: (opts) => `results-${opts.cid}.xml`
        }],
        ['json', {
            outputDir: './reports/json',
            outputFile: 'results.json'
        }]
    ],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    },
    baseUrl: 'http://localhost:8080'
};