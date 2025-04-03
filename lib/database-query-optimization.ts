/**
 * Database Query Optimization & Caching
 * =====================================
 * Days 8-10: Performance improvements for healthcare data access
 */

import { logger } from './logger';

export interface QueryOptimizationConfig {
  enableQueryCaching: boolean;
  cacheStrategy: 'in-memory' | 'redis' | 'hybrid';
  ttl: number; // Time to live in seconds
  maxCacheSize: number;
  enableQueryAnalytics: boolean;
}

export interface QueryStats {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  averageExecutionTime: number;
  slowQueries: Array<{
    query: string;
    executionTime: number;
    timestamp: Date;
  }>;
}

export class QueryOptimizationManager {
  private config: QueryOptimizationConfig;
  private queryCache: Map<string, { data: any; expiresAt: Date }> = new Map();
  private queryStats: QueryStats = {
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageExecutionTime: 0,
    slowQueries: []
  };
  private slowQueryThreshold = 1000; // ms

  constructor(config: QueryOptimizationConfig) {
    this.config = config;
  }

  /**
   * Execute query with caching
   */
  public async executeQuery<T>(
    queryKey: string,
    executor: () => Promise<T>,
    options?: { forceFresh?: boolean; ttl?: number }
  ): Promise<T> {
    const startTime = Date.now();

    // Check cache first
    if (
      this.config.enableQueryCaching &&
      !options?.forceFresh
    ) {
      const cached = this.getFromCache(queryKey);
      if (cached !== null) {
        const executionTime = Date.now() - startTime;
        this.updateStats(true, executionTime);
        logger.log('Cache hit', {
          queryKey,
          executionTime: `${executionTime}ms`
        });
        return cached as T;
      }
    }

    // Execute query
    const result = await executor();
    const executionTime = Date.now() - startTime;

    // Check if slow query
    if (executionTime > this.slowQueryThreshold) {
      this.queryStats.slowQueries.push({
        query: queryKey,
        executionTime,
        timestamp: new Date()
      });
      logger.warn('Slow query detected', {
        queryKey,
        executionTime: `${executionTime}ms`
      });
    }

    // Store in cache
    if (this.config.enableQueryCaching) {
      const ttl = options?.ttl || this.config.ttl;
      this.setInCache(queryKey, result, ttl);
    }

    this.updateStats(false, executionTime);
    return result;
  }

  /**
   * Get value from cache
   */
  private getFromCache(key: string): any | null {
    const cached = this.queryCache.get(key);

    if (!cached) {
      return null;
    }

    // Check expiration
    if (new Date() > cached.expiresAt) {
      this.queryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Store value in cache
   */
  private setInCache(key: string, value: any, ttlSeconds: number): void {
    // Enforce max cache size
    if (
      this.queryCache.size >= this.config.maxCacheSize
    ) {
      // Remove oldest entry (simple LRU)
      const firstKey = this.queryCache.keys().next().value;
      this.queryCache.delete(firstKey);
    }

    this.queryCache.set(key, {
      data: value,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000)
    });
  }

  /**
   * Invalidate cache entries by pattern
   */
  public invalidateCache(pattern: string | RegExp): number {
    let count = 0;
    const regex = typeof pattern === 'string'
      ? new RegExp(pattern)
      : pattern;

    for (const [key] of this.queryCache.entries()) {
      if (regex.test(key)) {
        this.queryCache.delete(key);
        count++;
      }
    }

    logger.log('Cache invalidated', {
      pattern: pattern.toString(),
      entriesRemoved: count
    });

    return count;
  }

  /**
   * Clear entire cache
   */
  public clearCache(): void {
    this.queryCache.clear();
    logger.log('Cache cleared');
  }

  /**
   * Update query statistics
   */
  private updateStats(cacheHit: boolean, executionTime: number): void {
    this.queryStats.totalQueries++;

    if (cacheHit) {
      this.queryStats.cacheHits++;
    } else {
      this.queryStats.cacheMisses++;
    }

    // Update average execution time
    const totalTime =
      this.queryStats.averageExecutionTime *
        (this.queryStats.totalQueries - 1) +
      executionTime;
    this.queryStats.averageExecutionTime = Math.round(
      totalTime / this.queryStats.totalQueries
    );
  }

  /**
   * Get query statistics
   */
  public getStats(): QueryStats {
    return {
      ...this.queryStats,
      slowQueries: this.queryStats.slowQueries.slice(-20) // Keep last 20
    };
  }

  /**
   * Get cache hit ratio
   */
  public getCacheHitRatio(): number {
    if (this.queryStats.totalQueries === 0) {
      return 0;
    }
    return (
      (this.queryStats.cacheHits / this.queryStats.totalQueries) *
      100
    );
  }
}

/**
 * Query optimization recommendations
 */
export interface QueryOptimization {
  issue: string;
  description: string;
  recommendation: string;
  estimatedImpact: string;
}

export const QueryOptimizations = {
  useIndexes: {
    issue: 'Missing indexes',
    description: 'Queries scanning full collections',
    recommendation: 'Add indexes on frequently queried fields (userId, date, status)',
    estimatedImpact: '80% query time reduction'
  },
  batchQueries: {
    issue: 'N+1 query problem',
    description: 'Fetching related data in loops',
    recommendation: 'Batch related queries or use aggregation pipelines',
    estimatedImpact: '70% reduction in database requests'
  },
  selectFields: {
    issue: 'Fetching unnecessary fields',
    description: 'Loading all fields when only few needed',
    recommendation: 'Use projection to select only required fields',
    estimatedImpact: '40% reduction in data transfer'
  },
  paginateResults: {
    issue: 'Loading large result sets',
    description: 'Fetching thousands of documents unnecessarily',
    recommendation: 'Implement pagination with limit and offset',
    estimatedImpact: '60% improvement in response time'
  },
  useAggregation: {
    issue: 'Processing data in application',
    description: 'Grouping/filtering/sorting on client side',
    recommendation: 'Use database aggregation for heavy operations',
    estimatedImpact: '90% improvement for complex operations'
  }
};
