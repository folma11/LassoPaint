# Changelog

## Unreleased

- Added Selection Brush Tool support for Auto Mode by waiting for the tool-change notification before processing the committed selection.
- Kept selection bounds validation, duplicate prevention, and the no-polling event-driven workflow intact.
- Updated Auto Mode duplicate detection so lasso additions and subtractions can run even when the outer selection bounds stay unchanged.
- Subscribed Auto Mode to Photoshop's `addTo` and `subtractFrom` selection action notifications.

## 1.0.1 - 2026-07-16

- Added Photoshop 26.0 compatibility by using manifest version 4 with a 26.0 minimum host version.
- Verified the plugin loads and core workflows operate in Photoshop 26.0 and 27.7 on Windows.
- No Fill, Erase, Auto Mode, or panel UI behavior changes.

## 1.0.0 - 2026-07-10

- Promoted Lasso Paint to the first stable public release.
- Added README installation guidance for packaged `.ccx` releases.
- Updated project metadata to version 1.0.0.

## 0.16.3 - 2026-07-10

- Added dedicated root-level 48px and 96px plugin list icons for packaged Creative Cloud installation display.
- Updated README wording to match the current Auto Mode, preset, collapsible fill controls, and simplified panel UI.
- Grouped Lasso Paint fill, erase, new layer, and deselect steps into a single plugin history state when Photoshop supports history suspension.
- Added README guidance for Photoshop's spring-loaded Eyedropper workflow while using Lasso Paint.
- Allowed Fill to recolor existing pixels when transparent pixels are locked by preserving transparency only for locked-transparency layers.
- Added a collapsible Opacity / Blend tab so detailed fill controls can stay tucked away during daily drawing.
- Removed the Advanced and Developer tabs from the panel for a cleaner daily drawing UI.
- Removed panel bindings for the hidden manual command and diagnostics controls.
- Updated README copy to match the simplified Auto Mode-focused panel.
- Updated project metadata to version 0.16.3.

## 0.16.2 - 2026-07-10

- Added built-in Fill Presets for Base, Shadow, Highlight, and Overlay workflows.
- Presets now update the current fill opacity and blend mode controls.
- Kept Erase behavior independent from preset, opacity, and blend mode settings.
- Updated project metadata to version 0.16.2.

## 0.16.1 - 2026-07-10

- Added a Fill blend mode control with Normal, Multiply, Screen, and Overlay options.
- Persisted the selected fill blend mode in local storage.
- Applied the selected blend mode to Auto Fill, Run Fill, and Advanced Quick Fill commands.
- Updated project metadata to version 0.16.1.

## 0.16.0 - 2026-07-09

- Added Fill opacity controls with 20%, 40%, 60%, 80%, and 100% options.
- Persisted the selected fill opacity in local storage.
- Applied fill opacity to Auto Fill, Run Fill, and Advanced Quick Fill commands.
- Updated project metadata to version 0.16.0.

## 0.15.19 - 2026-07-09

- Slightly reduced Auto Mode icon image size while keeping button dimensions unchanged.
- Updated project metadata to version 0.15.19.

## 0.15.18 - 2026-07-09

- Slightly reduced Auto Mode button height while keeping the icon size unchanged.
- Updated project metadata to version 0.15.18.

## 0.15.17 - 2026-07-09

- Updated the Fill mode icon to a tilted paint-bucket style.
- Updated the OFF mode icon to a heavier power-symbol style.
- Updated project metadata to version 0.15.17.

## 0.15.16 - 2026-07-09

- Slightly reduced Auto Mode icon size while keeping the larger button targets.
- Tilted the Fill mode icon to better suggest a fill tool.
- Increased spacing between the tagline and Auto Mode controls.
- Updated project metadata to version 0.15.16.

## 0.15.15 - 2026-07-09

- Increased Auto Mode button height and PNG icon size for clearer Fill, Erase, and OFF controls.
- Updated project metadata to version 0.15.15.

