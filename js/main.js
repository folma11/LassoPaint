(function () {
  'use strict';

  const app = {
    ui: null,
    photoshop: null,
    batchplay: null,
    settings: null,
  };

  function initialize() {
    console.info('[LassoPaint] Initializing plugin modules.');

    app.ui = window.LassoPaintUI || null;
    app.photoshop = window.LassoPaintPhotoshop || null;
    app.batchplay = window.LassoPaintBatchPlay || null;
    app.settings = window.LassoPaintSettings || null;

    if (app.batchplay && typeof app.batchplay.initialize === 'function') {
      app.batchplay.initialize();
    }

    if (app.photoshop && typeof app.photoshop.initialize === 'function') {
      app.photoshop.initialize();
    }

    if (app.ui && typeof app.ui.attach === 'function') {
      app.ui.attach(app);
    }
  }

  document.addEventListener('DOMContentLoaded', initialize);
})();
