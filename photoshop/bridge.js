(function (global) {
  'use strict';

  const BatchPlayModule = global.LassoPaintBatchPlay;
  const ModalModule = global.LassoPaintModal;
  const FillCommand = global.LassoPaintFillCommand;
  const EraseCommand = global.LassoPaintEraseCommand;
  const DeselectCommand = global.LassoPaintDeselectCommand;
  const LayerCommand = global.LassoPaintLayerCommand;

  const AUTO_FILL_EVENTS = ['set'];

  let eventDiagnosticsEnabled = false;
  let eventDiagnosticsHandle = null;
  let autoMode = 'off';
  let autoModeOptions = { newLayer: false, deselect: false, opacity: 100 };
  let autoModeListener = null;
  let autoModeInProgress = false;
  let pendingAutoModeEvent = null;
  let lastAutoModeSelectionKey = '';

  function getPhotoshopApi() {
    if (typeof require === 'function') {
      try {
        return require('photoshop');
      } catch (error) {
        console.error('[LassoPaint] Unable to load Photoshop API.', error);
      }
    }

    return null;
  }

  function getUI() {
    return global.LassoPaintUI || null;
  }

  async function runConfiguredFill(options) {
    if (!FillCommand || typeof FillCommand.createConfiguredFillCommand !== 'function') {
      return { success: false, message: 'Fill command module is unavailable.' };
    }

    return FillCommand.createConfiguredFillCommand(options, BatchPlayModule, ModalModule);
  }

  async function runConfiguredErase(options) {
    if (!EraseCommand || typeof EraseCommand.createConfiguredEraseCommand !== 'function') {
      return { success: false, message: 'Erase command module is unavailable.' };
    }

    return EraseCommand.createConfiguredEraseCommand(options, BatchPlayModule, ModalModule);
  }

  function setStatus(message, isError) {
    const UI = getUI();
    if (UI && typeof UI.setStatus === 'function') {
      UI.setStatus(message, isError);
    }
  }

  function normalizeEventName(event) {
    return event && (event.eventName || event.type || event._event || event.name) || '';
  }

  function isSelectionNotification(event, descriptor) {
    const eventName = normalizeEventName(event);
    const payload = descriptor || event && event.descriptor || event;

    if (eventName && eventName !== 'set') {
      return false;
    }

    try {
      return JSON.stringify(payload).indexOf('selection') !== -1;
    } catch (error) {
      return false;
    }
  }

  function setAutoModeOptions(options) {
    const opacity = Number(options && options.opacity);
    autoModeOptions = {
      newLayer: Boolean(options && options.newLayer),
      deselect: Boolean(options && options.deselect),
      opacity: [20, 40, 60, 80, 100].indexOf(opacity) !== -1 ? opacity : 100
    };
  }

  async function runAutoModeFromEvent(event, descriptor) {
    if (autoMode === 'off' || !isSelectionNotification(event, descriptor)) {
      return;
    }

    if (autoModeInProgress) {
      pendingAutoModeEvent = { event, descriptor };
      console.info('[LassoPaint] Auto Mode queued latest selection event.');
      return;
    }

    autoModeInProgress = true;

    try {
      const result = autoMode === 'erase'
        ? await runConfiguredErase({
          deselect: autoModeOptions.deselect,
          skipSelectionKey: lastAutoModeSelectionKey
        })
        : await runConfiguredFill({
          newLayer: autoModeOptions.newLayer,
          deselect: autoModeOptions.deselect,
          opacity: autoModeOptions.opacity,
          skipSelectionKey: lastAutoModeSelectionKey
        });

      if (autoMode === 'off') {
        return;
      }

      if (result && result.success) {
        lastAutoModeSelectionKey = result.selectionKey || lastAutoModeSelectionKey;
        setStatus(autoMode === 'erase' ? 'Auto Erase completed.' : 'Auto Fill completed.', false);
        console.info(`[LassoPaint] Auto ${autoMode} completed.`);
      } else if (
        result &&
        result.message &&
        result.message !== 'No active selection. Fill skipped.' &&
        result.message !== 'No active selection. Erase skipped.' &&
        result.message !== 'Selection already handled. Fill skipped.' &&
        result.message !== 'Selection already handled. Erase skipped.'
      ) {
        setStatus(result.message, true);
        console.warn('[LassoPaint] Auto Mode skipped.', result);
      }
    } catch (error) {
      setStatus('Auto Mode failed.', true);
      console.error('[LassoPaint] Auto Mode failed.', error);
    } finally {
      autoModeInProgress = false;

      if (autoMode !== 'off' && pendingAutoModeEvent) {
        const nextEvent = pendingAutoModeEvent;
        pendingAutoModeEvent = null;
        runAutoModeFromEvent(nextEvent.event, nextEvent.descriptor);
      }
    }
  }

  async function setAutoMode(mode, options) {
    const photoshop = getPhotoshopApi();
    const action = photoshop && photoshop.action;
    const nextMode = mode === 'fill' || mode === 'erase' ? mode : 'off';

    setAutoModeOptions(options);

    if (!action || typeof action.addNotificationListener !== 'function') {
      autoMode = 'off';
      return { success: false, message: 'Auto Mode events are unavailable in this environment.' };
    }

    if (nextMode !== 'off' && autoMode === nextMode) {
      return { success: true, message: `Auto ${nextMode === 'erase' ? 'Erase' : 'Fill'} already enabled.` };
    }

    if (nextMode === 'off' && autoMode === 'off') {
      return { success: true, message: 'Auto Mode already off.' };
    }

    if (nextMode !== 'off' && autoMode === 'off') {
      autoModeListener = (event, descriptor) => {
        runAutoModeFromEvent(event, descriptor);
      };

      try {
        await action.addNotificationListener(AUTO_FILL_EVENTS, autoModeListener);
      } catch (error) {
        autoMode = 'off';
        autoModeListener = null;
        console.error('[LassoPaint] Failed to enable Auto Mode.', error);
        return {
          success: false,
          message: error && error.message ? error.message : 'Failed to enable Auto Mode.'
        };
      }
    }

    if (nextMode === 'off') {
      try {
        if (typeof action.removeNotificationListener === 'function' && autoModeListener) {
          await action.removeNotificationListener(AUTO_FILL_EVENTS, autoModeListener);
        }
      } catch (error) {
        console.warn('[LassoPaint] Failed to remove Auto Mode listener.', error);
      }

      autoMode = 'off';
      autoModeListener = null;
      autoModeInProgress = false;
      pendingAutoModeEvent = null;
      return { success: true, message: 'Auto Mode off.' };
    }

    autoMode = nextMode;
    pendingAutoModeEvent = null;
    lastAutoModeSelectionKey = '';
    return { success: true, message: nextMode === 'erase' ? 'Auto Erase enabled.' : 'Auto Fill enabled.' };
  }

  async function setAutoFillEnabled(enabled, options) {
    return setAutoMode(enabled ? 'fill' : 'off', options);
  }

  function setAutoFillOptions(options) {
    setAutoModeOptions(options);
  }

  function getFillOpacity(options) {
    const opacity = Number(options && options.opacity);
    return [20, 40, 60, 80, 100].indexOf(opacity) !== -1 ? opacity : 100;
  }

  async function fillSelectionWithForegroundColor(options) {
    return runConfiguredFill({ newLayer: false, deselect: false, opacity: getFillOpacity(options) });
  }

  async function fillSelectionAndDeselect(options) {
    return runConfiguredFill({ newLayer: false, deselect: true, opacity: getFillOpacity(options) });
  }

  async function newLayerAndFill(options) {
    return runConfiguredFill({ newLayer: true, deselect: false, opacity: getFillOpacity(options) });
  }

  async function newLayerAndFillAndDeselect(options) {
    return runConfiguredFill({ newLayer: true, deselect: true, opacity: getFillOpacity(options) });
  }

  async function eraseSelection() {
    return runConfiguredErase({ deselect: false });
  }

  async function startEventDiagnostics() {
    const photoshop = getPhotoshopApi();
    if (!photoshop || !photoshop.action || !photoshop.action.addNotificationListener) {
      return { success: false, message: 'Event diagnostics are unavailable in this environment.' };
    }

    if (eventDiagnosticsEnabled) {
      return { success: true, message: 'Event diagnostics are already running.' };
    }

    eventDiagnosticsHandle = photoshop.action.addNotificationListener((event) => {
      const message = `${new Date().toLocaleTimeString()} ${event && event.type ? event.type : 'event'}`;
      const UI = getUI();
      if (UI && typeof UI.appendEventLog === 'function') {
        UI.appendEventLog(message);
      }
      console.info('[LassoPaint] Event diagnostic:', message);
    });

    eventDiagnosticsEnabled = true;
    return { success: true, message: 'Event diagnostics started.' };
  }

  async function stopEventDiagnostics() {
    const photoshop = getPhotoshopApi();
    if (!eventDiagnosticsEnabled) {
      return { success: true, message: 'Event diagnostics are not running.' };
    }

    if (photoshop && photoshop.action && photoshop.action.removeNotificationListener) {
      photoshop.action.removeNotificationListener(eventDiagnosticsHandle);
    }

    eventDiagnosticsEnabled = false;
    eventDiagnosticsHandle = null;
    return { success: true, message: 'Event diagnostics stopped.' };
  }

  async function startSelectionWatcher() {
    return { success: false, message: 'Selection watcher is disabled in this build.' };
  }

  async function stopSelectionWatcher() {
    return { success: true, message: 'Selection watcher is not running.' };
  }

  const commandRegistry = {
    runFill: (options) => runConfiguredFill(options),
    fill: (options) => fillSelectionWithForegroundColor(options),
    fillDeselect: (options) => fillSelectionAndDeselect(options),
    newLayerFill: (options) => newLayerAndFill(options),
    newLayerFillDeselect: (options) => newLayerAndFillAndDeselect(options),
    erase: (options) => runConfiguredErase({ deselect: Boolean(options && options.deselect) })
  };

  async function runCommand(commandName, options) {
    const handler = commandRegistry[commandName];
    if (!handler) {
      return { success: false, message: `Unknown command: ${commandName}` };
    }

    return handler(options);
  }

  const PhotoshopBridge = {
    runConfiguredFill,
    fillSelectionWithForegroundColor,
    fillSelectionAndDeselect,
    newLayerAndFill,
    newLayerAndFillAndDeselect,
    eraseSelection,
    runCommand,
    setAutoMode,
    setAutoModeOptions,
    setAutoFillEnabled,
    setAutoFillOptions,
    startEventDiagnostics,
    stopEventDiagnostics,
    startSelectionWatcher,
    stopSelectionWatcher
  };

  global.LassoPaintPhotoshopBridge = PhotoshopBridge;
})(window);
