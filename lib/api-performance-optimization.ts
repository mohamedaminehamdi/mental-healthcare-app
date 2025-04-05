/**
 * API Response Optimization & Compression
 * =========================================
 * Days 11-12: Improve API performance and response times
 */

import { logger } from './logger';
import zlib from 'zlib';

export interface APIPerformanceMetrics {
  endpoint: string;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  throughput: number;
  recommendations?: string[];
}

export interface CompressionOptions {
  enabled: boolean;
  algorithm: 'gzip' | 'brotli' | 'deflate';
  level: 1 | 6 | 9; // 1=fast, 6=balanced, 9=best compression
  minSize: number; // Minimum size in bytes to compress
  types: string[]; // MIME types to compress
}

export class APIPerformanceOptimizer {
  private metrics: Map<string, APIPerformanceMetrics> = new Map();
  private responseTimes: Map<string, number[]> = new Map();
  private compressionConfig: CompressionOptions;

  constructor(compressionConfig?: Partial<CompressionOptions>) {
    this.compressionConfig = {
      enabled: true,
      algorithm: 'gzip',
      level: 6,
      minSize: 1024,
      types: [
        'application/json',
        'text/plain',
        'text/html',
        'text/css',
        'application/javascript',
        'application/xml'
      ],
      ...compressionConfig
    };
  }

  /**
   * Track API endpoint performance
   */
  public trackEndpoint(
    endpoint: string,
    responseTime: number,
    statusCode: number
  ): void {
    // Track response times
    if (!this.responseTimes.has(endpoint)) {
      this.responseTimes.set(endpoint, []);
    }
    this.responseTimes.get(endpoint)!.push(responseTime);

    // Keep only last 1000 measurements
    const times = this.responseTimes.get(endpoint)!;
    if (times.length > 1000) {
      times.shift();
    }

    // Calculate metrics
    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b) / times.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    const isError = statusCode >= 400;
    const currentMetrics = this.metrics.get(endpoint) || {
      endpoint,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorRate: 0,
      throughput: 0
    };

    currentMetrics.avgResponseTime = Math.round(avg);
    currentMetrics.p95ResponseTime = Math.round(p95);
    currentMetrics.p99ResponseTime = Math.round(p99);
    currentMetrics.errorRate = isError
      ? (currentMetrics.errorRate * 0.95 + 0.05)
      : currentMetrics.errorRate * 0.95;
    currentMetrics.throughput = (1000 / avg) * 60; // requests per minute

    this.metrics.set(endpoint, currentMetrics);

    // Log slow endpoints
    if (responseTime > 1000) {
      logger.warn('Slow endpoint detected', {
        endpoint,
        responseTime: `${responseTime}ms`,
        threshold: '1000ms'
      });
    }
  }

  /**
   * Get performance recommendations
   */
  public getRecommendations(endpoint: string): string[] {
    const metrics = this.metrics.get(endpoint);
    if (!metrics) return [];

    const recommendations: string[] = [];

    if (metrics.avgResponseTime > 500) {
      recommendations.push('Consider adding database indexes');
      recommendations.push('Review query complexity');
      recommendations.push('Implement caching for this endpoint');
    }

    if (metrics.p99ResponseTime > 2000) {
      recommendations.push('High variance in response times detected');
      recommendations.push('Check for resource contention');
      recommendations.push('Consider rate limiting');
    }

    if (metrics.errorRate > 0.01) {
      recommendations.push(
        'High error rate detected - review error logs'
      );
    }

    return recommendations;
  }

  /**
   * Middleware to add compression headers
   */
  public createCompressionMiddleware() {
    return (req: any, res: any, next: any) => {
      const acceptEncoding = (req.headers['accept-encoding'] || '').split(',')
        .map((s: string) => s.trim());

      // Determine best compression
      let compression: string | null = null;
      if (
        acceptEncoding.includes('br') &&
        this.compressionConfig.algorithm === 'grotli'
      ) {
        compression = 'br';
      } else if (acceptEncoding.includes('gzip')) {
        compression = 'gzip';
      } else if (acceptEncoding.includes('deflate')) {
        compression = 'deflate';
      }

      if (compression) {
        res.setHeader('Content-Encoding', compression);
      }

      // Capture original send
      const originalSend = res.send;
      res.send = function(
        data: any
      ) {
        // Track performance
        const endpoint = req.path || 'unknown';
        const startTime = (res.locals.startTime as number) || Date.now();
        const responseTime = Date.now() - startTime;

        this.trackEndpoint(
          endpoint,
          responseTime,
          res.statusCode
        );

        // Only compress if size threshold met and matching MIME type
        const contentType = res.getHeader('content-type') as string || '';
        const isCompressible =
          this.compressionConfig.types.some(type =>
            contentType.includes(type)
          );

        if (
          compression &&
          isCompressible &&
          Buffer.byteLength(data) > this.compressionConfig.minSize
        ) {
          if (compression === 'gzip') {
            data = zlib.gzipSync(data, {
              level: this.compressionConfig.level
            });
          } else if (compression === 'deflate') {
            data = zlib.deflateSync(data, {
              level: this.compressionConfig.level
            });
          }
        }

        return originalSend.call(this, data);
      }.bind(this);

      next();
    };
  }

  /**
   * Get performance report
   */
  public getPerformanceReport(): {
    endpoints: APIPerformanceMetrics[];
    topSlowest: APIPerformanceMetrics[];
    topFastest: APIPerformanceMetrics[];
    overallAvg: number;
  } {
    const endpoints = Array.from(this.metrics.values());
    const topSlowest = endpoints
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 5);
    const topFastest = endpoints
      .sort((a, b) => a.avgResponseTime - b.avgResponseTime)
      .slice(0, 5);

    const overallAvg =
      endpoints.length > 0
        ? Math.round(
            endpoints.reduce((sum, m) => sum + m.avgResponseTime, 0) /
            endpoints.length
          )
        : 0;

    return {
      endpoints,
      topSlowest,
      topFastest,
      overallAvg
    };
  }

  /**
   * Identify N+1 query patterns
   */
  public detectN1Queries(
    queries: Array<{ endpoint: string; count: number; time: Date }>
  ): Array<{ endpoint: string; pattern: string; impact: string }> {
    const patterns: Array<{
      endpoint: string;
      pattern: string;
      impact: string;
    }> = [];

    const grouped = new Map<string, number>();
    queries.forEach(q => {
      grouped.set(q.endpoint, (grouped.get(q.endpoint) || 0) + 1);
    });

    grouped.forEach((count, endpoint) => {
      if (count > 10) {
        // Potential N+1
        patterns.push({
          endpoint,
          pattern: `${count} queries detected in single request`,
          impact: `Could be reduced to 1-2 queries with optimization`
        });
      }
    });

    return patterns;
  }
}

export const apiPerformanceOptimizer = new APIPerformanceOptimizer();
