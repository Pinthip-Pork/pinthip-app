// Lazy Module Loader for PinThip App
// Load admin modules on-demand for better performance

(function() {
  'use strict';

  const loadedModules = new Set();
  const loadingPromises = new Map();

  // Ensure PinThipSafe exists
  window.PinThipSafe = window.PinThipSafe || {};

  window.PinThipSafe.lazyLoad = {
    /**
     * Load a module on-demand
     * @param {string} moduleName - Module name (e.g., 'admin-attendance')
     * @returns {Promise<void>}
     */
    loadModule: function(moduleName) {
      console.log(`[LazyLoad] Attempting to load: ${moduleName}`);
      
      // Already loaded
      if (loadedModules.has(moduleName)) {
        console.log(`[LazyLoad] Module already loaded: ${moduleName}`);
        return Promise.resolve();
      }

      // Currently loading
      if (loadingPromises.has(moduleName)) {
        console.log(`[LazyLoad] Module already loading: ${moduleName}`);
        return loadingPromises.get(moduleName);
      }

      // Start loading
      const promise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `./modules/${moduleName}.js?v=${Date.now()}`;
        
        console.log(`[LazyLoad] Creating script tag for: ${script.src}`);
        
        script.onload = () => {
          loadedModules.add(moduleName);
          loadingPromises.delete(moduleName);
          console.log(`[LazyLoad] ✅ Module loaded successfully: ${moduleName}`);
          resolve();
        };
        
        script.onerror = (e) => {
          loadingPromises.delete(moduleName);
          console.error(`[LazyLoad] ❌ Failed to load: ${moduleName}`, e);
          reject(new Error(`Failed to load module: ${moduleName}`));
        };
        
        document.head.appendChild(script);
        console.log(`[LazyLoad] Script tag appended to head`);
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
