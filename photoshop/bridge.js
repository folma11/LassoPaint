(function (global) {
  'use strict';

  const BatchPlayModule = global.LassoPaintBatchPlay;
  const ModalModule = global.LassoPaintModal;
  const FillCommand = global.LassoPaintFillCommand;
  const DeselectCommand = global.LassoPaintDeselectCommand;
  const LayerCommand = global.LassoPaintLayerCommand;
  const UI = global.LassoPaintUI;

  let eventDiagnosticsEnabled = false;
  let eventDiagnosticsHandle = null;

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

  async function runConfiguredFill(options) {
    if (!FillCommand || typeof FillCommand.createConfiguredFillCommand !== 'function') {
      return { success: false, message: 'Fill command module is unavailable.' };
    }

    return FillCommand.createConfiguredFillCommand(options, BatchPlayModule, ModalModule);
  }

  async function fillSelectionWithForegroundColor() {
    const commands = BatchPlayModule && typeof BatchPlayModule.buildFillSelectionCommand === 'function'
      ? BatchPlayModule.buildFillSelectionCommand()
      : [];

    return ModalModule.runModalBatchPlay(commands, 'Fill Selection');
  }

  async function fillSelectionAndDeselect() {
    const commands = [];
    if (BatchPlayModule && typeof BatchPlayModule.buildFillSelectionCommand === 'function') {
      commands.push(...BatchPlayModule.buildFillSelectionCommand());
    }
    if (BatchPlayModule && typeof BatchPlayModule.buildDeselectSelectionCommand === 'function') {
      commands.push(...BatchPlayModule.buildDeselectSelectionCommand());
    }

    return ModalModule.runModalBatchPlay(commands, 'Fill + Deselect');
  }

  async function newLayerAndFill() {
    const commands = [];
    if (BatchPlayModule && typeof BatchPlayModule.buildCreateNewPixelLayerCommand === 'function') {
      commands.push(...BatchPlayModule.buildCreateNewPixelLayerCommand());
    }
    if (BatchPlayModule && typeof BatchPlayModule.buildFillSelectionCommand === 'function') {
      commands.push(...BatchPlayModule.buildFillSelectionCommand());
    }

    return ModalModule.runModalBatchPlay(commands, 'New Layer + Fill');
  }

  async function newLayerAndFillAndDeselect() {
    const commands = [];
    if (BatchPlayModule && typeof BatchPlayModule.buildCreateNewPixelLayerCommand === 'function') {
      commands.push(...BatchPlayModule.buildCreateNewPixelLayerCommand());
    }
    if (BatchPlayModule && typeof BatchPlayModule.buildFillSelectionCommand === 'function') {
      commands.push(...BatchPlayModule.buildFillSelectionCommand());
    }
    if (BatchPlayModule && typeof BatchPlayModule.buildDeselectSelectionCommand === 'function') {
      commands.push(...BatchPlayModule.buildDeselectSelectionCommand());
    }

    return ModalModule.runModalBatchPlay(commands, 'New Layer + Fill + Deselect');
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
    startEventDiagnostics,
    stopEventDiagnostics,
    startSelectionWatcher,
    stopSelectionWatcher
  };

  global.LassoPaintPhotoshopBridge = PhotoshopBridge;
})(window);