## 0.15.14 - 2026-07-09

- Reworked Auto Mode controls to use `div role="button"` wrappers with PNG icons for more stable Photoshop UXP rendering.
- Added keyboard activation for Enter and Space on the icon-only Auto Mode controls.
- Kept `aria-label`, `title`, and `aria-pressed` accessibility attributes on all Auto Mode controls.
- Updated project metadata to version 0.15.14.

## 0.15.13 - 2026-07-09

- Replaced PNG Auto Mode icons with text-rendered pictograms so buttons remain visible without hover.
- Kept pictogram-only Fill, Erase, and OFF controls with accessible labels and hover titles.
- Updated project metadata to version 0.15.13.

## 0.15.12 - 2026-07-09

- Rebuilt the Auto Mode PNG icons with transparent backgrounds.
- Reduced mode icon display size and added explicit image dimensions for reliable Photoshop UXP rendering.
- Updated project metadata to version 0.15.12.

## 0.15.11 - 2026-07-09

- Replaced CSS-drawn Auto Mode pictograms with PNG image icons for reliable Photoshop UXP panel rendering.
- Added Fill, Erase, and OFF mode icon assets.
- Updated project metadata to version 0.15.11.

## 0.15.10 - 2026-07-09

- Replaced inline SVG mode icons with CSS-drawn pictograms for better Photoshop UXP panel rendering.
- Kept pictogram-only Auto Mode controls with accessible labels and hover titles.
- Updated project metadata to version 0.15.10.

## 0.15.9 - 2026-07-09

- Replaced the Auto Mode Fill, Erase, and OFF button text with pictogram-only controls.
- Added accessible labels and hover titles for the pictogram mode buttons.
- Updated project metadata to version 0.15.9.

## 0.15.8 - 2026-07-09

- Changed Erase mode to call `app.activeDocument.activeLayers[0].clear()` after the existing selection bounds guard.
- Replaced unavailable `selection.clear()` handling with a layer clear workflow.
- Standardized unsupported Erase targets to show `Cannot erase on this layer.`.
- Updated project metadata to version 0.15.8.

## 0.15.7 - 2026-07-09

- Switched Erase mode from BatchPlay transparent fill to Photoshop DOM selection clearing.
- Removed the Erase BatchPlay fill descriptor so Photoshop's Fill dialog is not invoked.
- Used Lasso Draw's compiled script strings as a reference, especially its `clearSelection` path.
- Updated project metadata to version 0.15.7.

## 0.15.6 - 2026-07-09

- Changed Erase mode from background-color fill to transparent fill so selections are cleared instead of painted white.
- Kept the selection and layer guards before Erase to avoid unsafe no-selection actions.
- Updated project metadata to version 0.15.6.

## 0.15.5 - 2026-07-09

- Changed Erase mode to use the stable background-color fill workflow instead of unsupported Photoshop clear/cut commands.
- Kept selection and layer guards before Erase so unsupported targets are skipped before any action runs.
- Updated project metadata to version 0.15.5.

## 0.15.4 - 2026-07-09

- Prevented Erase mode from invoking unavailable Photoshop cut/fill behavior on unsupported layers.
- Added a layer safety check so Erase skips locked, background, or non-pixel layers before running the erase command.
- Updated project metadata to version 0.15.4.

## 0.15.3 - 2026-07-09

- Changed Erase mode from transparent fill to a dialog-free cut action for selected pixels.
- Updated project metadata to version 0.15.3.

## 0.15.2 - 2026-07-09

- Changed Erase mode to fill the active selection with transparency instead of invoking Photoshop's unavailable delete/clear command.
- Updated project metadata to version 0.15.2.

## 0.15.1 - 2026-07-09

- Switched Erase mode from the unavailable clear command to a selection delete command.
- Tightened the three-button Auto Mode layout so Fill, Erase, and OFF fit inside the panel.
- Updated project metadata to version 0.15.1.

