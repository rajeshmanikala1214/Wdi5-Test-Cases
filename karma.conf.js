module.exports = function (config) {
    config.set({
        frameworks: ["ui5"],

        ui5: {
            configPath: "ui5.yaml",
            mode: "script"
        },

        browsers: ["ChromeHeadless"],

        customLaunchers: {
            ChromeHeadless: {
                base: "Chrome",
                flags: [
                    "--headless",
                    "--no-sandbox",
                    "--disable-gpu",
                    "--disable-dev-shm-usage"
                ]
            }
        },

        singleRun: true,

        reporters: ["progress", "junit"],

        junitReporter: {
            outputDir: "test-results",
            outputFile: "opa5-results.xml",
            useBrowserName: false
        }
    });
};