(function (global) {
  'use strict';

  const BatchPlayAPI = {
    initialize() {
      console.info('[LassoPaint] BatchPlay module initialized.');
    },

    buildFillSelectionCommand() {
      console.info('[LassoPaint] Building fill-selection BatchPlay payload.');
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
    },

    buildDeselectSelectionCommand() {
      console.info('[LassoPaint] Building deselect-selection BatchPlay payload.');
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
    },

    buildCreateNewPixelLayerCommand() {
      console.info('[LassoPaint] Building new-pixel-layer BatchPlay payload.');
      return [{
        _obj: 'make',
        _target: [{ _ref: 'layer' }],
        using: {
          _class: 'pixelLayer'
        },
        _isCommand: true
      }];
    }
  };

  global.LassoPaintBatchPlay = BatchPlayAPI;
})(window);
