(function (global) {
  'use strict';

  function normalizeOpacity(value) {
    const numeric = Number(value);
    return [20, 40, 60, 80, 100].indexOf(numeric) !== -1 ? numeric : 100;
  }

  function normalizeBlendMode(value) {
    return ['multiply', 'screen', 'overlay'].indexOf(value) !== -1 ? value : 'normal';
  }

  function buildFillSelectionCommand(opacity, blendMode, options) {
    const fillOpacity = normalizeOpacity(opacity);
    const fillBlendMode = normalizeBlendMode(blendMode);
    const preserveTransparency = Boolean(options && options.preserveTransparency);
    return [{
      _obj: 'fill',
      using: {
        _enum: 'fillContents',
        _value: 'foregroundColor'
      },
      opacity: {
        _unit: 'percentUnit',
        _value: fillOpacity
      },
      mode: {
        _enum: 'blendMode',
        _value: fillBlendMode
      },
      preserveTransparency,
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

  function buildGetTargetLayerCommand() {
    return [{
      _obj: 'get',
      _target: [{
        _ref: 'layer',
        _enum: 'ordinal',
        _value: 'targetEnum'
      }],
      _options: {
        dialogOptions: 'dontDisplay'
      }
    }];
  }

  function buildGetSelectionBoundsCommand() {
    return [{
      _obj: 'get',
      _target: [
        {
          _property: 'selection'
        },
        {
          _ref: 'document',
          _enum: 'ordinal',
          _value: 'targetEnum'
        }
      ],
      _options: {
        dialogOptions: 'dontDisplay'
      }
    }];
  }

  const BatchPlayModule = {
    buildFillSelectionCommand,
    buildDeselectSelectionCommand,
    buildCreateNewPixelLayerCommand,
    buildGetTargetLayerCommand,
    buildGetSelectionBoundsCommand
  };

  global.LassoPaintBatchPlay = BatchPlayModule;
})(window);
