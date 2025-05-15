/**
 * Performance Monitoring & APM Integration
 * =========================================
 * Days 63-66: Application performance monitoring and optimization insights
 */

import { logger } from './logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: { [key: string]: string };
}

export interface ServiceMetrics {
  serviceName: string;
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  };
  throughput: number; // requests per second
  errorRate: number; // percentage
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  uptime: number; // percentage
}

export interface PerformanceAlert {
  id: string;
  metric: string;
  threshold: number;
  currentValue: number;
  severity: 'warning' | 'critical';
  timestamp: Date;
  resolved: boolean;
}

export class PerformanceMonitoringManager {
  private metrics: PerformanceMetric[] = [];
  private serviceMetrics: Map<string, ServiceMetrics> = new Map();
  private alerts: Map<string, PerformanceAlert> = new Map();
  private baselines: Map<string, number> = new Map();

  /**
   * Record performance metric
   */
  public recordMetric(
    name: string,
    value: number,
    unit: string,
    tags?: { [key: string]: string }
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags: tags || {}
    };

    this.metrics.push(metric);

    // Keep only last 10000 metrics
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-10000);
    }

    // Check against thresholds
    this.evaluateMetric(metric);
  }

  /**
   * Get service metrics summary
   */
  public getServiceMetrics(serviceName: string): ServiceMetrics | null {
    return this.serviceMetrics.get(serviceName) || null;
  }

  /**
   * Update service metrics
   */
  public updateServiceMetrics(
    serviceName: string,
    metrics: Partial<ServiceMetrics>
  ): void {
    const current = this.serviceMetrics.get(serviceName) || {
      serviceName,
      responseTime: { p50: 0, p95: 0, p99: 0, avg: 0 },
      throughput: 0,
      errorRate: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      uptime: 99.9
    };

    const updated = { ...current, ...metrics };
    this.serviceMetrics.set(serviceName, updated);

    logger.log('Service metrics updated', {
      serviceName,
      responseTime: updated.responseTime.avg,
      errorRate: `${updated.errorRate}%`
    });
  }

  private evaluateMetric(metric: PerformanceMetric): void {
    const baseline = this.baselines.get(metric.name) || 100;
    const threshold = baseline * 1.5; // 50% increase triggers alert

    if (metric.value > threshold) {
      const alertId = `perf_alert_${Date.now()}`;
      const alert: PerformanceAlert = {
        id: alertId,
        metric: metric.name,
        threshold,
        currentValue: metric.value,
        severity: metric.value > threshold * 2 ? 'critical' : 'warning',
        timestamp: new Date(),
        resolved: false
      };

      this.alerts.set(alertId, alert);

      logger.warn('Performance alert triggered', {
        metric: metric.name,
        value: metric.value,
        threshold,
        severity: alert.severity
      });
    }
  }

  /**
   * Get performance trends
   */
  public getTrends(
    metricName: string,
    timeWindowMinutes: number = 60
  ): {
    trend: 'improving' | 'degrading' | 'stable';
    changePercent: number;
    avgValue: number;
  } {
    const cutoff = new Date(
      Date.now() - timeWindowMinutes * 60 * 1000
    );
    const recentMetrics = this.metrics.filter(
      m => m.name === metricName && m.timestamp > cutoff
    );

    if (recentMetrics.length < 2) {
      return {
        trend: 'stable',
        changePercent: 0,
        avgValue: 0
      };
    }

    const firstHalf = recentMetrics.slice(
      0,
      Math.floor(recentMetrics.length / 2)
    );
    const secondHalf = recentMetrics.slice(
      Math.floor(recentMetrics.length / 2)
    );

    const avgFirst =
      firstHalf.reduce((sum, m) => sum + m.value, 0) /
      firstHalf.length;
    const avgSecond =
      secondHalf.reduce((sum, m) => sum + m.value, 0) /
      secondHalf.length;

    const changePercent = (
      ((avgSecond - avgFirst) / avgFirst) *
      100
    ).toFixed(2);

    return {
      trend:
        avgSecond < avgFirst
          ? 'improving'
          : avgSecond > avgFirst
            ? 'degrading'
            : 'stable',
      changePercent: parseFloat(changePercent),
      avgValue: avgSecond
    };
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(a => !a.resolved);
  }

  /**
   * Resolve alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    return true;
  }

  /**
   * Generate performance report
   */
  public generatePerformanceReport(): string {
    let report = `# Performance Report\n\n`;

    report += `## Service Metrics\n`;
    this.serviceMetrics.forEach((metrics, serviceName) => {
      report += `### ${serviceName}\n`;
      report += `- Response Time (avg): ${metrics.responseTime.avg}ms\n`;
      report += `- p95: ${metrics.responseTime.p95}ms\n`;
      report += `- p99: ${metrics.responseTime.p99}ms\n`;
      report += `- Throughput: ${metrics.throughput} req/s\n`;
      report += `- Error Rate: ${metrics.errorRate}%\n`;
      report += `- CPU: ${metrics.cpuUsage}%\n`;
      report += `- Memory: ${metrics.memoryUsage}%\n`;
      report += `- Uptime: ${metrics.uptime}%\n\n`;
    });

    report += `## Active Alerts\n`;
    const activeAlerts = this.getActiveAlerts();
    if (activeAlerts.length === 0) {
      report += `No active alerts.\n`;
    } else {
      activeAlerts.forEach(alert => {
        report += `- **${alert.metric}**: ${alert.currentValue} (threshold: ${alert.threshold}) [${alert.severity}]\n`;
      });
    }

    return report;
  }
}

export const performanceMonitoringManager =
  new PerformanceMonitoringManager();
