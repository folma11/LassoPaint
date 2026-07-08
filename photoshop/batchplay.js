(function (global) {
  'use strict';

  function buildFillSelectionCommand() {
    return [{
      _obj: 'fill',
      using: {
        _enum: 'fillContents',
        _value: 'foregroundColor'
      },
      opacity: {
        _unit: 'percentUnit',
        _value: 100
      },
      mode: {
        _enum: 'blendMode',
        _value: 'normal'
      },
      preserveTransparency: false,
      _isCommand: true
    }];
  }

  function buildDeselectSelectionCommand() {
    return [{
      _obj: 'set',
      _target: [{
        _ref: 'channel',
        _property: 'selection'
      }],
      to: {
        _enum: 'ordinal',
        _value: 'none'
      },
      _options: {
        dialogOptions: 'dontDisplay'
      }
    }];
  }

  function buildCreateNewPixelLayerCommand() {
    return [{
      _obj: 'make',
      _target: [{ _ref: 'layer' }],
      using: {
        _class: 'pixelLayer'
      },
      _isCommand: true
    }];
  }

  const BatchPlayModule = {
    buildFillSelectionCommand,
    buildDeselectSelectionCommand,
    buildCreateNewPixelLayerCommand
  };

  global.LassoPaintBatchPlay = BatchPlayModule;
})(window);
