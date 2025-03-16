/**
 * Security Metrics & Monitoring Infrastructure
 * Real-time security metrics collection and KPI tracking
 */

interface SecurityMetric {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  current: number;
  target: number; // desired value
  baseline: number;
  threshold: number; // alert threshold
  timestamp: Date;
}

interface KPI {
  id: string;
  name: string;
  description: string;
  metric: SecurityMetric;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface MetricsReport {
  generatedAt: Date;
  period: string; // '1h', '1d', '7d', '30d'
  kpis: KPI[];
  metrics: SecurityMetric[];
  trendsAnalysis: string[];
  recommendations: string[];
  overallSecurityScore: number; // 0-100
}

interface SecurityDashboard {
  uptime: number; // percentage
  avgResponseTime: number; // milliseconds
  errorRate: number; // percentage
  failedAuthAttempts: number;
  successfulAuthAttempts: number;
  anomaliesDetected: number;
  incidentsReported: number;
  vulnerabilitiesPatched: number;
  vulnerabilitiesPending: number;
}

class SecurityMetricsCollector {
  private static instance: SecurityMetricsCollector;
  private metrics: Map<string, SecurityMetric> = new Map();
  private kpis: Map<string, KPI> = new Map();
  private history: Array<{
    timestamp: Date;
    metrics: Record<string, number>;
  }> = [];

  private constructor() {
    this.initializeStandardMetrics();
  }

  static getInstance(): SecurityMetricsCollector {
    if (!SecurityMetricsCollector.instance) {
      SecurityMetricsCollector.instance = new SecurityMetricsCollector();
    }
    return SecurityMetricsCollector.instance;
  }

  /**
   * Record metric value
   */
  recordMetric(metricId: string, value: number): void {
    const metric = this.metrics.get(metricId);

    if (!metric) {
      console.warn(`Metric ${metricId} not found`);
      return;
    }

    metric.current = value;
    metric.timestamp = new Date();

    // Check if threshold exceeded
    if (value > metric.threshold) {
      console.warn(`⚠️  Metric ${metric.name} exceeded threshold: ${value} > ${metric.threshold}`);
    }

    // Add to history
    this.addToHistory(metricId, value);
  }

  /**
   * Get metric by ID
   */
  getMetric(metricId: string): SecurityMetric | undefined {
    return this.metrics.get(metricId);
  }

  /**
   * Register new metric
   */
  registerMetric(
    name: string,
    description: string,
    category: string,
    unit: string,
    target: number,
    threshold: number
  ): SecurityMetric {
    const id = `metric_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}`;

    const metric: SecurityMetric = {
      id,
      name,
      description,
      category,
      unit,
      current: 0,
      target,
      baseline: 0,
      threshold,
      timestamp: new Date(),
    };

    this.metrics.set(id, metric);

    return metric;
  }

  /**
   * Calculate KPI from metric
   */
  calculateKPI(metricId: string): KPI | null {
    const metric = this.metrics.get(metricId);

    if (!metric) {
      return null;
    }

    // Get historical data for trend analysis
    const recent = this.history.filter(
      (h) => h.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000
    );

    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercent = 0;

    if (recent.length > 1) {
      const oldValue = recent[0].metrics[metricId] || metric.baseline;
      const newValue = recent[recent.length - 1].metrics[metricId] || metric.current;
      const change = newValue - oldValue;

      trendPercent = oldValue !== 0 ? (change / oldValue) * 100 : 0;

      if (trendPercent > 5) {
        trend = 'up';
      } else if (trendPercent < -5) {
        trend = 'down';
      }
    }

    // Determine status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (metric.current > metric.threshold) {
      status = 'critical';
    } else if (metric.current > metric.threshold * 0.8) {
      status = 'warning';
    } else if (Math.abs(metric.current - metric.target) > metric.target * 0.2) {
      status = 'warning';
    }

    const kpi: KPI = {
      id: `kpi_${metricId}`,
      name: metric.name,
      description: metric.description,
      metric,
      trend,
      trendPercent: Math.round(trendPercent),
      status,
    };

    this.kpis.set(kpi.id, kpi);

    return kpi;
  }

  /**
   * Generate metrics report
   */
  generateReport(period: '1h' | '1d' | '7d' | '30d' = '1d'): MetricsReport {
    const kpis = Array.from(this.kpis.values());

    // Calculate overall security score (0-100)
    const scores = kpis.map((kpi) => {
      let score = 100;
      if (kpi.status === 'warning') score -= 10;
      if (kpi.status === 'critical') score -= 30;
      return score;
    });

    const overallScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 100;

    const metricsArray = Array.from(this.metrics.values());

    return {
      generatedAt: new Date(),
      period,
      kpis,
      metrics: metricsArray,
      trendsAnalysis: this.analyzeTrends(metricsArray),
      recommendations: this.generateRecommendations(metricsArray),
      overallSecurityScore: overallScore,
    };
  }

