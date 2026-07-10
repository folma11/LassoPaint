(function (global) {
  'use strict';

  let appContext = null;

  function readStorageBoolean(key, fallback) {
    return global.LassoPaintSettingsStorage && typeof global.LassoPaintSettingsStorage.readBoolean === 'function'
      ? global.LassoPaintSettingsStorage.readBoolean(key, fallback)
      : fallback;
  }

  function writeStorageBoolean(key, value) {
    if (global.LassoPaintSettingsStorage && typeof global.LassoPaintSettingsStorage.writeBoolean === 'function') {
      global.LassoPaintSettingsStorage.writeBoolean(key, value);
    }
  }

  function readStorageString(key, fallback) {
    return global.LassoPaintSettingsStorage && typeof global.LassoPaintSettingsStorage.readString === 'function'
      ? global.LassoPaintSettingsStorage.readString(key, fallback)
      : fallback;
  }

  function writeStorageString(key, value) {
    if (global.LassoPaintSettingsStorage && typeof global.LassoPaintSettingsStorage.writeString === 'function') {
      global.LassoPaintSettingsStorage.writeString(key, value);
    }
  }

  const PanelUI = {
    attach(context) {
      appContext = context || null;

      const autoFillModeButton = document.getElementById('autoFillModeButton');
      const autoEraseModeButton = document.getElementById('autoEraseModeButton');
      const autoOffModeButton = document.getElementById('autoOffModeButton');
      const newLayerCheckbox = document.getElementById('newLayerCheckbox');
      const deselectCheckbox = document.getElementById('deselectCheckbox');
      const presetButtons = Array.prototype.slice.call(document.querySelectorAll('.preset-option'));
      const opacityButtons = Array.prototype.slice.call(document.querySelectorAll('.opacity-option'));
      const blendModeButtons = Array.prototype.slice.call(document.querySelectorAll('.blend-option'));
      const fillSettingGroups = Array.prototype.slice.call(document.querySelectorAll('.fill-setting'));
      const fillSettingsToggle = document.getElementById('fillSettingsToggle');
      const fillSettingsContent = document.getElementById('fillSettingsContent');
      const fillSettingsSummary = document.getElementById('fillSettingsSummary');

      if (newLayerCheckbox) {
        newLayerCheckbox.checked = readStorageBoolean('lassopaint.newLayerBeforeFill', false);
        newLayerCheckbox.addEventListener('change', (event) => {
          writeStorageBoolean('lassopaint.newLayerBeforeFill', Boolean(event.target.checked));
          syncAutoFillOptions();
          console.info('[LassoPaint] New Layer setting saved.', event.target.checked);
        });
      }

      if (deselectCheckbox) {
        deselectCheckbox.checked = readStorageBoolean('lassopaint.deselectAfterFill', false);
        deselectCheckbox.addEventListener('change', (event) => {
          writeStorageBoolean('lassopaint.deselectAfterFill', Boolean(event.target.checked));
          syncAutoFillOptions();
          console.info('[LassoPaint] Deselect setting saved.', event.target.checked);
        });
      }

      function normalizeOpacity(value) {
        const opacity = Number(value);
        return [20, 40, 60, 80, 100].indexOf(opacity) !== -1 ? opacity : 100;
      }

      const fillPresets = {
        base: { opacity: 100, blendMode: 'normal' },
        shadow: { opacity: 40, blendMode: 'multiply' },
        highlight: { opacity: 40, blendMode: 'screen' },
        overlay: { opacity: 40, blendMode: 'overlay' }
      };

      function normalizePreset(value) {
        return fillPresets[value] ? value : 'base';
      }

      function getCurrentOpacity() {
        const selected = opacityButtons.find((button) => button.getAttribute('aria-pressed') === 'true');
        return normalizeOpacity(selected ? selected.getAttribute('data-opacity') : 100);
      }

      function setOpacityButtonState(opacity) {
        const normalizedOpacity = normalizeOpacity(opacity);
        opacityButtons.forEach((button) => {
          button.setAttribute('aria-pressed', normalizeOpacity(button.getAttribute('data-opacity')) === normalizedOpacity ? 'true' : 'false');
        });
      }

      function normalizeBlendMode(value) {
        return ['multiply', 'screen', 'overlay'].indexOf(value) !== -1 ? value : 'normal';
      }

      function getCurrentBlendMode() {
        const selected = blendModeButtons.find((button) => button.getAttribute('aria-pressed') === 'true');
        return normalizeBlendMode(selected ? selected.getAttribute('data-blend-mode') : 'normal');
      }

      function setBlendModeButtonState(blendMode) {
        const normalizedBlendMode = normalizeBlendMode(blendMode);
        blendModeButtons.forEach((button) => {
          button.setAttribute('aria-pressed', normalizeBlendMode(button.getAttribute('data-blend-mode')) === normalizedBlendMode ? 'true' : 'false');
        });
      }

      function setPresetButtonState(preset) {
        presetButtons.forEach((button) => {
          button.setAttribute('aria-pressed', button.getAttribute('data-preset') === preset ? 'true' : 'false');
        });
      }

      function getPresetForSettings(opacity, blendMode) {
        const normalizedOpacity = normalizeOpacity(opacity);
        const normalizedBlendMode = normalizeBlendMode(blendMode);
        const presetNames = Object.keys(fillPresets);
        for (let index = 0; index < presetNames.length; index += 1) {
          const presetName = presetNames[index];
          const presetSettings = fillPresets[presetName];
          if (presetSettings.opacity === normalizedOpacity && presetSettings.blendMode === normalizedBlendMode) {
            return presetName;
          }
        }

        return '';
      }

      function updatePresetButtonForCurrentSettings() {
        setPresetButtonState(getPresetForSettings(getCurrentOpacity(), getCurrentBlendMode()));
      }

      function formatBlendModeLabel(blendMode) {
        const normalizedBlendMode = normalizeBlendMode(blendMode);
        if (normalizedBlendMode === 'multiply') {
          return 'Multiply';
        }
        if (normalizedBlendMode === 'screen') {
          return 'Screen';
        }
        if (normalizedBlendMode === 'overlay') {
          return 'Overlay';
        }
        return 'Normal';
      }

      function updateFillSettingsSummary() {
        if (fillSettingsSummary) {
          fillSettingsSummary.textContent = `${getCurrentOpacity()} / ${formatBlendModeLabel(getCurrentBlendMode())}`;
        }
      }

      function setFillSettingsExpanded(expanded) {
        if (!fillSettingsToggle || !fillSettingsContent) {
          return;
        }

        fillSettingsContent.classList.toggle('is-collapsed', !expanded);
        fillSettingsToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');

        const marker = fillSettingsToggle.querySelector('.settings-tab-marker');
        if (marker) {
          marker.textContent = expanded ? '▾' : '▸';
        }
      }

      function toggleFillSettings() {
        setFillSettingsExpanded(fillSettingsContent && fillSettingsContent.classList.contains('is-collapsed'));
      }

      function applyPreset(preset, options) {
        const normalizedPreset = normalizePreset(preset);
        const presetSettings = fillPresets[normalizedPreset];
        setPresetButtonState(normalizedPreset);
        setOpacityButtonState(presetSettings.opacity);
        setBlendModeButtonState(presetSettings.blendMode);
        updateFillSettingsSummary();

        if (!options || !options.skipStorage) {
          writeStorageString('lassopaint.fillOpacity', String(presetSettings.opacity));
          writeStorageString('lassopaint.fillBlendMode', presetSettings.blendMode);
        }

        syncAutoFillOptions();
      }

      function getCurrentFillOptions() {
        return {
          newLayer: newLayerCheckbox ? Boolean(newLayerCheckbox.checked) : false,
          deselect: deselectCheckbox ? Boolean(deselectCheckbox.checked) : false,
          opacity: getCurrentOpacity(),
          blendMode: getCurrentBlendMode()
        };
      }

      function syncAutoFillOptions() {
        if (appContext && appContext.photoshop && typeof appContext.photoshop.setAutoModeOptions === 'function') {
          appContext.photoshop.setAutoModeOptions(getCurrentFillOptions());
        }
      }

      function normalizeAutoMode(mode) {
        return mode === 'fill' || mode === 'erase' ? mode : 'off';
      }

      function readInitialAutoMode() {
        const mode = readStorageString('lassopaint.autoMode', '');
        if (mode === 'fill' || mode === 'erase' || mode === 'off') {
          return mode;
        }

        return readStorageBoolean('lassopaint.autoFill', false) ? 'fill' : 'off';
      }

      async function setAutoMode(mode) {
        const normalizedMode = normalizeAutoMode(mode);
        if (!appContext || !appContext.photoshop || typeof appContext.photoshop.setAutoMode !== 'function') {
          PanelUI.setStatus('Auto Mode is not available.', true);
          setAutoModeButtonState('off');
          return;
        }

        const result = await appContext.photoshop.setAutoMode(normalizedMode, getCurrentFillOptions());
        if (result && result.success) {
          setAutoModeButtonState(normalizedMode);
          PanelUI.setStatus(result.message || 'Auto Mode updated.', false);
        } else {
          PanelUI.setStatus(result && result.message ? result.message : 'Auto Mode failed.', true);
          setAutoModeButtonState('off');
          writeStorageString('lassopaint.autoMode', 'off');
        }
      }

      function getAutoModeButtonState() {
        if (autoFillModeButton && autoFillModeButton.getAttribute('aria-pressed') === 'true') {
          return 'fill';
        }
        if (autoEraseModeButton && autoEraseModeButton.getAttribute('aria-pressed') === 'true') {
          return 'erase';
        }
        return 'off';
      }

      function setAutoModeButtonState(mode) {
        const normalizedMode = normalizeAutoMode(mode);
        if (autoFillModeButton) {
          autoFillModeButton.setAttribute('aria-pressed', normalizedMode === 'fill' ? 'true' : 'false');
        }
        if (autoEraseModeButton) {
          autoEraseModeButton.setAttribute('aria-pressed', normalizedMode === 'erase' ? 'true' : 'false');
        }
        if (autoOffModeButton) {
          autoOffModeButton.setAttribute('aria-pressed', normalizedMode === 'off' ? 'true' : 'false');
        }
        setFillSettingControlsEnabled(normalizedMode === 'fill');
      }

      if (fillSettingsToggle && fillSettingsContent) {
        setFillSettingsExpanded(false);
        fillSettingsToggle.addEventListener('click', toggleFillSettings);
        fillSettingsToggle.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleFillSettings();
          }
        });
      }

      function setFillSettingControlsEnabled(enabled) {
        fillSettingGroups.forEach((group) => {
          group.classList.toggle('is-disabled', !enabled);
          group.setAttribute('aria-disabled', enabled ? 'false' : 'true');
        });
      }

      function bindModeButton(element, mode) {
        if (!element) {
          return;
        }

        const activate = async () => {
          writeStorageString('lassopaint.autoMode', mode);
          await setAutoMode(mode);
        };

        element.addEventListener('click', activate);
        element.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            activate();
          }
        });
      }

      if (autoFillModeButton || autoEraseModeButton || autoOffModeButton) {
        setAutoModeButtonState(readInitialAutoMode());
        bindModeButton(autoFillModeButton, 'fill');
        bindModeButton(autoEraseModeButton, 'erase');
        bindModeButton(autoOffModeButton, 'off');
      }

      if (opacityButtons.length) {
        setOpacityButtonState(readStorageString('lassopaint.fillOpacity', '100'));
        updateFillSettingsSummary();
        opacityButtons.forEach((button) => {
          const activate = () => {
            const opacity = normalizeOpacity(button.getAttribute('data-opacity'));
            setOpacityButtonState(opacity);
            writeStorageString('lassopaint.fillOpacity', String(opacity));
            updatePresetButtonForCurrentSettings();
            updateFillSettingsSummary();
            syncAutoFillOptions();
            console.info('[LassoPaint] Fill opacity saved.', opacity);
          };

          button.addEventListener('click', activate);
          button.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              activate();
            }
          });
        });
      }

      if (blendModeButtons.length) {
        setBlendModeButtonState(readStorageString('lassopaint.fillBlendMode', 'normal'));
        updateFillSettingsSummary();
        blendModeButtons.forEach((button) => {
          const activate = () => {
            const blendMode = normalizeBlendMode(button.getAttribute('data-blend-mode'));
            setBlendModeButtonState(blendMode);
            writeStorageString('lassopaint.fillBlendMode', blendMode);
            updatePresetButtonForCurrentSettings();
            updateFillSettingsSummary();
            syncAutoFillOptions();
            console.info('[LassoPaint] Fill blend mode saved.', blendMode);
          };

          button.addEventListener('click', activate);
          button.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              activate();
            }
          });
        });
      }

      if (presetButtons.length) {
        updatePresetButtonForCurrentSettings();
        updateFillSettingsSummary();
        presetButtons.forEach((button) => {
          const activate = () => {
            const preset = normalizePreset(button.getAttribute('data-preset'));
            applyPreset(preset);
            console.info('[LassoPaint] Fill preset saved.', preset);
          };

          button.addEventListener('click', activate);
          button.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              activate();
            }
          });
        });
      }

      syncAutoFillOptions();
      if (getAutoModeButtonState() !== 'off') {
        setAutoMode(getAutoModeButtonState());
      }

      PanelUI.setStatus('Ready to run a fill workflow.', false);
      console.info('[LassoPaint] UI attached.');
    },

    appendEventLog(message) {
      const eventLog = document.getElementById('eventLog');
      if (!eventLog) {
        return;
      }

      const entry = document.createElement('div');
      entry.textContent = message;
      eventLog.appendChild(entry);
      eventLog.scrollTop = eventLog.scrollHeight;
    },

    appendWatchLog(message) {
      const watchLog = document.getElementById('watchLog');
      if (!watchLog) {
        return;
      }

      const entry = document.createElement('div');
      entry.textContent = message;
      watchLog.appendChild(entry);
      watchLog.scrollTop = watchLog.scrollHeight;
    },

    setStatus(message, isError) {
      const status = document.getElementById('statusText');
      if (!status) {
        return;
      }

      status.textContent = message || 'Ready.';
      status.classList.toggle('error', Boolean(isError));
    }
  };

  global.LassoPaintUI = PanelUI;
})(window);
