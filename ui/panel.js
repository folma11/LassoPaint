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

  const PanelUI = {
    attach(context) {
      appContext = context || null;

      const runFillButton = document.getElementById('runFillButton');
      const newLayerCheckbox = document.getElementById('newLayerCheckbox');
      const deselectCheckbox = document.getElementById('deselectCheckbox');

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

      if (runFillButton) {
        runFillButton.addEventListener('click', async () => {
          console.info('[LassoPaint] Run Fill button clicked.');

          if (!appContext || !appContext.photoshop || typeof appContext.photoshop.runConfiguredFill !== 'function') {
            PanelUI.setStatus('Photoshop bridge is not ready.', true);
            console.error('[LassoPaint] Photoshop bridge is unavailable.');
            return;
          }

          const options = {
            newLayer: newLayerCheckbox ? Boolean(newLayerCheckbox.checked) : false,
            deselect: deselectCheckbox ? Boolean(deselectCheckbox.checked) : false
          };

          PanelUI.setStatus('Running fill workflow...', false);
          runFillButton.disabled = true;

          try {
            const result = await appContext.photoshop.runConfiguredFill(options);
            if (result && result.success) {
              PanelUI.setStatus(result.message || 'Fill workflow completed.', false);
              console.info('[LassoPaint] Fill workflow completed.');
            } else {
              const message = result && result.message ? result.message : 'Fill workflow failed.';
              PanelUI.setStatus(message, true);
              console.error('[LassoPaint] Fill workflow failed.', result);
            }
          } catch (error) {
            PanelUI.setStatus('Fill workflow failed.', true);
            console.error('[LassoPaint] Fill workflow failed.', error);
          } finally {
            runFillButton.disabled = false;
          }
        });
      }

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
