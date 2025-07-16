const config = {
  appId: 'io.apstats.chain',
  appName: 'AP Stats Chain',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'localhost',
    cleartext: true
  },
  plugins: {
    // Camera plugin for QR code scanning
    Camera: {
      permissions: ['camera']
    },
    
    // Local storage for offline blockchain data
    Storage: {
      group: 'APStatsChain'
    },
    
    // Network status for offline/online detection
    Network: {
      permissions: ['network']
    },
    
    // App state management
    App: {
      permissions: ['app']
    },
    
    // Haptic feedback for user interactions
    Haptics: {
      permissions: ['haptics']
    },
    
    // Local notifications for attestation requests
    LocalNotifications: {
      permissions: ['notifications'],
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
      sound: 'beep.wav'
    },
    
    // Device information
    Device: {
      permissions: ['device']
    },
    
    // Filesystem access for offline data
    Filesystem: {
      permissions: ['filesystem']
    },
    
    // Clipboard for sharing keys and data
    Clipboard: {
      permissions: ['clipboard']
    },
    
    // Share functionality for QR codes
    Share: {
      permissions: ['share']
    },
    
    // Status bar styling
    StatusBar: {
      style: 'default',
      backgroundColor: '#ffffff'
    },
    
    // Splash screen
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#999999',
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
      useDialog: true
    }
  },
  
  // Android specific configuration
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    appendUserAgent: 'APStatsChain-Android',
    backgroundColor: '#ffffff',
    overrideUserAgent: '',
    loggingBehavior: 'debug',
    useLegacyBridge: false
  },
  
  // iOS specific configuration
  ios: {
    allowsLinkPreview: false,
    handleApplicationURL: false,
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
    scrollEnabled: true,
    webContentsDebuggingEnabled: true,
    allowsBackForwardNavigationGestures: true,
    appendUserAgent: 'APStatsChain-iOS',
    loggingBehavior: 'debug',
    preferredContentMode: 'mobile'
  },
  
  // Build configuration
  bundledWebRuntime: false,
  cordova: {},
  
  // Logging configuration
  loggingBehavior: 'debug'
};

export default config; 