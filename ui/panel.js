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
      const newLayerCheckbox = document.getElementById('newLayerCheckbox');
      const deselectCheckbox = document.getElementById('deselectCheckbox');
      const allowFillWithoutSelectionCheckbox = document.getElementById('allowFillWithoutSelectionCheckbox');
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
          console.info('[LassoPaint] New Layer setting saved.', event.target.checked);
        });
      }

      if (deselectCheckbox) {
        deselectCheckbox.checked = readStorageBoolean('lassopaint.deselectAfterFill', false);
        deselectCheckbox.addEventListener('change', (event) => {
          writeStorageBoolean('lassopaint.deselectAfterFill', Boolean(event.target.checked));
          console.info('[LassoPaint] Deselect setting saved.', event.target.checked);
        });
      }

      if (allowFillWithoutSelectionCheckbox) {
        allowFillWithoutSelectionCheckbox.checked = readStorageBoolean('lassopaint.allowFillWithoutSelection', false);
        allowFillWithoutSelectionCheckbox.addEventListener('change', (event) => {
          writeStorageBoolean('lassopaint.allowFillWithoutSelection', Boolean(event.target.checked));
          console.info('[LassoPaint] Allow fill without selection setting saved.', event.target.checked);
        });
      }

      function getCurrentFillOptions() {
        return {
          newLayer: newLayerCheckbox ? Boolean(newLayerCheckbox.checked) : false,
          deselect: deselectCheckbox ? Boolean(deselectCheckbox.checked) : false
        };
      }

      async function runCommandAction(commandName, buttonElement, fallbackLabel) {
        if (!appContext || !appContext.photoshop || typeof appContext.photoshop.runCommand !== 'function') {
          PanelUI.setStatus('Photoshop bridge is not ready.', true);
          console.error('[LassoPaint] Photoshop bridge is unavailable.');
          return;
        }

        const allowFillWithoutSelection = allowFillWithoutSelectionCheckbox ? Boolean(allowFillWithoutSelectionCheckbox.checked) : false;
        if (!allowFillWithoutSelection) {
          PanelUI.setStatus("Fill requires an active selection. Enable 'Allow fill without selection' to override.", true);
          console.warn('[LassoPaint] Fill requires an active selection.');
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

      const advancedButtons = [
        document.getElementById('fillSelectionButton'),
        document.getElementById('fillAndDeselectButton'),
        document.getElementById('newLayerFillButton'),
        document.getElementById('newLayerFillDeselectButton')
      ].filter(Boolean);

      advancedButtons.forEach((button) => {
        button.addEventListener('click', async () => {
          const actionName = button.getAttribute('data-action');
          console.info(`[LassoPaint] Advanced button clicked: ${actionName}`);

          if (!appContext || !appContext.photoshop || typeof appContext.photoshop[actionName] !== 'function') {
            PanelUI.setStatus('Photoshop bridge is not ready.', true);
            console.error('[LassoPaint] Photoshop bridge is unavailable.');
            return;
          }

          PanelUI.setStatus(`${button.textContent} running...`, false);
          button.disabled = true;

          try {
            const result = await appContext.photoshop[actionName]();
            if (result && result.success) {
              PanelUI.setStatus(result.message || `${button.textContent} completed.`, false);
              console.info(`[LassoPaint] ${button.textContent} succeeded.`);
            } else {
              const message = result && result.message ? result.message : `${button.textContent} failed.`;
              PanelUI.setStatus(message, true);
              console.error(`[LassoPaint] ${button.textContent} failed.`, result);
            }
          } catch (error) {
            PanelUI.setStatus(`${button.textContent} failed.`, true);
            console.error(`[LassoPaint] ${button.textContent} failed.`, error);
          } finally {
            button.disabled = false;
          }
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
