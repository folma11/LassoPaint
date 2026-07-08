(function (global) {
  'use strict';

  function createConfiguredFillCommand(options, batchPlayModule, modalModule) {
    const commands = [];
    const newLayer = Boolean(options && options.newLayer);
    const deselect = Boolean(options && options.deselect);

    if (newLayer && batchPlayModule && typeof batchPlayModule.buildCreateNewPixelLayerCommand === 'function') {
      commands.push(...batchPlayModule.buildCreateNewPixelLayerCommand());
    }

    if (batchPlayModule && typeof batchPlayModule.buildFillSelectionCommand === 'function') {
      commands.push(...batchPlayModule.buildFillSelectionCommand());
    }

    if (deselect && batchPlayModule && typeof batchPlayModule.buildDeselectSelectionCommand === 'function') {
      commands.push(...batchPlayModule.buildDeselectSelectionCommand());
    }

    const actionName = [newLayer ? 'New Layer' : null, 'Fill', deselect ? 'Deselect' : null].filter(Boolean).join(' + ') || 'Fill';
    return modalModule.runModalBatchPlay(commands, actionName);
  }

  const FillCommand = {
    createConfiguredFillCommand
  };

  global.LassoPaintFillCommand = FillCommand;
})(window);
