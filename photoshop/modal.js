(function (global) {
  'use strict';

  let photoshopApi = null;

  function getPhotoshopApi() {
    if (photoshopApi) {
      return photoshopApi;
    }

    if (typeof require === 'function') {
      try {
        photoshopApi = require('photoshop');
      } catch (error) {
        console.error('[LassoPaint] Unable to load Photoshop API.', error);
      }
    }

    return photoshopApi;
  }

  async function runModalBatchPlay(commands, actionName) {
    const photoshop = getPhotoshopApi();
    if (!photoshop || !photoshop.core || !photoshop.app) {
      return { success: false, message: 'Photoshop API is unavailable.' };
    }

    const batchPlay = photoshop.app.batchPlay;
    if (typeof batchPlay !== 'function') {
      return { success: false, message: 'Photoshop batchPlay API is unavailable.' };
    }

    if (!Array.isArray(commands) || !commands.length) {
      return { success: false, message: `No BatchPlay commands were built for ${actionName}.` };
    }

    try {
      console.info(`[LassoPaint] Running ${actionName} via executeAsModal.`);
      await photoshop.core.executeAsModal(async () => {
        await batchPlay(commands, { synchronous: true });
      }, { commandName: actionName });

      return { success: true, message: `${actionName} completed.` };
    } catch (error) {
      console.error(`[LassoPaint] ${actionName} failed.`, error);
      return {
        success: false,
        message: error && error.message ? error.message : `${actionName} failed.`
      };
    }
  }

  const ModalModule = {
    runModalBatchPlay
  };

  global.LassoPaintModal = ModalModule;
})(window);
