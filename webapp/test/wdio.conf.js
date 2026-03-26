exports.config = {
    runner: 'local',
    specs: ['./e2e/*.test.js'],
    maxInstances: 1,
    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: ['--headless', '--no-sandbox', '--disable-dev-shm-usage']
        }
    }],
    services: ['chromedriver', 'ui5'],
    framework: 'mocha',
    reporters: [
        ['junit', {
            outputDir: './reports/junit',
            outputFileFormat: function(opts) { return `results-${opts.cid}.xml`; }
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