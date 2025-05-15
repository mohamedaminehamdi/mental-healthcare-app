/**
 * Mobile App Integration & Cross-Platform Support
 * ===============================================
 * Days 67-70: React Native and Flutter bridge for mobile applications
 */

export interface MobileDevice {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  osVersion: string;
  screenResolution: string;
  capabilities: string[];
}

export interface MobileNotification {
  id: string;
  title: string;
  body: string;
  actions: string[];
  deepLink?: string;
  data: { [key: string]: any };
  priority: 'high' | 'normal' | 'low';
}

export interface SyncQueue {
  id: string;
  operation: 'create' | 'update' | 'delete';
  resource: string;
  resourceId: string;
  payload: any;
  timestamp: Date;
  retries: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

export interface OfflineCacheEntry {
  key: string;
  value: any;
  timestamp: Date;
  ttl?: number;
  version: number;
}

export class MobileAppBridge {
  private registeredDevices: Map<string, MobileDevice> = new Map();
  private syncQueue: Map<string, SyncQueue> = new Map();
  private offlineCache: Map<string, OfflineCacheEntry> = new Map();
  private pushTokens: Map<string, string> = new Map(); // userId -> FCM/APNs token

  /**
   * Register mobile device
   */
  public registerDevice(
    userId: string,
    device: MobileDevice,
    pushToken: string
  ): boolean {
    try {
      this.registeredDevices.set(userId, device);
      this.pushTokens.set(userId, pushToken);

      console.log(`Device registered: ${device.deviceId} (${device.platform})`);
      return true;
    } catch (error) {
      console.error('Device registration failed', error);
      return false;
    }
  }

  /**
   * Queue operation for sync when device comes online
   */
  public queueOfflineOperation(
    userId: string,
    operation: 'create' | 'update' | 'delete',
    resource: string,
    resourceId: string,
    payload: any
  ): SyncQueue {
    const syncItem: SyncQueue = {
      id: `sync_${Date.now()}`,
      operation,
      resource,
      resourceId,
      payload,
      timestamp: new Date(),
      retries: 0,
      status: 'pending'
    };

    this.syncQueue.set(syncItem.id, syncItem);
    return syncItem;
  }

  /**
   * Get pending sync operations
   */
  public getPendingSync(userId: string): SyncQueue[] {
    return Array.from(this.syncQueue.values()).filter(
      item => item.status === 'pending'
    );
  }

  /**
   * Mark sync item as synced
   */
  public markSynced(syncId: string): boolean {
    const item = this.syncQueue.get(syncId);
    if (item) {
      item.status = 'synced';
      return true;
    }
    return false;
  }

  /**
   * Store data in offline cache
   */
  public cacheOfflineData(
    key: string,
    value: any,
    ttlSeconds?: number
  ): OfflineCacheEntry {
    const entry: OfflineCacheEntry = {
      key,
      value,
      timestamp: new Date(),
      ttl: ttlSeconds,
      version: (this.offlineCache.get(key)?.version ?? 0) + 1
    };

    this.offlineCache.set(key, entry);
    return entry;
  }

  /**
   * Get cached data
   */
  public getCachedData(key: string): any | null {
    const entry = this.offlineCache.get(key);
    if (!entry) return null;

    // Check if expired
    if (entry.ttl) {
      const age = (
        Date.now() - entry.timestamp.getTime()
      ) / 1000;
      if (age > entry.ttl) {
        this.offlineCache.delete(key);
        return null;
      }
    }

    return entry.value;
  }

  /**
   * Clear offline cache
   */
  public clearOfflineCache(): void {
    this.offlineCache.clear();
  }

  /**
   * Send push notification to device
   */
  public async sendPushNotification(
    userId: string,
    notification: MobileNotification
  ): Promise<boolean> {
    const pushToken = this.pushTokens.get(userId);
    if (!pushToken) {
      console.warn(`No push token for user: ${userId}`);
      return false;
    }

    try {
      // In production, integrate with FCM (Firebase) or APNs
      console.log(`Sending push notification to ${userId}`, {
        title: notification.title,
        priority: notification.priority
      });

      return true;
    } catch (error) {
      console.error('Push notification failed', error);
      return false;
    }
  }

  /**
   * Send batch notifications
   */
  public async sendBatchNotifications(
    userIds: string[],
    notification: MobileNotification
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const userId of userIds) {
      const result = await this.sendPushNotification(
        userId,
        notification
      );
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Handle deep link navigation
   */
  public parseDeepLink(url: string): {
    screen: string;
    params: { [key: string]: any };
  } | null {
    try {
      const urlObj = new URL(url);
      const screen = urlObj.pathname.replace(/^\/?/, '');
      const params: { [key: string]: any } = {};

      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      return { screen, params };
    } catch {
      return null;
    }
  }

  /**
   * Get device info
   */
  public getDeviceInfo(userId: string): MobileDevice | null {
    return this.registeredDevices.get(userId) || null;
  }

  /**
   * Get mobile app metrics
   */
  public getMobileMetrics(): {
    registeredDevices: number;
    platformBreakdown: { [key: string]: number };
    pendingSyncs: number;
    cacheSize: number;
  } {
    const platforms: { [key: string]: number } = {};
    this.registeredDevices.forEach(device => {
      platforms[device.platform] =
        (platforms[device.platform] ?? 0) + 1;
    });

    return {
      registeredDevices: this.registeredDevices.size,
      platformBreakdown: platforms,
      pendingSyncs: Array.from(this.syncQueue.values()).filter(
        s => s.status === 'pending'
      ).length,
      cacheSize: this.offlineCache.size
    };
  }
}

export const mobileAppBridge = new MobileAppBridge();
