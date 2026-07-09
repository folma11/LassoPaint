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

  function descriptorHasSelectionBounds(descriptor) {
    const selection = descriptor && (descriptor.selection || descriptor);
    if (!selection || typeof selection !== 'object') {
      return false;
    }

    return ['top', 'left', 'bottom', 'right'].every((key) => selection[key] !== undefined);
  }

  async function runSelectionGuardedBatchPlay(commands, actionName, selectionCommands) {
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

    if (!Array.isArray(selectionCommands) || !selectionCommands.length) {
      return { success: false, message: 'No active selection. Fill skipped.' };
    }

    try {
      let fillCompleted = false;

      console.info(`[LassoPaint] Checking active selection before ${actionName}.`);
      await photoshop.core.executeAsModal(async () => {
        let selectionResult = null;

        try {
          selectionResult = await batchPlay(selectionCommands, { synchronous: true });
        } catch (error) {
          console.warn('[LassoPaint] Selection check failed. Fill skipped.', error);
          return;
        }

        const hasSelection = Array.isArray(selectionResult) && descriptorHasSelectionBounds(selectionResult[0]);
        if (!hasSelection) {
          console.warn('[LassoPaint] No active selection. Fill skipped.');
          return;
        }

        await batchPlay(commands, { synchronous: true });
        fillCompleted = true;
      }, { commandName: actionName });

      if (!fillCompleted) {
        return { success: false, message: 'No active selection. Fill skipped.' };
      }

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
    runModalBatchPlay,
    runSelectionGuardedBatchPlay
  };

  global.LassoPaintModal = ModalModule;
})(window);
