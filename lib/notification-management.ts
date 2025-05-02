/**
 * Real-time Notifications & Health Alerts
 * ========================================
 * Days 28-30: Real-time alerting and notification system
 */

import { logger } from './logger';

export type NotificationType =
  | 'appointment-reminder'
  | 'prescription-ready'
  | 'health-alert'
  | 'message'
  | 'test-result'
  | 'emergency';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  deliveryChannels: Array<'in-app' | 'email' | 'sms' | 'push'>;
}

export interface HealthAlert {
  patientId: string;
  type: string;
  severity: 'warning' | 'alert' | 'critical';
  message: string;
  metrics: { [key: string]: number };
  recomm endations: string[];
  timestamp: Date;
}

export class NotificationManager {
  private notifications: Map<string, Notification> = new Map();
  private subscriptions: Map<
    string,
    Array<{ type: NotificationType; channels: string[] }>
  > = new Map();
  private alertHistory: HealthAlert[] = [];

  /**
   * Send notification
   */
  public async sendNotification(
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
  ): Promise<string> {
    const notificationId = `notif_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

    const fullNotification: Notification = {
      ...notification,
      id: notificationId,
      timestamp: new Date(),
      read: false
    };

    this.notifications.set(notificationId, fullNotification);

    // Send through configured channels
    for (const channel of notification.deliveryChannels) {
      await this.deliverViaChannel(fullNotification, channel);
    }

    logger.log('Notification sent', {
      notificationId,
      userId: notification.userId,
      type: notification.type,
      channels: notification.deliveryChannels
    });

    return notificationId;
  }

  private async deliverViaChannel(
    notification: Notification,
    channel: string
  ): Promise<void> {
    switch (channel) {
      case 'in-app':
        // Store in-app notification (already done)
        break;
      case 'email':
        logger.log('Sending email notification', {
          userId: notification.userId,
          subject: notification.title
        });
        break;
      case 'sms':
        logger.log('Sending SMS notification', {
          userId: notification.userId,
          message: notification.message.substring(0, 160)
        });
        break;
      case 'push':
        logger.log('Sending push notification', {
          userId: notification.userId,
          title: notification.title
        });
        break;
    }
  }

  /**
   * Create health alert
   */
  public async createHealthAlert(
    patientId: string,
    metrics: { [key: string]: number }
  ): Promise<HealthAlert | null> {
    const alert = this.evaluateHealthMetrics(patientId, metrics);

    if (!alert) {
      return null;
    }

    this.alertHistory.push(alert);

    // Send critical notification
    if (alert.severity === 'critical') {
      await this.sendNotification({
        userId: patientId,
        type: 'health-alert',
        title: `Critical Health Alert: ${alert.type}`,
        message: alert.message,
        urgency: 'critical',
        deliveryChannels: ['in-app', 'sms', 'push']
      });

      logger.error('Critical health alert created', {
        patientId,
        alertType: alert.type,
        metrics
      });
    }

    return alert;
  }

  private evaluateHealthMetrics(
    patientId: string,
    metrics: { [key: string]: number }
  ): HealthAlert | null {
    // Example: Check blood pressure
    if (metrics.systolic && metrics.systolic > 180) {
      return {
        patientId,
        type: 'High Blood Pressure',
        severity: 'critical',
        message: `Blood pressure critically high: ${metrics.systolic}/${metrics.diastolic}`,
        metrics,
        recommendations: [
          'Contact emergency services immediately',
          'Sit down and relax',
          'Do not drive'
        ],
        timestamp: new Date()
      };
    }

    // Check glucose levels
    if (metrics.glucose && metrics.glucose < 70) {
      return {
        patientId,
        type: 'Low Blood Glucose',
        severity: 'alert',
        message: `Blood glucose low: ${metrics.glucose} mg/dL`,
        metrics,
        recommendations: [
          'Consume fast-acting carbohydrate',
          'Recheck in 15 minutes',
          'Contact healthcare provider if symptoms worsen'
        ],
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * Get user notifications
   */
  public getUserNotifications(
    userId: string,
    unreadOnly: boolean = false
  ): Notification[] {
    return Array.from(this.notifications.values()).filter(
      n =>
        n.userId === userId &&
        (!unreadOnly || !n.read)
    );
  }

  /**
   * Mark notification as read
   */
  public markAsRead(notificationId: string): boolean {
    const notif = this.notifications.get(notificationId);
    if (!notif) {
      return false;
    }

    notif.read = true;
    return true;
  }

  /**
   * Subscribe to notification types
   */
  public subscribe(
    userId: string,
    type: NotificationType,
    channels: string[]
  ): void {
    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, []);
    }

    const userSubs = this.subscriptions.get(userId)!;
    // Remove existing subscription for this type
    const index = userSubs.findIndex(s => s.type === type);
    if (index !== -1) {
      userSubs.splice(index, 1);
    }

    // Add new subscription
    userSubs.push({ type, channels });

    logger.log('User subscribed to notifications', {
      userId,
      type,
      channels
    });
  }

  /**
   * Get notification statistics
   */
  public getStats(userId: string): {
    totalNotifications: number;
    unreadCount: number;
    criticalAlerts: number;
    alertHistory: number;
  } {
    const userNotifs = this.getUserNotifications(userId);
    const userAlerts = this.alertHistory.filter(
      a => a.patientId === userId
    );

    return {
      totalNotifications: userNotifs.length,
      unreadCount: userNotifs.filter(n => !n.read).length,
      criticalAlerts: userNotifs.filter(
        n => n.urgency === 'critical'
      ).length,
      alertHistory: userAlerts.length
    };
  }
}

export const notificationManager = new NotificationManager();
