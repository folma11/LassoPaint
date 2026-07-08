(function (global) {
  'use strict';

  function createNewLayerCommand(batchPlayModule, modalModule) {
    const commands = batchPlayModule && typeof batchPlayModule.buildCreateNewPixelLayerCommand === 'function'
      ? batchPlayModule.buildCreateNewPixelLayerCommand()
      : [];

    return modalModule.runModalBatchPlay(commands, 'New Layer');
  }

  const LayerCommand = {
    createNewLayerCommand
  };

  global.LassoPaintLayerCommand = LayerCommand;
})(window);
