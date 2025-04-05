/**
 * Advanced Caching Strategy & Cache Management
 * ==============================================
 * Days 13-14: Comprehensive caching for healthcare data
 */

import { logger } from './logger';

export type CacheStrategy = 'LRU' | 'LFU' | 'TTL' | 'FIFO';

export interface CacheConfig {
  strategy: CacheStrategy;
  maxSize: number;
  defaultTTL: number; // seconds
  enableMetrics: boolean;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: Date;
  accessCount: number;
  lastAccessed: Date;
  expiresAt?: Date;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

export class AdvancedCacheManager<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    hitRate: 0
  };

  constructor(config: CacheConfig) {
    this.config = config;
  }

  /**
   * Get value from cache
   */
  public get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    // Check expiration
    if (entry.expiresAt && new Date() > entry.expiresAt) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = new Date();

    this.metrics.hits++;
    this.updateHitRate();

    return entry.value;
  }

  /**
   * Set value in cache
   */
  public set(key: string, value: T, ttl?: number): void {
    // Evict if at capacity
    if (
      this.cache.size >= this.config.maxSize &&
      !this.cache.has(key)
    ) {
      this.evict();
    }

    const expiresAt = ttl
      ? new Date(Date.now() + ttl * 1000)
      : new Date(Date.now() + this.config.defaultTTL * 1000);

    this.cache.set(key, {
      key,
      value,
      createdAt: new Date(),
      accessCount: 0,
      lastAccessed: new Date(),
      expiresAt: this.config.strategy === 'TTL' ? expiresAt : undefined
    });

    this.metrics.size = this.cache.size;
  }

  /**
   * Evict entry based on strategy
   */
  private evict(): void {
    let keyToEvict: string | null = null;

    switch (this.config.strategy) {
      case 'LRU':
        // Evict least recently used
        let lruEntry: CacheEntry<T> | null = null;
        let lruTime = Date.now();

        this.cache.forEach(entry => {
          if (entry.lastAccessed.getTime() < lruTime) {
            lruEntry = entry;
            lruTime = entry.lastAccessed.getTime();
          }
        });

        keyToEvict = lruEntry?.key || null;
        break;

      case 'LFU':
        // Evict least frequently used
        let lfuEntry: CacheEntry<T> | null = null;
        let minCount = Infinity;

        this.cache.forEach(entry => {
          if (entry.accessCount < minCount) {
            lfuEntry = entry;
            minCount = entry.accessCount;
          }
        });

        keyToEvict = lfuEntry?.key || null;
        break;

      case 'FIFO':
        // Evict oldest (first in, first out)
        let fifoEntry: CacheEntry<T> | null = null;
        let oldestTime = Date.now();

        this.cache.forEach(entry => {
          if (entry.createdAt.getTime() < oldestTime) {
            fifoEntry = entry;
            oldestTime = entry.createdAt.getTime();
          }
        });

        keyToEvict = fifoEntry?.key || null;
        break;

      case 'TTL':
        // Evict expired entries first
        for (const [key, entry] of this.cache.entries()) {
          if (entry.expiresAt && new Date() > entry.expiresAt) {
            keyToEvict = key;
            break;
          }
        }
        // Fall back to LRU if no expired entries
        if (!keyToEvict) {
          keyToEvict = Array.from(this.cache.entries())
            .sort(
              (a, b) =>
                a[1].lastAccessed.getTime() -
                b[1].lastAccessed.getTime()
            )[0]?.[0] || null;
        }
        break;
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.metrics.evictions++;
      logger.log('Cache entry evicted', {
        strategy: this.config.strategy,
        key: keyToEvict
      });
    }

    this.metrics.size = this.cache.size;
  }

  /**
   * Clear entire cache
   */
  public clear(): void {
    this.cache.clear();
    this.metrics.size = 0;
    logger.log('Cache cleared');
  }

  /**
   * Invalidate specific pattern
   */
  public invalidate(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string'
      ? new RegExp(pattern)
      : pattern;
    let count = 0;

    for (const [key] of this.cache.entries()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    this.metrics.size = this.cache.size;
    logger.log('Cache invalidated', {
      pattern: pattern.toString(),
      entriesRemoved: count
    });

    return count;
  }

  /**
   * Get cache metrics
   */
  public getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0
      ? (this.metrics.hits / total) * 100
      : 0;
  }

  /**
   * Get cache info
   */
  public getInfo(): {
    size: number;
    maxSize: number;
    utilizationPercent: number;
    strategy: CacheStrategy;
    metrics: CacheMetrics;
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      utilizationPercent: (
        (this.cache.size / this.config.maxSize) *
        100
      ).toFixed(2) as any,
      strategy: this.config.strategy,
      metrics: this.getMetrics()
    };
  }
}

/**
 * Healthcare-specific cache configuration
 */
export const HealthcareCacheConfig = {
  // Patient data - moderate TTL
  patientData: {
    maxSize: 5000,
    defaultTTL: 300 // 5 minutes
  },
  // Appointment slots - frequent updates
  appointmentSlots: {
    maxSize: 1000,
    defaultTTL: 60 // 1 minute
  },
  // Doctor availability - moderate TTL
  doctorAvailability: {
    maxSize: 500,
    defaultTTL: 600 // 10 minutes
  },
  // Medical records - longer TTL (less frequently updated)
  medicalRecords: {
    maxSize: 2000,
    defaultTTL: 1800 // 30 minutes
  },
  // Prescriptions - longer TTL
  prescriptions: {
    maxSize: 3000,
    defaultTTL: 3600 // 1 hour
  },
  // Configuration data - very long TTL
  configData: {
    maxSize: 100,
    defaultTTL: 86400 // 24 hours
  }
};
