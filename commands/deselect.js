(function (global) {
  'use strict';

  function createDeselectCommand(batchPlayModule, modalModule) {
    const commands = batchPlayModule && typeof batchPlayModule.buildDeselectSelectionCommand === 'function'
      ? batchPlayModule.buildDeselectSelectionCommand()
      : [];

    return modalModule.runModalBatchPlay(commands, 'Deselect');
  }

  const DeselectCommand = {
    createDeselectCommand
  };

  global.LassoPaintDeselectCommand = DeselectCommand;
})(window);
