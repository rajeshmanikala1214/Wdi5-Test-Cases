const base = require('./wdio.conf.js').config;

exports.config = {
    ...base,
    // talk to the Piper sidecar instead of a local driver
    hostname: process.env.SELENIUM_HOST || 'selenium',
    port: 4444,
    path: '/wd/hub',            // selenium/standalone-chrome (Grid4) also accepts '/'
    services: base.services.filter(s => (Array.isArray(s) ? s[0] : s) !== 'chromedriver'),
    // the browser is in the selenium container, so it must reach the app by the
    // node container's network alias 'node', NOT localhost
    baseUrl: process.env.BASE_URL || 'http://node:8080/index.html',
    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1920,1080']
        }
    }]
};