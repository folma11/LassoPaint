(function (global) {
  'use strict';

  const defaultSettings = {
    fillMode: 'smart',
    tolerance: 0.1,
    previewEnabled: true,
  };

  const Settings = {
    get() {
      // Future implementation will load persisted settings here.
      return { ...defaultSettings };
    },

    save(settings) {
      // Future implementation will persist settings safely.
      console.info('Settings updated', settings);
    }
  };

  global.LassoPaintSettings = Settings;
})(window);
