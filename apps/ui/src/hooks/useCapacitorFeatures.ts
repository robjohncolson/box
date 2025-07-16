import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

// Define types for Capacitor features
interface CapacitorFeatures {
  isNative: boolean;
  platform: string;
  camera: {
    requestPermission: () => Promise<boolean>;
    openCamera: () => Promise<string | null>;
    scanQRCode: () => Promise<string | null>;
  };
  storage: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
    remove: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };
  haptics: {
    impact: (style?: 'light' | 'medium' | 'heavy') => Promise<void>;
    notification: (type?: 'success' | 'warning' | 'error') => Promise<void>;
    vibrate: (duration?: number) => Promise<void>;
  };
  network: {
    isOnline: boolean;
    connectionType: string;
    addListener: (callback: (status: NetworkStatus) => void) => void;
    removeListener: () => void;
  };
  notifications: {
    requestPermission: () => Promise<boolean>;
    schedule: (options: LocalNotificationSchema) => Promise<void>;
    cancel: (id: string) => Promise<void>;
  };
  share: {
    share: (options: ShareOptions) => Promise<void>;
    canShare: () => Promise<boolean>;
  };
  device: {
    getId: () => Promise<string>;
    getInfo: () => Promise<DeviceInfo>;
    getBatteryInfo: () => Promise<BatteryInfo>;
  };
}

interface NetworkStatus {
  connected: boolean;
  connectionType: string;
}

interface LocalNotificationSchema {
  id: string;
  title: string;
  body: string;
  schedule?: {
    at: Date;
  };
  extra?: any;
}

interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

interface DeviceInfo {
  model: string;
  platform: string;
  operatingSystem: string;
  osVersion: string;
  manufacturer: string;
  isVirtual: boolean;
  webViewVersion: string;
}

interface BatteryInfo {
  batteryLevel: number;
  isCharging: boolean;
}

