(function (global) {
  'use strict';

  function createConfiguredFillCommand(options, batchPlayModule, modalModule) {
    const commands = [];
    const newLayer = Boolean(options && options.newLayer);
    const deselect = Boolean(options && options.deselect);
    const opacity = options && options.opacity ? options.opacity : 100;
    const blendMode = options && options.blendMode ? options.blendMode : 'normal';
    const layerCommands = !newLayer && batchPlayModule && typeof batchPlayModule.buildGetTargetLayerCommand === 'function'
      ? batchPlayModule.buildGetTargetLayerCommand()
      : [];

    if (newLayer && batchPlayModule && typeof batchPlayModule.buildCreateNewPixelLayerCommand === 'function') {
      commands.push(...batchPlayModule.buildCreateNewPixelLayerCommand());
    }

    const buildCommands = (validation) => {
      const fillCommands = commands.slice();
      const preserveTransparency = Boolean(validation && validation.preserveTransparency);

      if (batchPlayModule && typeof batchPlayModule.buildFillSelectionCommand === 'function') {
        fillCommands.push(...batchPlayModule.buildFillSelectionCommand(opacity, blendMode, {
          preserveTransparency
        }));
      }

      if (deselect && batchPlayModule && typeof batchPlayModule.buildDeselectSelectionCommand === 'function') {
        fillCommands.push(...batchPlayModule.buildDeselectSelectionCommand());
      }

      return fillCommands;
    };

    const actionName = [newLayer ? 'New Layer' : null, 'Fill', deselect ? 'Deselect' : null].filter(Boolean).join(' + ') || 'Fill';
    const selectionCommands = batchPlayModule && typeof batchPlayModule.buildGetSelectionBoundsCommand === 'function'
      ? batchPlayModule.buildGetSelectionBoundsCommand()
      : [];

    if (!modalModule || typeof modalModule.runSelectionGuardedBatchPlay !== 'function') {
      return { success: false, message: 'No active selection. Fill skipped.' };
    }

    return modalModule.runSelectionGuardedBatchPlay(buildCommands, actionName, selectionCommands, {
      layerCommands,
      skipSelectionKey: options && options.skipSelectionKey ? options.skipSelectionKey : ''
    });
  }

  const FillCommand = {
    createConfiguredFillCommand
  };

  global.LassoPaintFillCommand = FillCommand;
})(window);
