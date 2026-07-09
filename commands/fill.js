(function (global) {
  'use strict';

  function createConfiguredFillCommand(options, batchPlayModule, modalModule) {
    const commands = [];
    const newLayer = Boolean(options && options.newLayer);
    const deselect = Boolean(options && options.deselect);
    const opacity = options && options.opacity ? options.opacity : 100;

    if (newLayer && batchPlayModule && typeof batchPlayModule.buildCreateNewPixelLayerCommand === 'function') {
      commands.push(...batchPlayModule.buildCreateNewPixelLayerCommand());
    }

    if (batchPlayModule && typeof batchPlayModule.buildFillSelectionCommand === 'function') {
      commands.push(...batchPlayModule.buildFillSelectionCommand(opacity));
    }

    if (deselect && batchPlayModule && typeof batchPlayModule.buildDeselectSelectionCommand === 'function') {
      commands.push(...batchPlayModule.buildDeselectSelectionCommand());
    }

    const actionName = [newLayer ? 'New Layer' : null, 'Fill', deselect ? 'Deselect' : null].filter(Boolean).join(' + ') || 'Fill';
    const selectionCommands = batchPlayModule && typeof batchPlayModule.buildGetSelectionBoundsCommand === 'function'
      ? batchPlayModule.buildGetSelectionBoundsCommand()
      : [];

    if (!modalModule || typeof modalModule.runSelectionGuardedBatchPlay !== 'function') {
      return { success: false, message: 'No active selection. Fill skipped.' };
    }

    return modalModule.runSelectionGuardedBatchPlay(commands, actionName, selectionCommands, {
      skipSelectionKey: options && options.skipSelectionKey ? options.skipSelectionKey : ''
    });
  }

  const FillCommand = {
    createConfiguredFillCommand
  };

  global.LassoPaintFillCommand = FillCommand;
})(window);