export const useCapacitorFeatures = (): CapacitorFeatures => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState('unknown');

  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  // Camera features
  const camera = {
    requestPermission: async (): Promise<boolean> => {
      if (!isNative) return true;
      
      try {
        const { Camera } = await import('@capacitor/camera');
        const permissions = await Camera.requestPermissions({ permissions: ['camera'] });
        return permissions.camera === 'granted';
      } catch (error) {
        console.error('Camera permission error:', error);
        return false;
      }
    },

    openCamera: async (): Promise<string | null> => {
      if (!isNative) return null;
      
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera
        });
        return image.dataUrl || null;
      } catch (error) {
        console.error('Camera error:', error);
        return null;
      }
    },

    scanQRCode: async (): Promise<string | null> => {
      // This would integrate with a QR scanner plugin
      // For now, return null as we handle QR scanning in the web layer
      return null;
    }
  };

  // Storage features
  const storage = {
    get: async (key: string): Promise<string | null> => {
      if (!isNative) {
        return localStorage.getItem(key);
      }
      
      try {
        const { Storage } = await import('@capacitor/storage');
        const result = await Storage.get({ key });
        return result.value;
      } catch (error) {
        console.error('Storage get error:', error);
        return null;
      }
    },

    set: async (key: string, value: string): Promise<void> => {
      if (!isNative) {
        localStorage.setItem(key, value);
        return;
      }
      
      try {
        const { Storage } = await import('@capacitor/storage');
        await Storage.set({ key, value });
      } catch (error) {
        console.error('Storage set error:', error);
      }
    },

    remove: async (key: string): Promise<void> => {
      if (!isNative) {
        localStorage.removeItem(key);
        return;
      }
      
      try {
        const { Storage } = await import('@capacitor/storage');
        await Storage.remove({ key });
      } catch (error) {
        console.error('Storage remove error:', error);
      }
    },

    clear: async (): Promise<void> => {
      if (!isNative) {
        localStorage.clear();
        return;
      }
      
      try {
        const { Storage } = await import('@capacitor/storage');
        await Storage.clear();
      } catch (error) {
        console.error('Storage clear error:', error);
      }
    }
  };

  // Haptics features
  const haptics = {
    impact: async (style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> => {
      if (!isNative) return;
      
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        const impactStyle = style === 'light' ? ImpactStyle.Light : 
                           style === 'heavy' ? ImpactStyle.Heavy : ImpactStyle.Medium;
        await Haptics.impact({ style: impactStyle });
      } catch (error) {
        console.error('Haptics impact error:', error);
      }
    },

    notification: async (type: 'success' | 'warning' | 'error' = 'success'): Promise<void> => {
      if (!isNative) return;
      
      try {
        const { Haptics, NotificationType } = await import('@capacitor/haptics');
        const notificationType = type === 'success' ? NotificationType.Success :
                                type === 'error' ? NotificationType.Error : NotificationType.Warning;
        await Haptics.notification({ type: notificationType });
      } catch (error) {
        console.error('Haptics notification error:', error);
      }
    },

    vibrate: async (duration: number = 300): Promise<void> => {
      if (!isNative) {
        // Fallback to web vibration API
        if ('vibrate' in navigator) {
          navigator.vibrate(duration);
        }
        return;
      }
      
      try {
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.vibrate({ duration });
      } catch (error) {
        console.error('Haptics vibrate error:', error);
      }
    }
  };

  // Network features
  const network = {
    isOnline,
    connectionType,
    addListener: (callback: (status: NetworkStatus) => void): void => {
      if (!isNative) {
        const handleOnline = () => {
          setIsOnline(true);
          callback({ connected: true, connectionType: 'unknown' });
        };
        const handleOffline = () => {
          setIsOnline(false);
          callback({ connected: false, connectionType: 'none' });
        };
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return;
      }
      
      import('@capacitor/network').then(({ Network }) => {
        Network.addListener('networkStatusChange', (status) => {
          setIsOnline(status.connected);
          setConnectionType(status.connectionType);
          callback(status);
        });
      });
    },

    removeListener: (): void => {
      if (!isNative) {
        window.removeEventListener('online', () => {});
        window.removeEventListener('offline', () => {});
        return;
      }
      
      import('@capacitor/network').then(({ Network }) => {
        Network.removeAllListeners();
      });
    }
  };

  // Notifications features
  const notifications = {
    requestPermission: async (): Promise<boolean> => {
      if (!isNative) {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          return permission === 'granted';
        }
        return false;
      }
      
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const permissions = await LocalNotifications.requestPermissions();
        return permissions.display === 'granted';
      } catch (error) {
        console.error('Notification permission error:', error);
        return false;
      }
    },

    schedule: async (options: LocalNotificationSchema): Promise<void> => {
      if (!isNative) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(options.title, {
            body: options.body,
            icon: '/vite.svg'
          });
        }
        return;
      }
      
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.schedule({
          notifications: [options]
        });
      } catch (error) {
        console.error('Notification schedule error:', error);
      }
    },

    cancel: async (id: string): Promise<void> => {
      if (!isNative) return;
      
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.cancel({
          notifications: [{ id }]
        });
      } catch (error) {
        console.error('Notification cancel error:', error);
      }
    }
  };

  // Share features
  const share = {
    share: async (options: ShareOptions): Promise<void> => {
      if (!isNative) {
        if ('share' in navigator) {
          await navigator.share(options);
        }
        return;
      }
      
      try {
        const { Share } = await import('@capacitor/share');
        await Share.share(options);
      } catch (error) {
        console.error('Share error:', error);
      }
    },

    canShare: async (): Promise<boolean> => {
      if (!isNative) {
        return 'share' in navigator;
      }
      
      try {
        const { Share } = await import('@capacitor/share');
        const result = await Share.canShare();
        return result.value;
      } catch (error) {
        console.error('Can share error:', error);
        return false;
      }
    }
  };

  // Device features
  const device = {
    getId: async (): Promise<string> => {
      if (!isNative) {
        return 'web-' + Math.random().toString(36).substr(2, 9);
      }
      
      try {
        const { Device } = await import('@capacitor/device');
        const info = await Device.getId();
        return info.uuid;
      } catch (error) {
        console.error('Device ID error:', error);
        return 'unknown-device';
      }
    },

    getInfo: async (): Promise<DeviceInfo> => {
      if (!isNative) {
        return {
          model: 'Web Browser',
          platform: 'web',
          operatingSystem: 'web',
          osVersion: 'unknown',
          manufacturer: 'Browser',
          isVirtual: false,
          webViewVersion: 'unknown'
        };
      }
      
      try {
        const { Device } = await import('@capacitor/device');
        const info = await Device.getInfo();
        return info;
      } catch (error) {
        console.error('Device info error:', error);
        return {
          model: 'unknown',
          platform: 'unknown',
          operatingSystem: 'unknown',
          osVersion: 'unknown',
          manufacturer: 'unknown',
          isVirtual: false,
          webViewVersion: 'unknown'
        };
      }
    },

    getBatteryInfo: async (): Promise<BatteryInfo> => {
      if (!isNative) {
        if ('getBattery' in navigator) {
          const battery = await (navigator as any).getBattery();
          return {
            batteryLevel: battery.level,
            isCharging: battery.charging
          };
        }
        return { batteryLevel: 1, isCharging: false };
      }
      
      try {
        const { Device } = await import('@capacitor/device');
        const info = await Device.getBatteryInfo();
        return info;
      } catch (error) {
        console.error('Battery info error:', error);
        return { batteryLevel: 1, isCharging: false };
      }
    }
  };

  // Network status listener
  useEffect(() => {
    network.addListener((status) => {
      setIsOnline(status.connected);
      setConnectionType(status.connectionType);
    });

    return () => {
      network.removeListener();
    };
  }, []);

  return {
    isNative,
    platform,
    camera,
    storage,
    haptics,
    network,
    notifications,
    share,
    device
  };
};

export default useCapacitorFeatures; 