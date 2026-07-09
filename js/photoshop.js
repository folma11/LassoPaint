(function (global) {
  'use strict';

  let photoshopApi = null;
  let eventDiagnosticsEnabled = false;
  let eventListenerRegistered = false;
  let eventListenerCleanup = null;
  let selectionWatcherActive = false;
  let selectionWatcherTimer = null;
  let selectionWatcherLastState = null;
  let selectionWatcherLastBoundsKey = null;
  let lastWatchErrorMessage = null;

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

  function getBatchPlayModule() {
    return global.LassoPaintBatchPlay || null;
  }

  function summarizeDescriptor(descriptor) {
    if (!descriptor) {
      return 'none';
    }

    try {
      return JSON.stringify(descriptor).slice(0, 240);
    } catch (error) {
      return String(descriptor);
    }
  }

  function logEventDiagnostic(eventName, descriptor, timestamp) {
    const ui = global.LassoPaintUI || null;
    const message = `[${timestamp}] ${eventName} :: ${summarizeDescriptor(descriptor)}`;
    console.info(`[LassoPaint] Event diagnostic: ${message}`);
    if (ui && typeof ui.appendEventLog === 'function') {
      ui.appendEventLog(message);
    }
  }

  function descriptorHasSelectionBounds(descriptor) {
    const selection = descriptor && (descriptor.selection || descriptor);
    if (!selection || typeof selection !== 'object') {
      return false;
    }

    return ['top', 'left', 'bottom', 'right'].every((key) => selection[key] !== undefined);
  }

  async function emitSelectionWatcherUpdate() {
    if (!selectionWatcherActive) {
      return;
    }

    const timestamp = new Date().toISOString();
    const ui = global.LassoPaintUI || null;
    const message = `[${timestamp}] Selection Watcher disabled: unsafe polling command.`;
    console.info(`[LassoPaint] Selection watcher: ${message}`);
    if (ui && typeof ui.appendWatchLog === 'function') {
      ui.appendWatchLog(message);
    }

    selectionWatcherLastState = 'disabled';
    selectionWatcherLastBoundsKey = 'disabled';
  }

  const PhotoshopAPI = {
    initialize() {
      console.info('[LassoPaint] Photoshop module initialized.');
    },

    async runModalBatchPlay(commands, actionName) {
      const photoshop = getPhotoshopApi();
      if (!photoshop || !photoshop.core || !photoshop.app) {
        console.error('[LassoPaint] Photoshop API is unavailable.');
        return { success: false, message: 'Photoshop API is unavailable.' };
      }

      const batchPlay = photoshop.app.batchPlay;
      if (typeof batchPlay !== 'function') {
        console.error('[LassoPaint] batchPlay is unavailable.');
        return { success: false, message: 'Photoshop batchPlay API is unavailable.' };
      }

      if (!Array.isArray(commands) || !commands.length) {
        console.error(`[LassoPaint] No BatchPlay commands were built for ${actionName}.`);
        return { success: false, message: `No BatchPlay commands were built for ${actionName}.` };
      }

      try {
        console.info(`[LassoPaint] Running ${actionName} via executeAsModal.`);
        await photoshop.core.executeAsModal(async () => {
          await batchPlay(commands, { synchronous: true });
        }, { commandName: actionName });

        console.info(`[LassoPaint] ${actionName} completed.`);
        return { success: true, message: `${actionName} completed.` };
      } catch (error) {
        console.error(`[LassoPaint] ${actionName} failed.`, error);
        return {
          success: false,
          message: error && error.message ? error.message : `${actionName} failed.`
        };
      }
    },

    async runSelectionGuardedBatchPlay(commands, actionName, selectionCommands) {
      const photoshop = getPhotoshopApi();
      if (!photoshop || !photoshop.core || !photoshop.app) {
        console.error('[LassoPaint] Photoshop API is unavailable.');
        return { success: false, message: 'Photoshop API is unavailable.' };
      }

      const batchPlay = photoshop.app.batchPlay;
      if (typeof batchPlay !== 'function') {
        console.error('[LassoPaint] batchPlay is unavailable.');
        return { success: false, message: 'Photoshop batchPlay API is unavailable.' };
      }

      if (!Array.isArray(commands) || !commands.length) {
        console.error(`[LassoPaint] No BatchPlay commands were built for ${actionName}.`);
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

        console.info(`[LassoPaint] ${actionName} completed.`);
        return { success: true, message: `${actionName} completed.` };
      } catch (error) {
        console.error(`[LassoPaint] ${actionName} failed.`, error);
        return {
          success: false,
          message: error && error.message ? error.message : `${actionName} failed.`
        };
      }
    },

    async runConfiguredFill(options = {}) {
      const batchplayModule = getBatchPlayModule();
      const commands = [];
      const newLayer = Boolean(options && options.newLayer);
      const deselect = Boolean(options && options.deselect);

      if (newLayer && batchplayModule && typeof batchplayModule.buildCreateNewPixelLayerCommand === 'function') {
        commands.push(...batchplayModule.buildCreateNewPixelLayerCommand());
      }
      if (batchplayModule && typeof batchplayModule.buildFillSelectionCommand === 'function') {
        commands.push(...batchplayModule.buildFillSelectionCommand());
      }
      if (deselect && batchplayModule && typeof batchplayModule.buildDeselectSelectionCommand === 'function') {
        commands.push(...batchplayModule.buildDeselectSelectionCommand());
      }

      const actionName = [newLayer ? 'New Layer' : null, 'Fill', deselect ? 'Deselect' : null].filter(Boolean).join(' + ') || 'Fill';
      const selectionCommands = batchplayModule && typeof batchplayModule.buildGetSelectionBoundsCommand === 'function'
        ? batchplayModule.buildGetSelectionBoundsCommand()
        : [];

      return this.runSelectionGuardedBatchPlay(commands, actionName, selectionCommands);
    },

    async fillSelectionWithForegroundColor() {
      return this.runConfiguredFill({ newLayer: false, deselect: false });
    },

    async fillSelectionAndDeselect() {
      return this.runConfiguredFill({ newLayer: false, deselect: true });
    },

    async newLayerAndFill() {
      return this.runConfiguredFill({ newLayer: true, deselect: false });
    },

    async newLayerAndFillAndDeselect() {
      return this.runConfiguredFill({ newLayer: true, deselect: true });
    },

    async startEventDiagnostics() {
      const photoshop = getPhotoshopApi();
      if (!photoshop || !photoshop.action || typeof photoshop.action.addNotificationListener !== 'function') {
        console.error('[LassoPaint] Photoshop action notification API is unavailable.');
        return { success: false, message: 'Photoshop action notification API is unavailable.' };
      }

      if (eventDiagnosticsEnabled) {
        console.info('[LassoPaint] Event diagnostics are already running.');
        return { success: true, message: 'Event diagnostics are already running.' };
      }

      const eventNames = ['set', 'make', 'select', 'move', 'delete', 'all'];
      const listener = (event) => {
        const eventName = (event && event.eventName) || 'unknown';
        if (!eventNames.includes(eventName) && eventName !== 'all') {
          return;
        }

        const timestamp = new Date().toISOString();
        const descriptor = event && event.descriptor ? event.descriptor : null;
        logEventDiagnostic(eventName, descriptor, timestamp);
      };

      try {
        eventListenerCleanup = await photoshop.action.addNotificationListener(eventNames, listener);
        eventListenerRegistered = true;
        eventDiagnosticsEnabled = true;
        console.info('[LassoPaint] Event diagnostics started.');
        return { success: true, message: 'Event diagnostics started.' };
      } catch (error) {
        console.error('[LassoPaint] Failed to start event diagnostics.', error);
        eventListenerRegistered = false;
        eventDiagnosticsEnabled = false;
        eventListenerCleanup = null;
        return {
          success: false,
          message: error && error.message ? error.message : 'Failed to start event diagnostics.'
        };
      }
    },

    async stopEventDiagnostics() {
      const photoshop = getPhotoshopApi();
      if (!eventDiagnosticsEnabled || !photoshop || !photoshop.action || typeof photoshop.action.removeNotificationListener !== 'function') {
        eventDiagnosticsEnabled = false;
        eventListenerRegistered = false;
        eventListenerCleanup = null;
        return { success: true, message: 'Event diagnostics are not running.' };
      }

      try {
        if (eventListenerCleanup) {
          await photoshop.action.removeNotificationListener(eventListenerCleanup);
        }
        eventDiagnosticsEnabled = false;
        eventListenerRegistered = false;
        eventListenerCleanup = null;
        console.info('[LassoPaint] Event diagnostics stopped.');
        return { success: true, message: 'Event diagnostics stopped.' };
      } catch (error) {
        console.error('[LassoPaint] Failed to stop event diagnostics.', error);
        return {
          success: false,
          message: error && error.message ? error.message : 'Failed to stop event diagnostics.'
        };
      }
    },

    async startSelectionWatcher() {
      if (selectionWatcherTimer) {
        clearInterval(selectionWatcherTimer);
        selectionWatcherTimer = null;
      }

      selectionWatcherActive = false;
      selectionWatcherLastState = null;
      selectionWatcherLastBoundsKey = null;
      lastWatchErrorMessage = null;
      await emitSelectionWatcherUpdate();

      console.info('[LassoPaint] Selection watcher disabled: unsafe polling command.');
      return { success: true, message: 'Selection Watcher disabled: unsafe polling command.' };
    },

    async stopSelectionWatcher() {
      if (selectionWatcherTimer) {
        clearInterval(selectionWatcherTimer);
        selectionWatcherTimer = null;
      }

      selectionWatcherActive = false;
      selectionWatcherLastState = null;
      selectionWatcherLastBoundsKey = null;
      lastWatchErrorMessage = null;
      console.info('[LassoPaint] Selection watcher stopped.');
      return { success: true, message: 'Selection watcher stopped.' };
    }
  };

  global.LassoPaintPhotoshop = PhotoshopAPI;
})(window);
