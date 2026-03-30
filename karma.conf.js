module.exports = function(config) {
  config.set({
    frameworks: ['ui5'],

    browsers: ['ChromeHeadless'],

    singleRun: true,

    ui5: {
      type: 'application',
      paths: {
        webapp: 'webapp'
      }
    }
  });
};