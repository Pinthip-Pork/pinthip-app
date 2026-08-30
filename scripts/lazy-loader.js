// Lazy Module Loader for PinThip App
// Load admin modules on-demand for better performance

(function() {
  'use strict';

  const loadedModules = new Set();
  const loadingPromises = new Map();

  window.PinThipSafe = window.PinThipSafe || {};

  window.PinThipSafe.lazyLoad = {
    /**
     * Load a module on-demand
     * @param {string} moduleName - Module name (e.g., 'admin-attendance')
     * @returns {Promise<void>}
     */
    loadModule: function(moduleName) {
      // Already loaded
      if (loadedModules.has(moduleName)) {
        return Promise.resolve();
      }

      // Currently loading
      if (loadingPromises.has(moduleName)) {
        return loadingPromises.get(moduleName);
      }

      // Start loading
      const promise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `./modules/${moduleName}.js?v=${Date.now()}`;
        script.onload = () => {
          loadedModules.add(moduleName);
          loadingPromises.delete(moduleName);
          console.log(`[LazyLoad] Module loaded: ${moduleName}`);
          resolve();
        };
        script.onerror = () => {
          loadingPromises.delete(moduleName);
          console.error(`[LazyLoad] Failed to load: ${moduleName}`);
          reject(new Error(`Failed to load module: ${moduleName}`));
        };
        document.head.appendChild(script);
      });

      loadingPromises.set(moduleName, promise);
      return promise;
    },

    /**
     * Check if module is loaded
     * @param {string} moduleName
     * @returns {boolean}
     */
    isLoaded: function(moduleName) {
      return loadedModules.has(moduleName);
    },

    /**
     * Preload modules in background
     * @param {string[]} moduleNames
     */
    preload: function(moduleNames) {
      moduleNames.forEach(name => {
        if (!loadedModules.has(name) && !loadingPromises.has(name)) {
          this.loadModule(name).catch(err => {
            console.warn(`[LazyLoad] Preload failed for ${name}:`, err);
          });
        }
      });
    }
  };

  console.log('[LazyLoad] Lazy module loader initialized');
})();
