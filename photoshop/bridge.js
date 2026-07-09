(function (global) {
  'use strict';

  const BatchPlayModule = global.LassoPaintBatchPlay;
  const ModalModule = global.LassoPaintModal;
  const FillCommand = global.LassoPaintFillCommand;
  const DeselectCommand = global.LassoPaintDeselectCommand;
  const LayerCommand = global.LassoPaintLayerCommand;

  const AUTO_FILL_EVENTS = ['set'];

  let eventDiagnosticsEnabled = false;
  let eventDiagnosticsHandle = null;
  let autoFillEnabled = false;
  let autoFillOptions = { newLayer: false, deselect: false };
  let autoFillListener = null;
  let autoFillInProgress = false;
  let pendingAutoFillEvent = null;
  let lastAutoFillSelectionKey = '';

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

  function setAutoFillOptions(options) {
    autoFillOptions = {
      newLayer: Boolean(options && options.newLayer),
      deselect: Boolean(options && options.deselect)
    };
  }

  async function runAutoFillFromEvent(event, descriptor) {
    if (!autoFillEnabled || !isSelectionNotification(event, descriptor)) {
      return;
    }

    if (autoFillInProgress) {
      pendingAutoFillEvent = { event, descriptor };
      console.info('[LassoPaint] Auto Fill queued latest selection event.');
      return;
    }

    autoFillInProgress = true;

    try {
      const result = await runConfiguredFill({
        newLayer: autoFillOptions.newLayer,
        deselect: autoFillOptions.deselect,
        skipSelectionKey: lastAutoFillSelectionKey
      });
      if (!autoFillEnabled) {
        return;
      }

      if (result && result.success) {
        lastAutoFillSelectionKey = result.selectionKey || lastAutoFillSelectionKey;
        setStatus('Auto Fill completed.', false);
        console.info('[LassoPaint] Auto Fill completed.');
      } else if (
        result &&
        result.message &&
        result.message !== 'No active selection. Fill skipped.' &&
        result.message !== 'Selection already handled. Fill skipped.'
      ) {
        setStatus(result.message, true);
        console.warn('[LassoPaint] Auto Fill skipped.', result);
      }
    } catch (error) {
      setStatus('Auto Fill failed.', true);
      console.error('[LassoPaint] Auto Fill failed.', error);
    } finally {
      autoFillInProgress = false;

      if (autoFillEnabled && pendingAutoFillEvent) {
        const nextEvent = pendingAutoFillEvent;
        pendingAutoFillEvent = null;
        runAutoFillFromEvent(nextEvent.event, nextEvent.descriptor);
      }
    }
  }

  async function setAutoFillEnabled(enabled, options) {
    const photoshop = getPhotoshopApi();
    const action = photoshop && photoshop.action;

    setAutoFillOptions(options);

    if (!action || typeof action.addNotificationListener !== 'function') {
      autoFillEnabled = false;
      return { success: false, message: 'Auto Fill events are unavailable in this environment.' };
    }

    if (enabled && autoFillEnabled) {
      return { success: true, message: 'Auto Fill already enabled.' };
    }

    if (!enabled && !autoFillEnabled) {
      return { success: true, message: 'Auto Fill already disabled.' };
    }

    if (enabled) {
      autoFillListener = (event, descriptor) => {
        runAutoFillFromEvent(event, descriptor);
      };

      try {
        await action.addNotificationListener(AUTO_FILL_EVENTS, autoFillListener);
        autoFillEnabled = true;
        pendingAutoFillEvent = null;
        lastAutoFillSelectionKey = '';
        return { success: true, message: 'Auto Fill enabled.' };
      } catch (error) {
        autoFillEnabled = false;
        autoFillListener = null;
        console.error('[LassoPaint] Failed to enable Auto Fill.', error);
        return {
          success: false,
          message: error && error.message ? error.message : 'Failed to enable Auto Fill.'
        };
      }
    }

    try {
      if (typeof action.removeNotificationListener === 'function' && autoFillListener) {
        await action.removeNotificationListener(AUTO_FILL_EVENTS, autoFillListener);
      }
    } catch (error) {
      console.warn('[LassoPaint] Failed to remove Auto Fill listener.', error);
    }

    autoFillEnabled = false;
    autoFillListener = null;
    autoFillInProgress = false;
    pendingAutoFillEvent = null;
    return { success: true, message: 'Auto Fill disabled.' };
  }

  async function fillSelectionWithForegroundColor() {
    return runConfiguredFill({ newLayer: false, deselect: false });
  }

  async function fillSelectionAndDeselect() {
    return runConfiguredFill({ newLayer: false, deselect: true });
  }

  async function newLayerAndFill() {
    return runConfiguredFill({ newLayer: true, deselect: false });
  }

  async function newLayerAndFillAndDeselect() {
    return runConfiguredFill({ newLayer: true, deselect: true });
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
    fill: () => fillSelectionWithForegroundColor(),
    fillDeselect: () => fillSelectionAndDeselect(),
    newLayerFill: () => newLayerAndFill(),
    newLayerFillDeselect: () => newLayerAndFillAndDeselect()
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
    runCommand,
    setAutoFillEnabled,
    setAutoFillOptions,
    startEventDiagnostics,
    stopEventDiagnostics,
    startSelectionWatcher,
    stopSelectionWatcher
  };

  global.LassoPaintPhotoshopBridge = PhotoshopBridge;
})(window);
