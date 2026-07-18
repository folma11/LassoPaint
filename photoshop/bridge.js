(function (global) {
  'use strict';

  const BatchPlayModule = global.LassoPaintBatchPlay;
  const ModalModule = global.LassoPaintModal;
  const FillCommand = global.LassoPaintFillCommand;
  const EraseCommand = global.LassoPaintEraseCommand;
  const DeselectCommand = global.LassoPaintDeselectCommand;
  const LayerCommand = global.LassoPaintLayerCommand;

  const AUTO_FILL_EVENTS = ['set', 'select', 'addTo', 'subtractFrom'];
  const AUTO_MODE_DUPLICATE_COOLDOWN_MS = 200;

  let eventDiagnosticsEnabled = false;
  let eventDiagnosticsHandle = null;
  let autoMode = 'off';
  let autoModeOptions = { newLayer: false, deselect: false, opacity: 100, blendMode: 'normal' };
  let autoModeListener = null;
  let autoModeInProgress = false;
  let pendingAutoModeEvent = null;
  let pendingToolChangeTimer = null;
  let lastAutoModeSelectionKey = '';
  let lastAutoModeNotificationKey = '';
  let lastAutoModeNotificationAt = 0;
  let activeAutoModeNotificationKey = '';
  let selectionBrushToolState = null;

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
    if (typeof event === 'string') {
      return event;
    }

    return event && (event.eventName || event.type || event._event || event.name) || '';
  }

  function getNotificationText(event, descriptor) {
    const payload = descriptor || event && event.descriptor || event;

    try {
      return JSON.stringify(payload).toLowerCase();
    } catch (error) {
      return '';
    }
  }

  function normalizeToolId(toolId) {
    return String(toolId || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  }

  function isSelectionBrushToolId(toolId) {
    const normalizedToolId = normalizeToolId(toolId);
    return normalizedToolId === 'selectionbrushtool' || normalizedToolId === 'selectionbrush';
  }

  function getCurrentToolId() {
    const photoshop = getPhotoshopApi();

    try {
      return photoshop && photoshop.app && photoshop.app.currentTool
        ? photoshop.app.currentTool.id || ''
        : '';
    } catch (error) {
      console.warn('[LassoPaint] Unable to read the current Photoshop tool.', error);
      return '';
    }
  }

  function isSelectionBrushActive() {
    const currentToolId = getCurrentToolId();

    if (currentToolId) {
      return isSelectionBrushToolId(currentToolId);
    }

    return selectionBrushToolState;
  }

  function isToolSelectionNotification(event, descriptor) {
    if (normalizeEventName(event) !== 'select') {
      return false;
    }

    return getNotificationText(event, descriptor).indexOf('tool') !== -1;
  }

  function notificationSelectsSelectionBrush(event, descriptor) {
    const text = getNotificationText(event, descriptor);

    if (text.indexOf('selectionbrushtool') !== -1 || text.indexOf('selectionbrush') !== -1) {
      return true;
    }

    if (text.indexOf('tool') !== -1) {
      return false;
    }

    const currentToolId = getCurrentToolId();
    return currentToolId ? isSelectionBrushToolId(currentToolId) : false;
  }

  function cancelPendingToolChange() {
    if (pendingToolChangeTimer !== null) {
      clearTimeout(pendingToolChangeTimer);
      pendingToolChangeTimer = null;
    }
  }

  function schedulePendingAutoModeAfterToolChange() {
    if (pendingToolChangeTimer !== null) {
      return;
    }

    pendingToolChangeTimer = setTimeout(() => {
      pendingToolChangeTimer = null;

      if (autoMode === 'off' || selectionBrushToolState === true) {
        return;
      }

      const nextEvent = pendingAutoModeEvent || {
        event: 'set',
        descriptor: {
          selection: {
            source: 'selectionBrushTool'
          }
        }
      };
      const isSyntheticSelection = !pendingAutoModeEvent;
      pendingAutoModeEvent = null;
      runAutoModeFromEvent(nextEvent.event, nextEvent.descriptor, {
        fromToolChange: true,
        forceNewSelection: isSyntheticSelection
      });
    }, 0);
  }

  function isSelectionNotification(event, descriptor) {
    const eventName = normalizeEventName(event);
    const notificationText = getNotificationText(event, descriptor);
    const isSelectionChannelNotification =
      notificationText.indexOf('"_ref":"channel"') !== -1 ||
      notificationText.indexOf('"_property":"selection"') !== -1;

    if (
      eventName === 'select' &&
      isToolSelectionNotification(event, descriptor) &&
      !isSelectionChannelNotification
    ) {
      return false;
    }

    if (
      eventName &&
      eventName !== 'set' &&
      eventName !== 'select' &&
      eventName !== 'addTo' &&
      eventName !== 'subtractFrom'
    ) {
      return false;
    }

    const isSelectionModeEvent = eventName === 'addTo' || eventName === 'subtractFrom';
    return notificationText.indexOf('selection') !== -1 || isSelectionChannelNotification || isSelectionModeEvent;
  }

  function getSelectionNotificationKey(event, descriptor) {
    if (!isSelectionNotification(event, descriptor)) {
      return '';
    }

    const payload = descriptor || event && event.descriptor || event;

    try {
      const serialized = JSON.stringify(payload);
      const eventName = normalizeEventName(event) || 'selection';
      return serialized ? `${eventName}:${serialized}` : '';
    } catch (error) {
      return '';
    }
  }

  function setAutoModeOptions(options) {
    const opacity = Number(options && options.opacity);
    const blendMode = getFillBlendMode(options);
    autoModeOptions = {
      newLayer: Boolean(options && options.newLayer),
      deselect: Boolean(options && options.deselect),
      opacity: [20, 40, 60, 80, 100].indexOf(opacity) !== -1 ? opacity : 100,
      blendMode
    };
  }

  async function runAutoModeFromEvent(event, descriptor, options) {
    if (autoMode === 'off' || !isSelectionNotification(event, descriptor)) {
      return;
    }

    const notificationKey = getSelectionNotificationKey(event, descriptor);
    const now = Date.now();
    const isRecentDuplicate = Boolean(
      notificationKey &&
      notificationKey === lastAutoModeNotificationKey &&
      now - lastAutoModeNotificationAt < AUTO_MODE_DUPLICATE_COOLDOWN_MS
    );

    if (isRecentDuplicate) {
      return;
    }

    if (!(options && options.fromToolChange) && isSelectionBrushActive() === true) {
      pendingAutoModeEvent = { event, descriptor, notificationKey };
      console.info('[LassoPaint] Selection Brush update queued until tool change.');
      return;
    }

    if (autoModeInProgress) {
      if (
        notificationKey &&
        (notificationKey === activeAutoModeNotificationKey ||
          pendingAutoModeEvent && notificationKey === pendingAutoModeEvent.notificationKey)
      ) {
        return;
      }

      pendingAutoModeEvent = { event, descriptor, notificationKey };
      console.info('[LassoPaint] Auto Mode queued latest selection event.');
      return;
    }

    autoModeInProgress = true;
    activeAutoModeNotificationKey = notificationKey;
    const skipSelectionKey = options && options.forceNewSelection
      ? ''
      : notificationKey
        ? ''
        : lastAutoModeSelectionKey;

    try {
      const result = autoMode === 'erase'
        ? await runConfiguredErase({
          deselect: autoModeOptions.deselect,
          skipSelectionKey
        })
        : await runConfiguredFill({
          newLayer: autoModeOptions.newLayer,
          deselect: autoModeOptions.deselect,
          opacity: autoModeOptions.opacity,
          blendMode: autoModeOptions.blendMode,
          skipSelectionKey
        });

      if (autoMode === 'off') {
        return;
      }

      if (result && result.success) {
        lastAutoModeSelectionKey = result.selectionKey || lastAutoModeSelectionKey;
        lastAutoModeNotificationKey = notificationKey || lastAutoModeNotificationKey;
        lastAutoModeNotificationAt = notificationKey ? Date.now() : 0;
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
      activeAutoModeNotificationKey = '';

      if (autoMode !== 'off' && pendingAutoModeEvent) {
        const nextEvent = pendingAutoModeEvent;
        pendingAutoModeEvent = null;
        runAutoModeFromEvent(nextEvent.event, nextEvent.descriptor);
      }
    }
  }

  function handleAutoModeNotification(event, descriptor) {
    if (isToolSelectionNotification(event, descriptor)) {
      const wasSelectionBrush = selectionBrushToolState === true || isSelectionBrushActive() === true;
      const selectsSelectionBrush = notificationSelectsSelectionBrush(event, descriptor);
      selectionBrushToolState = selectsSelectionBrush;

      if (selectsSelectionBrush) {
        cancelPendingToolChange();
        pendingAutoModeEvent = null;
        lastAutoModeSelectionKey = '';
        lastAutoModeNotificationKey = '';
        lastAutoModeNotificationAt = 0;
        return;
      }

      if (wasSelectionBrush && autoMode !== 'off') {
        schedulePendingAutoModeAfterToolChange();
      }
      return;
    }

    runAutoModeFromEvent(event, descriptor);
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
        handleAutoModeNotification(event, descriptor);
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
      cancelPendingToolChange();
      pendingAutoModeEvent = null;
      lastAutoModeNotificationKey = '';
      lastAutoModeNotificationAt = 0;
      activeAutoModeNotificationKey = '';
      return { success: true, message: 'Auto Mode off.' };
    }

    autoMode = nextMode;
    selectionBrushToolState = isSelectionBrushActive();
    cancelPendingToolChange();
    pendingAutoModeEvent = null;
    lastAutoModeSelectionKey = '';
    lastAutoModeNotificationKey = '';
    lastAutoModeNotificationAt = 0;
    activeAutoModeNotificationKey = '';
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

  function getFillBlendMode(options) {
    const blendMode = options && options.blendMode;
    return ['multiply', 'screen', 'overlay'].indexOf(blendMode) !== -1 ? blendMode : 'normal';
  }

  async function fillSelectionWithForegroundColor(options) {
    return runConfiguredFill({ newLayer: false, deselect: false, opacity: getFillOpacity(options), blendMode: getFillBlendMode(options) });
  }

  async function fillSelectionAndDeselect(options) {
    return runConfiguredFill({ newLayer: false, deselect: true, opacity: getFillOpacity(options), blendMode: getFillBlendMode(options) });
  }

  async function newLayerAndFill(options) {
    return runConfiguredFill({ newLayer: true, deselect: false, opacity: getFillOpacity(options), blendMode: getFillBlendMode(options) });
  }

  async function newLayerAndFillAndDeselect(options) {
    return runConfiguredFill({ newLayer: true, deselect: true, opacity: getFillOpacity(options), blendMode: getFillBlendMode(options) });
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
