exports.config = {
    runner: 'local',

    specs: [
        './webapp/test/e2e/*.test.js'
    ],

    maxInstances: 1,

    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: ['--headless', '--no-sandbox', '--disable-dev-shm-usage']
        }
    }],

    services: [
    ['chromedriver', {
        chromedriverCustomPath: require('chromedriver').path
    }],
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
        timeout: 60000
    },

    baseUrl: 'http://localhost:8080'
};