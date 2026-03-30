// webapp/test/ui5-uiveri5/conf.js
// UiVeri5 configuration file
// Place this at: webapp/test/ui5-uiveri5/conf.js in your repository

const path = require('path');

exports.config = {
    profile: 'integration',

    // baseUrl is injected at runtime via --baseUrl CLI argument
    baseUrl: process.env.BASE_URL || 'http://localhost:8080/index.html',

    // Specs relative to this conf.js file
    // specs: [
    // './webapp/test/ui5-uiveri5/specs/*.spec.js'
    //  ],
    specs: [
    './specs/*.spec.js'
],

    // Browser capabilities
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

    // Timeouts
    timeouts: {
        getPageTimeout  : 30000,
        allScriptsTimeout: 30000,
        framework       : 30000
    },

    params: {
        user: process.env.TEST_USER || '',
        pass: process.env.TEST_PASS || ''
    }
};