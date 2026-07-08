# Changelog

## 0.7.0 - 2026-07-08

- Added an opt-in "Allow fill without selection" checkbox with localStorage persistence.
- Made Run Fill block by default unless the user explicitly enables the override.
- Kept New Layer before fill, Deselect after fill, and the disabled Selection Watcher behavior intact.

## 0.6.3 - 2026-07-08

- Rolled back the experimental selection-check logic so Run Fill again uses the safe v0.5.0-style fill workflow without calling any selection-check BatchPlay command.
- Added a visible warning note in the panel that explains Photoshop may fill the whole layer when no selection exists.
- Kept New Layer before fill, Deselect after fill, and the disabled Selection Watcher behavior intact.

## 0.6.2 - 2026-07-08

- Made the no-selection guard mandatory for Run Fill so the workflow aborts before any layer, fill, or deselect commands can run.
- Replaced the previous guard with a direct BatchPlay selection-bounds check that logs "Selection check: true" or "Selection check: false" and never reaches the fill descriptor when no selection exists.
- Kept the selection watcher disabled and preserved the existing settings and advanced helpers.

## 0.6.1 - 2026-07-08

- Added a safe selection check before any fill workflow so Run Fill aborts with "No active selection." when there is no current selection.
- Prevented fill, new-layer, and deselect steps from running when no selection exists, while leaving the existing settings and advanced helpers intact.
- Kept the selection watcher disabled and avoided any blocking Photoshop dialogs during the guard check.

## 0.6.0 - 2026-07-08

- Refactored the panel into clearer module boundaries under commands, photoshop, storage, and ui without changing the visible workflow.
- Kept the Run Fill workflow, advanced helpers, diagnostics, and disabled selection watcher behavior intact while routing them through the new module structure.
- Preserved localStorage-backed settings and the existing Photoshop BatchPlay execution path.

## 0.5.0 - 2026-07-08

- Replaced the panel workflow with a practical one-button configurable fill system.
- Added a main Run Fill button with New Layer before fill and Deselect after fill settings persisted via localStorage.
- Kept the existing fill actions available as advanced helpers and left event diagnostics intact.
- Marked the Selection Watcher UI as experimental and disabled.

## 0.4.2 - 2026-07-08

- Disabled the selection watcher polling path entirely to prevent unsafe Photoshop alerts.
- Start Watch now reports that the watcher is disabled and no longer attempts any selection-bounds querying.
- Stop Watch clears any existing timer and the watcher remains safe after reload.

## 0.4.1 - 2026-07-08

- Hardened the selection watcher polling so it avoids blocking Photoshop alerts during repeated bounds checks.
- Added dontDisplay options to watcher BatchPlay polling commands and made failures fall back silently to no selection.
- Throttled repeated polling errors to a single log per distinct message while keeping the watcher safe to leave running.

## 0.4.0 - 2026-07-08

- Added a Selection Watcher diagnostics section to the panel for polling Photoshop selection bounds.
- Added Start Watch, Stop Watch, and Clear Watch Log controls with a scrollable watch log.
- Polls every 100ms while watching and logs the current state as no active document, no selection, selection exists, or selection bounds changed.
- Kept the v0.2.1 fill buttons and existing event diagnostics intact while avoiding any document changes during watching.
- Left automatic lasso detection out of scope for this release.

## 0.3.0 - 2026-07-08

- Added an Event Diagnostics section to the panel for investigation-only monitoring.
- Added Start Event Log, Stop Event Log, and Clear Log controls with a scrollable log area.
- Registered Photoshop action notification listeners for likely selection-related events and logged event name, descriptor summary, and timestamp.
- Kept the v0.2.1 fill buttons and workflows intact and avoided any document changes while diagnostics are running.
- Left automatic lasso detection out of scope for this release.

## 0.2.1 - 2026-07-08

- Fixed deselect behavior by switching the BatchPlay descriptor to the standard Photoshop "set selection to none" Action Manager command.
- Kept fill and new-layer workflows unchanged while making Fill + Deselect and New Layer + Fill + Deselect clear the active selection correctly.
- Left automatic lasso detection out of scope for this release.

## 0.2.0 - 2026-07-08

- Added practical fill workflow buttons for fill, fill plus deselect, new layer plus fill, and new layer plus fill plus deselect.
- Routed each action through Photoshop executeAsModal with BatchPlay commands for fill, deselect, and new layer creation.
- Kept the original Fill Selection behavior intact while adding clearer status handling and console logging.
- Left automatic lasso detection out of scope for this release.

## 0.1.0 - 2026-07-08

- Implemented the first working Lasso Paint panel experience.
- Added a Fill Selection button that sends a Photoshop BatchPlay fill command through executeAsModal.
- Updated the panel UI to show a title, description, button, and status text.
- Added clear console logging for startup, button clicks, and fill results.
- Left automatic lasso detection out of scope for this release.