## 0.15.0 - 2026-07-09

- Replaced Auto Fill ON/OFF with an Auto Mode selector: Fill, Erase, and OFF.
- Added Erase mode for automatically clearing pixels inside new selections.
- Added a manual Erase Selection command in Advanced.
- Renamed Deselect after fill to Deselect after action.
- Migrated the old `lassopaint.autoFill=true` setting to Auto Mode Fill behavior.
- Updated project metadata to version 0.15.0.

## 0.14.3 - 2026-07-09

- Split the primary Auto Fill control into separate ON and OFF buttons.
- Kept Run Fill in the Advanced section as a fallback.
- Updated project metadata to version 0.14.3.

## 0.14.2 - 2026-07-09

- Changed Auto Fill from a checkbox to an ON/OFF toggle button.
- Moved Run Fill into the Advanced section as a fallback.
- Promoted Auto Fill to the primary panel button location.
- Preserved the existing Auto Fill setting and behavior while making the active state easier to see.
- Updated project metadata to version 0.14.2.

## 0.14.1 - 2026-07-09

- Improved Auto Fill responsiveness for rapid lasso workflows by removing the time-based cooldown.
- Queued the latest selection event while Auto Fill is already running so fast repeated selections are not dropped.
- Kept duplicate prevention by skipping selections that match the last handled selection bounds.
- Updated project metadata to version 0.14.1.

## 0.14.0 - 2026-07-09

- Added Auto Fill Mode with a Workflow toggle that fills with the foreground color after a selection event.
- Kept Run Fill as a manual fallback and reused the existing active-selection guard before filling.
- Added a cooldown and in-progress guard to prevent duplicate Auto Fill runs from repeated notification events.
- Updated project metadata to version 0.14.0.

## 0.13.0 - 2026-07-09

- Removed the Safety section and the Allow fill without selection panel setting.
- Added a selection guard before every fill workflow so Run Fill and Advanced Quick Commands skip when no active selection can be confirmed.
- Prevented new-layer creation and deselect commands from running when fill is skipped.
- Removed duplicated Advanced buttons so Quick Commands presents only four fill workflow actions.
- Updated project metadata to version 0.13.0.

## 0.12.3 - 2026-07-09

- Reworked the README into the final public landing page with centered branding, badges, workflow media, screenshots, installation, usage, safety, roadmap, UXP, contributing, and license sections.
- Updated project metadata to version 0.12.3.

## 0.12.2 - 2026-07-08

- Polished the README with a tighter branded introduction, dedicated screenshot placeholders, and more scannable feature descriptions.
- Simplified usage into a three-step workflow and separated the roadmap into Current and Coming Next sections.

## 0.12.1 - 2026-07-08

- Switched the Photoshop panel header from the SVG logo to the UXP-compatible `assets/logo/logo.png` asset.
- Added compact, constrained raster-logo sizing while keeping Run Fill near the top and leaving README and manifest icon assets unchanged.
- Refined the header with a 36px centered logo and tighter spacing so branding stays subtle and Run Fill remains the visual focus.

## 0.12.0 - 2026-07-08

- Integrated the finalized Lasso Paint logo, LP mark, and Photoshop plugin icons from the shared `assets/` structure.
- Added a compact branded panel header and updated the README to use the official logo.
- Added brand usage, color, clear-space, and minimum-size guidance in `docs/branding.md` without changing plugin behavior.
- Corrected the panel header to display the official `assets/logo/logo.svg` artwork in a compact horizontal layout.

## 0.11.1 - 2026-07-08

- Redesigned the README as a clean GitHub landing page with centered branding, concise product messaging, installation and usage guidance, safety notes, and roadmap details.
- Added Markdown placeholders for Main Panel, Advanced Panel, and Photoshop Workflow screenshots.

## 0.11.0 - 2026-07-08

