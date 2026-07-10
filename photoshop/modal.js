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

  function getSelectionBoundsKey(descriptor) {
    const selection = descriptor && (descriptor.selection || descriptor);
    if (!selection || typeof selection !== 'object') {
      return '';
    }

    return ['top', 'left', 'bottom', 'right'].map((key) => {
      const value = selection[key];
      if (value && typeof value === 'object' && '_value' in value) {
        return `${key}:${value._value}`;
      }
      return `${key}:${String(value)}`;
    }).join('|');
  }

  function getDescriptorEnumValue(value) {
    if (value && typeof value === 'object' && '_value' in value) {
      return value._value;
    }
    return value;
  }

  function descriptorSupportsPixelErase(descriptor) {
    if (!descriptor || typeof descriptor !== 'object') {
      return false;
    }

    const locking = descriptor.layerLocking || {};
    if (
      locking.protectAll === true ||
      locking.protectComposite === true ||
      locking.protectTransparency === true
    ) {
      return false;
    }

    const layerKind = getDescriptorEnumValue(descriptor.layerKind || descriptor.kind);
    if (layerKind === undefined || layerKind === null || layerKind === '') {
      return true;
    }

    return layerKind === 1 ||
      layerKind === 'pixelLayer' ||
      layerKind === 'pixelSheet' ||
      layerKind === 'normal';
  }

  function descriptorHasTransparencyLock(descriptor) {
    if (!descriptor || typeof descriptor !== 'object') {
      return false;
    }

    const locking = descriptor.layerLocking || {};
    return locking.protectTransparency === true ||
      descriptor.protectTransparency === true ||
      descriptor.transparentPixelsLocked === true;
  }

  async function validateSelectionAndLayer(batchPlay, actionName, selectionCommands, options) {
    let layerSkipped = false;
    let selectionKey = '';
    let layerDescriptor = null;

    if (options && Array.isArray(options.layerCommands) && options.layerCommands.length) {
      let layerResult = null;

      try {
        layerResult = await batchPlay(options.layerCommands, { synchronous: true });
      } catch (error) {
        console.warn(`[LassoPaint] Active layer check failed before ${actionName}.`, error);
        layerSkipped = true;
        return { hasSelection: false, layerSkipped, selectionKey };
      }

      layerDescriptor = Array.isArray(layerResult) ? layerResult[0] : null;

      if (options.layerCheck === 'erase') {
        const canErase = descriptorSupportsPixelErase(layerDescriptor);
        if (!canErase) {
          console.warn(`[LassoPaint] Active layer cannot be erased safely. ${actionName} skipped.`);
          layerSkipped = true;
          return { hasSelection: false, layerSkipped, selectionKey, layerDescriptor };
        }
      }
    }

    let selectionResult = null;

    try {
      selectionResult = await batchPlay(selectionCommands, { synchronous: true });
    } catch (error) {
      console.warn(`[LassoPaint] Selection check failed before ${actionName}.`, error);
      return { hasSelection: false, layerSkipped, selectionKey, layerDescriptor };
    }

    const hasSelection = Array.isArray(selectionResult) && descriptorHasSelectionBounds(selectionResult[0]);
    if (!hasSelection) {
      console.warn(`[LassoPaint] No active selection before ${actionName}.`);
      return { hasSelection: false, layerSkipped, selectionKey, layerDescriptor };
    }

    selectionKey = getSelectionBoundsKey(selectionResult[0]);
    if (options && options.skipSelectionKey && selectionKey === options.skipSelectionKey) {
      console.info(`[LassoPaint] Selection already handled before ${actionName}.`);
      return { hasSelection: false, layerSkipped, selectionKey, layerDescriptor };
    }

    return {
      hasSelection: true,
      layerSkipped,
      selectionKey,
      layerDescriptor,
      preserveTransparency: descriptorHasTransparencyLock(layerDescriptor)
    };
  }

  function createSkippedResult(validation, actionName, options) {
    if (validation && validation.layerSkipped) {
      return {
        success: false,
        message: options && options.layerSkippedMessage ? options.layerSkippedMessage : `${actionName} skipped. Use an unlocked pixel layer.`,
        selectionKey: validation.selectionKey || ''
      };
    }

    if (
      validation &&
      validation.selectionKey &&
      options &&
      options.skipSelectionKey &&
      validation.selectionKey === options.skipSelectionKey
    ) {
      return {
        success: false,
        message: options.duplicateMessage || 'Selection already handled. Fill skipped.',
        selectionKey: validation.selectionKey
      };
    }

    return {
      success: false,
      message: options && options.skippedMessage ? options.skippedMessage : 'No active selection. Fill skipped.',
      selectionKey: validation && validation.selectionKey ? validation.selectionKey : ''
    };
  }

  async function runSelectionGuardedBatchPlay(commands, actionName, selectionCommands, options) {
    const photoshop = getPhotoshopApi();
    if (!photoshop || !photoshop.core || !photoshop.app) {
      return { success: false, message: 'Photoshop API is unavailable.' };
    }

    const batchPlay = photoshop.app.batchPlay;
    if (typeof batchPlay !== 'function') {
      return { success: false, message: 'Photoshop batchPlay API is unavailable.' };
    }

    if (typeof commands !== 'function' && (!Array.isArray(commands) || !commands.length)) {
      return { success: false, message: `No BatchPlay commands were built for ${actionName}.` };
    }

    if (!Array.isArray(selectionCommands) || !selectionCommands.length) {
      return { success: false, message: 'No active selection. Fill skipped.' };
    }

    try {
      let fillCompleted = false;
      let validation = { hasSelection: false, layerSkipped: false, selectionKey: '' };

      console.info(`[LassoPaint] Checking active selection before ${actionName}.`);
      await photoshop.core.executeAsModal(async () => {
        validation = await validateSelectionAndLayer(batchPlay, actionName, selectionCommands, options);
        if (!validation.hasSelection) {
          return;
        }

        const commandsToRun = typeof commands === 'function' ? commands(validation) : commands;
        if (!Array.isArray(commandsToRun) || !commandsToRun.length) {
          return;
        }

        await batchPlay(commandsToRun, { synchronous: true });
        fillCompleted = true;
      }, { commandName: actionName });

      if (!fillCompleted) {
        return createSkippedResult(validation, actionName, options);
      }

      return { success: true, message: `${actionName} completed.`, selectionKey: validation.selectionKey };
    } catch (error) {
      console.error(`[LassoPaint] ${actionName} failed.`, error);
      return {
        success: false,
        message: error && error.message ? error.message : `${actionName} failed.`
      };
    }
  }

  async function runSelectionGuardedDomAction(actionName, selectionCommands, options) {
    const photoshop = getPhotoshopApi();
    if (!photoshop || !photoshop.core || !photoshop.app) {
      return { success: false, message: 'Photoshop API is unavailable.' };
    }

    const batchPlay = photoshop.app.batchPlay;
    if (typeof batchPlay !== 'function') {
      return { success: false, message: 'Photoshop batchPlay API is unavailable.' };
    }

    if (!Array.isArray(selectionCommands) || !selectionCommands.length) {
      return { success: false, message: options && options.skippedMessage ? options.skippedMessage : 'No active selection. Fill skipped.' };
    }

    try {
      let actionCompleted = false;
      let unsupported = false;
      let actionFailed = false;
      let validation = { hasSelection: false, layerSkipped: false, selectionKey: '' };

      console.info(`[LassoPaint] Checking active selection before ${actionName}.`);
      await photoshop.core.executeAsModal(async () => {
        validation = await validateSelectionAndLayer(batchPlay, actionName, selectionCommands, options);
        if (!validation.hasSelection) {
          return;
        }

        const document = photoshop.app.activeDocument;
        const activeLayer = document &&
          Array.isArray(document.activeLayers) &&
          document.activeLayers.length
          ? document.activeLayers[0]
          : null;

        if (!activeLayer || typeof activeLayer.clear !== 'function') {
          unsupported = true;
          console.warn('[LassoPaint] Photoshop DOM layer.clear is unavailable.');
          return;
        }

        try {
          await activeLayer.clear();
        } catch (error) {
          actionFailed = true;
          console.warn('[LassoPaint] Photoshop DOM layer.clear failed.', error);
          return;
        }

        if (options && Array.isArray(options.afterCommands) && options.afterCommands.length) {
          await batchPlay(options.afterCommands, { synchronous: true });
        }

        actionCompleted = true;
      }, { commandName: actionName });

      if (unsupported) {
        return {
          success: false,
          message: options && options.unsupportedMessage ? options.unsupportedMessage : `${actionName} is unavailable.`,
          selectionKey: validation.selectionKey
        };
      }

      if (actionFailed) {
        return {
          success: false,
          message: options && options.actionFailedMessage ? options.actionFailedMessage : `${actionName} failed.`,
          selectionKey: validation.selectionKey
        };
      }

      if (!actionCompleted) {
        return createSkippedResult(validation, actionName, options);
      }

      return { success: true, message: `${actionName} completed.`, selectionKey: validation.selectionKey };
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
    runSelectionGuardedBatchPlay,
    runSelectionGuardedDomAction
  };

  global.LassoPaintModal = ModalModule;
})(window);