  /**
   * Analyze trends in metrics
   */
  private analyzeTrends(metrics: SecurityMetric[]): string[] {
    const trends: string[] = [];

    for (const metric of metrics) {
      if (metric.current > metric.threshold) {
        trends.push(`🚨 ${metric.name} is CRITICAL: ${metric.current}${metric.unit} (threshold: ${metric.threshold}${metric.unit})`);
      } else if (metric.current > metric.threshold * 0.8) {
        trends.push(`⚠️  ${metric.name} is elevated: ${metric.current}${metric.unit}`);
      }
    }

    return trends;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(metrics: SecurityMetric[]): string[] {
    const recommendations: string[] = [];

    const criticalMetrics = metrics.filter((m) => m.current > m.threshold);

    if (criticalMetrics.length > 0) {
      recommendations.push(
        `🔴 ${criticalMetrics.length} metrics exceed thresholds - immediate investigation required`
      );
    }

    const warningMetrics = metrics.filter(
      (m) => m.current > m.threshold * 0.8 && m.current <= m.threshold
    );

    if (warningMetrics.length > 0) {
      recommendations.push(
        `⚠️  ${warningMetrics.length} metrics at warning levels - consider preventive actions`
      );
    }

    recommendations.push('📊 Monitor KPI trends for early warning signs');
    recommendations.push('🔐 Review security measures for failing metrics');
    recommendations.push('📈 Establish baseline metrics for comparison');

    return recommendations;
  }

  /**
   * Add metric to history
   */
  private addToHistory(metricId: string, value: number): void {
    const now = new Date();
    let entry = this.history.find(
      (h) =>
        h.timestamp.getTime() >
        now.getTime() - 1000 * 60 // within last minute
    );

    if (!entry) {
      entry = {
        timestamp: now,
        metrics: {},
      };
      this.history.push(entry);
    }

    entry.metrics[metricId] = value;
  }

  /**
   * Get dashboard data
   */
  getDashboard(): SecurityDashboard {
    // Calculate aggregate metrics
    const uptimeMetric = this.metrics.get('metric_uptime');
    const errorRateMetric = this.metrics.get('metric_error_rate');
    const failedAuthMetric = this.metrics.get('metric_failed_auth');
    const successAuthMetric = this.metrics.get('metric_success_auth');
    const anomalyMetric = this.metrics.get('metric_anomalies');
    const incidentMetric = this.metrics.get('metric_incidents');
    const vulnerabilityPatched = this.metrics.get('metric_vuln_patched');
    const vulnerabilityPending = this.metrics.get('metric_vuln_pending');

    return {
      uptime: uptimeMetric?.current ?? 99.9,
      avgResponseTime: (this.metrics.get('metric_response_time')?.current ?? 250),
      errorRate: errorRateMetric?.current ?? 0,
      failedAuthAttempts: Math.round(failedAuthMetric?.current ?? 0),
      successfulAuthAttempts: Math.round(successAuthMetric?.current ?? 0),
      anomaliesDetected: Math.round(anomalyMetric?.current ?? 0),
      incidentsReported: Math.round(incidentMetric?.current ?? 0),
      vulnerabilitiesPatched: Math.round(vulnerabilityPatched?.current ?? 0),
      vulnerabilitiesPending: Math.round(vulnerabilityPending?.current ?? 0),
    };
  }

  /**
   * Initialize standard metrics
   */
  private initializeStandardMetrics(): void {
    // Performance metrics
    this.registerMetric(
      'System Uptime',
      'System availability percentage',
      'Performance',
      '%',
      99.9,
      99.5
    );

    this.registerMetric(
      'API Response Time',
      'Average API response time',
      'Performance',
      'ms',
      500,
      1000
    );

    this.registerMetric(
      'Error Rate',
      'Percentage of failed requests',
      'Performance',
      '%',
      1,
      5
    );

    // Security metrics
    this.registerMetric(
      'Failed Authentication Attempts',
      'Number of failed auth attempts',
      'Security',
      'count',
      10,
      50
    );

    this.registerMetric(
      'Successful Authentication',
      'Number of successful logins',
      'Security',
      'count',
      1000,
      100
    );

    this.registerMetric(
      'Anomalies Detected',
      'Security anomalies identified',
      'Security',
      'count',
      0,
      10
    );

    this.registerMetric(
      'Security Incidents',
      'Total security incidents reported',
      'Security',
      'count',
      0,
      5
    );

    this.registerMetric(
      'Vulnerabilities Patched',
      'Fixed security vulnerabilities',
      'Compliance',
      'count',
      0,
      1000
    );

    this.registerMetric(
      'Pending Vulnerabilities',
      'Unresolved vulnerabilities',
      'Compliance',
      'count',
      0,
      10
    );
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): Record<string, SecurityMetric> {
    const exported: Record<string, SecurityMetric> = {};

    for (const [id, metric] of this.metrics) {
      exported[id] = { ...metric };
    }

    return exported;
  }

  /**
   * Clear old history (keep last 30 days)
   */
  clearOldHistory(): void {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    this.history = this.history.filter((h) => h.timestamp.getTime() > thirtyDaysAgo);
  }
}

export const metricsCollector = SecurityMetricsCollector.getInstance();
export type {
  SecurityMetric,
  KPI,
  MetricsReport,
  SecurityDashboard,
};