- Replaced the scaffold README with a polished, public-facing guide to Lasso Paint's purpose, features, installation, usage, safety, roadmap, and development structure.
- Added a placeholder for future screenshots and clarified the path toward a stable v1.0 workflow and future Auto Fill research.

## 0.10.9 - 2026-07-08

- Forced enabled Workflow and Safety checkbox labels to use the normal `#E0E0E0` text color in Photoshop UXP.
- Overrode the host text-fill styling at the existing checkbox-label selectors while keeping the Safety description muted and disabled colors limited to disabled controls.

## 0.10.8 - 2026-07-08

- Increased Workflow and Safety checkbox-label readability using the normal enabled text color.
- Kept the Safety description muted, gave status text its own mid-level contrast, and reserved disabled styling for disabled controls.

## 0.10.7 - 2026-07-08

- Moved Advanced and Developer accordion event binding into the external panel event module used by Photoshop UXP.
- Matched the accordion handlers to the existing HTML IDs and kept both sections collapsed by default.
- Preserved Advanced quick commands, safe Developer controls, fill logic, settings storage, and readable checkbox labels.

## 0.10.6 - 2026-07-08

- Restored reliable expand/collapse interaction for the Advanced and Developer sections in Photoshop UXP.
- Kept both sections collapsed by default and preserved all existing quick commands and safe Developer controls.
- Increased enabled checkbox-label contrast against the dark panel background.

## 0.10.4 - 2026-07-08

- Restored all three visible Workflow option rows with UXP-compatible flex layout and native checkbox rendering.
- Preserved the existing checkbox IDs, settings persistence, and command behavior.

## 0.10.3 - 2026-07-08

- Made Workflow checkboxes clearly visible in both unchecked and checked states on the dark panel background.
- Improved checkbox-label alignment and preserved all existing settings behavior.

## 0.10.2 - 2026-07-08

- Restyled the panel with a Photoshop-like dark gray palette, stronger content hierarchy, and a blue primary Run Fill action.
- Improved responsive spacing, button wrapping, checkbox alignment, typography, subtle separators, and muted success, warning, and error colors.
- Centralized colors and spacing in CSS variables while preserving all behavior and the collapsed Advanced and Developer sections.

## 0.10.1 - 2026-07-08

- Softened the warning styling and made it conditional on the Allow fill without selection setting.
- Removed the large workflow card background and slightly enlarged the Run Fill button for easier tapping.
- Kept Advanced and Developer collapsed by default and preserved all existing functionality.

## 0.11.0 - 2026-07-08

- Simplified the panel to feel more like a native Photoshop workspace with lighter headings, more breathing room, and a more focused primary action.
- Removed extra descriptive copy, grouped workflow controls under a compact heading, and moved status text to the bottom of the panel.
- Kept Advanced and Developer collapsed by default and preserved all existing functionality.

## 0.10.0 - 2026-07-08

- Simplified the startup UI by collapsing Advanced and Developer sections by default.
- Kept the existing fill workflow, settings, quick commands, and developer/debug controls available behind the collapsible sections.
- Preserved localStorage-backed settings and the disabled watcher behavior.

## 0.9.0 - 2026-07-08

- Cleaned up the panel layout for daily drawing use with a clearer hierarchy: Main Action, Settings, Quick Commands, and Experimental.
- Made Run Fill the primary action and kept Quick Commands compact and easy to scan.
- Grouped the settings and warning text more clearly and marked diagnostics and the watcher as disabled experimental controls.
- Kept all existing command behavior, settings persistence, and quick-command routing intact.

## 0.8.0 - 2026-07-08

- Added a new Quick Commands section with compact buttons for Fill, Fill+Deselect, NewLayer+Fill, and NewLayer+Fill+Deselect.
- Routed the quick commands through a reusable internal command registry so they share the same execution path as Run Fill.
- Kept the existing Run Fill workflow, New Layer before fill, Deselect after fill, Allow fill without selection, and disabled Selection Watcher behavior intact.

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
