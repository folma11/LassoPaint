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

  function bindCollapsibleSection(toggleId, contentId) {
    const toggle = document.getElementById(toggleId);
    const content = document.getElementById(contentId);

    if (!toggle || !content) {
      console.warn(`[LassoPaint] Accordion elements not found: ${toggleId}, ${contentId}.`);
      return;
    }

    function setExpanded(expanded) {
      if (expanded) {
        content.classList.remove('is-collapsed');
      } else {
        content.classList.add('is-collapsed');
      }

      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      const marker = toggle.querySelector('.section-muted');
      if (marker) {
        marker.textContent = expanded ? '▾' : '▸';
      }
    }

    function toggleSection() {
      setExpanded(content.classList.contains('is-collapsed'));
    }

    setExpanded(false);
    toggle.addEventListener('click', toggleSection);
    toggle.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleSection();
      }
    });
  }

  const PanelUI = {
    attach(context) {
      appContext = context || null;

      bindCollapsibleSection('advancedToggle', 'advancedContent');
      bindCollapsibleSection('developerToggle', 'developerContent');

      const runFillButton = document.getElementById('runFillButton');
      const autoFillModeButton = document.getElementById('autoFillModeButton');
      const autoEraseModeButton = document.getElementById('autoEraseModeButton');
      const autoOffModeButton = document.getElementById('autoOffModeButton');
      const eraseSelectionButton = document.getElementById('eraseSelectionButton');
      const newLayerCheckbox = document.getElementById('newLayerCheckbox');
      const deselectCheckbox = document.getElementById('deselectCheckbox');
      const presetButtons = Array.prototype.slice.call(document.querySelectorAll('.preset-option'));
      const opacityButtons = Array.prototype.slice.call(document.querySelectorAll('.opacity-option'));
      const blendModeButtons = Array.prototype.slice.call(document.querySelectorAll('.blend-option'));
      const fillSettingGroups = Array.prototype.slice.call(document.querySelectorAll('.fill-setting'));
      const quickCommandButtons = [
        document.getElementById('quickFillButton'),
        document.getElementById('quickFillDeselectButton'),
        document.getElementById('quickNewLayerFillButton'),
        document.getElementById('quickNewLayerFillDeselectButton')
      ].filter(Boolean);

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

      function applyPreset(preset, options) {
        const normalizedPreset = normalizePreset(preset);
        const presetSettings = fillPresets[normalizedPreset];
        setPresetButtonState(normalizedPreset);
        setOpacityButtonState(presetSettings.opacity);
        setBlendModeButtonState(presetSettings.blendMode);

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
        opacityButtons.forEach((button) => {
          const activate = () => {
            const opacity = normalizeOpacity(button.getAttribute('data-opacity'));
            setOpacityButtonState(opacity);
            writeStorageString('lassopaint.fillOpacity', String(opacity));
            updatePresetButtonForCurrentSettings();
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
        blendModeButtons.forEach((button) => {
          const activate = () => {
            const blendMode = normalizeBlendMode(button.getAttribute('data-blend-mode'));
            setBlendModeButtonState(blendMode);
            writeStorageString('lassopaint.fillBlendMode', blendMode);
            updatePresetButtonForCurrentSettings();
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

      async function runCommandAction(commandName, buttonElement, fallbackLabel) {
        if (!appContext || !appContext.photoshop || typeof appContext.photoshop.runCommand !== 'function') {
          PanelUI.setStatus('Photoshop bridge is not ready.', true);
          console.error('[LassoPaint] Photoshop bridge is unavailable.');
          return;
        }

        const options = getCurrentFillOptions();
        const label = fallbackLabel || buttonElement && buttonElement.textContent ? buttonElement.textContent : commandName;
        PanelUI.setStatus(`${label} running...`, false);
        if (buttonElement) {
          buttonElement.disabled = true;
        }

        try {
          const result = await appContext.photoshop.runCommand(commandName, options);
          if (result && result.success) {
            PanelUI.setStatus(result.message || `${label} completed.`, false);
            console.info(`[LassoPaint] ${label} completed.`);
          } else {
            const message = result && result.message ? result.message : `${label} failed.`;
            PanelUI.setStatus(message, true);
            console.error(`[LassoPaint] ${label} failed.`, result);
          }
        } catch (error) {
          PanelUI.setStatus(`${label} failed.`, true);
          console.error(`[LassoPaint] ${label} failed.`, error);
        } finally {
          if (buttonElement) {
            buttonElement.disabled = false;
          }
        }
      }

      if (runFillButton) {
        runFillButton.addEventListener('click', async () => {
          console.info('[LassoPaint] Run Fill button clicked.');
          await runCommandAction('runFill', runFillButton, 'Run Fill');
        });
      }

      quickCommandButtons.forEach((button) => {
        button.addEventListener('click', async () => {
          const commandName = button.getAttribute('data-command');
          console.info(`[LassoPaint] Quick command clicked: ${commandName}`);
          await runCommandAction(commandName, button, button.textContent || commandName);
        });
      });

      const startEventButton = document.getElementById('startEventLogButton');
      const stopEventButton = document.getElementById('stopEventLogButton');
      const clearEventButton = document.getElementById('clearEventLogButton');
      const eventLog = document.getElementById('eventLog');

      if (startEventButton) {
        startEventButton.addEventListener('click', async () => {
          if (!appContext || !appContext.photoshop || typeof appContext.photoshop.startEventDiagnostics !== 'function') {
            PanelUI.setStatus('Photoshop diagnostics bridge is not ready.', true);
            return;
          }

          const result = await appContext.photoshop.startEventDiagnostics();
          if (result && result.success) {
            PanelUI.setStatus('Event logging started.', false);
          } else {
            PanelUI.setStatus(result && result.message ? result.message : 'Failed to start event logging.', true);
          }
        });
      }

      if (stopEventButton) {
        stopEventButton.addEventListener('click', async () => {
          if (!appContext || !appContext.photoshop || typeof appContext.photoshop.stopEventDiagnostics !== 'function') {
            PanelUI.setStatus('Photoshop diagnostics bridge is not ready.', true);
            return;
          }

          const result = await appContext.photoshop.stopEventDiagnostics();
          if (result && result.success) {
            PanelUI.setStatus('Event logging stopped.', false);
          } else {
            PanelUI.setStatus(result && result.message ? result.message : 'Failed to stop event logging.', true);
          }
        });
      }

      if (clearEventButton) {
        clearEventButton.addEventListener('click', () => {
          if (eventLog) {
            eventLog.textContent = '';
          }
          PanelUI.setStatus('Event log cleared.', false);
        });
      }

      if (eraseSelectionButton) {
        eraseSelectionButton.addEventListener('click', async () => {
          console.info('[LassoPaint] Erase Selection button clicked.');
          await runCommandAction('erase', eraseSelectionButton, 'Erase Selection');
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
