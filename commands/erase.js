(function (global) {
  'use strict';

  function createConfiguredEraseCommand(options, batchPlayModule, modalModule) {
    const afterCommands = [];
    const deselect = Boolean(options && options.deselect);

    if (deselect && batchPlayModule && typeof batchPlayModule.buildDeselectSelectionCommand === 'function') {
      afterCommands.push(...batchPlayModule.buildDeselectSelectionCommand());
    }

    const actionName = ['Erase', deselect ? 'Deselect' : null].filter(Boolean).join(' + ') || 'Erase';
    const selectionCommands = batchPlayModule && typeof batchPlayModule.buildGetSelectionBoundsCommand === 'function'
      ? batchPlayModule.buildGetSelectionBoundsCommand()
      : [];
    const layerCommands = batchPlayModule && typeof batchPlayModule.buildGetTargetLayerCommand === 'function'
      ? batchPlayModule.buildGetTargetLayerCommand()
      : [];

    if (!modalModule || typeof modalModule.runSelectionGuardedDomAction !== 'function') {
      return { success: false, message: 'No active selection. Erase skipped.' };
    }

    return modalModule.runSelectionGuardedDomAction(actionName, selectionCommands, {
      afterCommands,
      layerCommands,
      layerSkippedMessage: 'Cannot erase on this layer.',
      skipSelectionKey: options && options.skipSelectionKey ? options.skipSelectionKey : '',
      skippedMessage: 'No active selection. Erase skipped.',
      duplicateMessage: 'Selection already handled. Erase skipped.',
      unsupportedMessage: 'Cannot erase on this layer.',
      actionFailedMessage: 'Cannot erase on this layer.'
    });
  }

  const EraseCommand = {
    createConfiguredEraseCommand
  };

  global.LassoPaintEraseCommand = EraseCommand;
})(window);
