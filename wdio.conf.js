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

    services: [
        ['ui5']
    ],


    wdi5: {
        logLevel: 'verbose'
    },

    reporters: [
        'spec',
        ['junit', {
            outputDir: './reports/junit/wdi5'
        }],
        ['json', {
            outputDir: './reports/json/wdi5'
        }]
    ],

    baseUrl: process.env.BASE_URL || 'http://localhost:8080'
};