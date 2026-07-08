(function (global) {
  'use strict';

  function readBoolean(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      if (value === null) {
        return fallback;
      }
      return value === 'true';
    } catch (error) {
      console.warn('[LassoPaint] Unable to read localStorage setting.', error);
      return fallback;
    }
  }

  function writeBoolean(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch (error) {
      console.warn('[LassoPaint] Unable to write localStorage setting.', error);
    }
  }

  const SettingsStorage = {
    readBoolean,
    writeBoolean
  };

  global.LassoPaintSettingsStorage = SettingsStorage;
})(window);
