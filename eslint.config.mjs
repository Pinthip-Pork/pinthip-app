import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        firebase: 'readonly',
        navigator: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        URL: 'readonly',
        self: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        clients: 'readonly',
        location: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        Notification: 'readonly',
        updatePendingDevicesBadge: 'readonly',
        isAdmin: 'writable',
        currentUser: 'writable',
        localTodayStr: 'readonly',
        getLocalDateTimeString: 'readonly',
        db: 'readonly',
        i18n: 'readonly',
        currentLang: 'readonly',
        PinThipSafe: 'readonly',
        setStatusText: 'readonly',
        safeText: 'readonly',
        showNotificationSoundControl: 'readonly',
        enableNotificationSound: 'readonly',
        startDevicePresence: 'readonly',
        startDeviceAccessGuard: 'readonly',
        showAdminDashboard: 'readonly',
        startAdminNotificationListener: 'readonly',
        isCustomAuthEnabled: 'readonly',
        checkDeviceAccess: 'readonly',
        showDashboard: 'readonly',
        showLoginForm: 'readonly',
        handleLogin: 'readonly',
        validateUsernameLength: 'readonly',
        showNotification: 'readonly'
      }
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-useless-escape': 'off'
    }
  }
];