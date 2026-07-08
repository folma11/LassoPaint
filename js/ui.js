(function (global) {
  'use strict';

  let appContext = null;

  function readStorageBoolean(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      if (value === null) {
        return fallback;
      }
      return value === 'true';
    } catch (error) {
      console.warn('[LassoPaint] Unable to read localStorage setting.', error);
      return fallback;
    }
  }

  function writeStorageBoolean(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch (error) {
      console.warn('[LassoPaint] Unable to write localStorage setting.', error);
    }
  }

  const UI = {
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
            UI.setStatus('Photoshop bridge is not ready.', true);
            console.error('[LassoPaint] Photoshop bridge is unavailable.');
            return;
          }

          const options = {
            newLayer: newLayerCheckbox ? Boolean(newLayerCheckbox.checked) : false,
            deselect: deselectCheckbox ? Boolean(deselectCheckbox.checked) : false
          };

          UI.setStatus('Running fill workflow...', false);
          runFillButton.disabled = true;

          try {
            const result = await appContext.photoshop.runConfiguredFill(options);
            if (result && result.success) {
              UI.setStatus(result.message || 'Fill workflow completed.', false);
              console.info('[LassoPaint] Fill workflow completed.');
            } else {
              const message = result && result.message ? result.message : 'Fill workflow failed.';
              UI.setStatus(message, true);
              console.error('[LassoPaint] Fill workflow failed.', result);
            }
          } catch (error) {
            UI.setStatus('Fill workflow failed.', true);
            console.error('[LassoPaint] Fill workflow failed.', error);
          } finally {
            runFillButton.disabled = false;
          }
        });
      }

      const actionButtons = [
        document.getElementById('fillSelectionButton'),
        document.getElementById('fillAndDeselectButton'),
        document.getElementById('newLayerFillButton'),
        document.getElementById('newLayerFillDeselectButton')
      ].filter(Boolean);

      actionButtons.forEach((button) => {
        button.addEventListener('click', async () => {
          const actionName = button.getAttribute('data-action');
          console.info(`[LassoPaint] Advanced button clicked: ${actionName}`);

          if (!appContext || !appContext.photoshop || typeof appContext.photoshop[actionName] !== 'function') {
            UI.setStatus('Photoshop bridge is not ready.', true);
            console.error('[LassoPaint] Photoshop bridge is unavailable.');
            return;
          }

          UI.setStatus(`${button.textContent} running...`, false);
          button.disabled = true;

          try {
            const result = await appContext.photoshop[actionName]();
            if (result && result.success) {
              UI.setStatus(result.message || `${button.textContent} completed.`, false);
              console.info(`[LassoPaint] ${button.textContent} succeeded.`);
            } else {
              const message = result && result.message ? result.message : `${button.textContent} failed.`;
              UI.setStatus(message, true);
              console.error(`[LassoPaint] ${button.textContent} failed.`, result);
            }
          } catch (error) {
            UI.setStatus(`${button.textContent} failed.`, true);
            console.error(`[LassoPaint] ${button.textContent} failed.`, error);
          } finally {
            button.disabled = false;
          }
        });
      });

      const startButton = document.getElementById('startEventLogButton');
      const stopButton = document.getElementById('stopEventLogButton');
      const clearButton = document.getElementById('clearEventLogButton');
      const eventLog = document.getElementById('eventLog');

      if (startButton) {
        startButton.addEventListener('click', async () => {
          console.info('[LassoPaint] Start Event Log clicked.');
          if (!appContext || !appContext.photoshop || typeof appContext.photoshop.startEventDiagnostics !== 'function') {
            UI.setStatus('Photoshop diagnostics bridge is not ready.', true);
            console.error('[LassoPaint] Event diagnostics bridge is unavailable.');
            return;
          }

          const result = await appContext.photoshop.startEventDiagnostics();
          if (result && result.success) {
            UI.setStatus('Event logging started.', false);
            console.info('[LassoPaint] Event logging started.');
          } else {
            UI.setStatus(result && result.message ? result.message : 'Failed to start event logging.', true);
            console.error('[LassoPaint] Failed to start event logging.', result);
          }
        });
      }

      if (stopButton) {
        stopButton.addEventListener('click', async () => {
          console.info('[LassoPaint] Stop Event Log clicked.');
          if (!appContext || !appContext.photoshop || typeof appContext.photoshop.stopEventDiagnostics !== 'function') {
            UI.setStatus('Photoshop diagnostics bridge is not ready.', true);
            console.error('[LassoPaint] Event diagnostics bridge is unavailable.');
            return;
          }

          const result = await appContext.photoshop.stopEventDiagnostics();
          if (result && result.success) {
            UI.setStatus('Event logging stopped.', false);
            console.info('[LassoPaint] Event logging stopped.');
          } else {
            UI.setStatus(result && result.message ? result.message : 'Failed to stop event logging.', true);
            console.error('[LassoPaint] Failed to stop event logging.', result);
          }
        });
      }

      if (clearButton) {
        clearButton.addEventListener('click', () => {
          console.info('[LassoPaint] Clear Event Log clicked.');
          if (eventLog) {
            eventLog.textContent = '';
          }
          UI.setStatus('Event log cleared.', false);
        });
      }

      UI.setStatus('Ready to run a fill workflow.', false);
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

    clearWatchLog() {
      const watchLog = document.getElementById('watchLog');
      if (watchLog) {
        watchLog.textContent = '';
      }
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

  global.LassoPaintUI = UI;
})(window);
