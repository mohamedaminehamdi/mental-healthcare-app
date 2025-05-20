/**
 * GraphQL API Layer & Query Optimization
 * ====================================
 * Days 101-105: GraphQL implementation with advanced querying and caching
 */

import { logger } from './logger';

export interface GraphQLQuery {
  queryId: string;
  query: string;
  variables?: { [key: string]: any };
  executedAt: Date;
  executionTime: number; // ms
  resultSize: number; // bytes
  cached: boolean;
}

export interface GraphQLSchema {
  typeName: string;
  fields: {
    name: string;
    type: string;
    nullable: boolean;
    list: boolean;
  }[];
  description?: string;
}

export interface CachedResult {
  resultId: string;
  queryHash: string;
  result: any;
  queryVariables: any;
  cachedAt: Date;
  expiresAt: Date;
  hitCount: number;
  size: number;
}

export class GraphQLAPIManager {
  private schemas: Map<string, GraphQLSchema> = new Map();
  private queryCache: Map<string, CachedResult> = new Map();
  private queryHistory: GraphQLQuery[] = [];
  private queryMetrics = {
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgExecutionTime: 0,
    avgResultSize: 0
  };

  /**
   * Define GraphQL schema
   */
  public defineSchema(
    typeName: string,
    fields: GraphQLSchema['fields'],
    description?: string
  ): GraphQLSchema {
    const schema: GraphQLSchema = {
      typeName,
      fields,
      description
    };

    this.schemas.set(typeName, schema);

    logger.log('GraphQL schema defined', {
      type: typeName,
      fieldCount: fields.length
    });

    return schema;
  }

  /**
   * Execute GraphQL query
   */
  public async executeQuery(
    query: string,
    variables?: { [key: string]: any }
  ): Promise<{
    data?: any;
    errors?: string[];
    executionTime: number;
  }> {
    const queryHash = this.hashQuery(query, variables);
    const cachedResult = this.queryCache.get(queryHash);

    // Check cache first
    if (cachedResult && !this.isCacheExpired(cachedResult)) {
      cachedResult.hitCount++;
      this.queryMetrics.cacheHits++;

      logger.log('Cache hit', {
        queryHash: queryHash.substring(0, 8),
        hitCount: cachedResult.hitCount
      });

      return {
        data: cachedResult.result,
        executionTime: 0
      };
    }

    this.queryMetrics.cacheMisses++;
    const startTime = Date.now();

    try {
      // Simulate query execution
      // In production, actual GraphQL resolver execution would happen here
      const result = await this.resolveQuery(
        query,
        variables
      );
      const executionTime = Date.now() - startTime;

      // Cache the result
      const resultSize = JSON.stringify(result).length;
      this.cacheResult(
        queryHash,
        result,
        variables,
        resultSize
      );

      // Record query
      this.recordQuery(query, variables, executionTime, resultSize, false);

      this.queryMetrics.totalQueries++;
      this.queryMetrics.avgExecutionTime =
        (this.queryMetrics.avgExecutionTime +
          executionTime) /
        2;
      this.queryMetrics.avgResultSize =
        (this.queryMetrics.avgResultSize + resultSize) / 2;

      return {
        data: result,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordQuery(
        query,
        variables,
        executionTime,
        0,
        false
      );

      logger.error('Query execution failed', error);
      return {
        errors: [String(error)],
        executionTime
      };
    }
  }

  private async resolveQuery(
    query: string,
    variables?: { [key: string]: any }
  ): Promise<any> {
    // Simulated query resolution
    // Extract the main type from query
    const typeMatch = query.match(
      /query\s+(\w+)\s*\{|{/
    );
    const queryType = typeMatch ? 'Query' : 'Unknown';

    // Simulate resolver returning data
    return {
      data: {
        success: true,
        queryType,
        variablesUsed: Object.keys(variables || {})
          .length,
        timestamp: new Date()
      }
    };
  }

  private hashQuery(
    query: string,
    variables?: any
  ): string {
    const str =
      query + JSON.stringify(variables || {});
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return hash.toString(36);
  }

  private isCacheExpired(cached: CachedResult): boolean {
    return new Date() > cached.expiresAt;
  }

  private cacheResult(
    queryHash: string,
    result: any,
    variables: any,
    size: number
  ): void {
    const cached: CachedResult = {
      resultId: `result_${Date.now()}`,
      queryHash,
      result,
      queryVariables: variables,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minute TTL
      hitCount: 0,
      size
    };

    this.queryCache.set(queryHash, cached);

    // Keep cache size manageable
    if (this.queryCache.size > 1000) {
      const oldestKey = Array.from(
        this.queryCache.keys()
      )[0];
      this.queryCache.delete(oldestKey);
    }
  }

  private recordQuery(
    query: string,
    variables: any,
    executionTime: number,
    resultSize: number,
    cached: boolean
  ): void {
    const queryRecord: GraphQLQuery = {
      queryId: `gql_${Date.now()}`,
      query,
      variables,
      executedAt: new Date(),
      executionTime,
      resultSize,
      cached
    };

    this.queryHistory.push(queryRecord);

    // Keep last 1000 queries
    if (this.queryHistory.length > 1000) {
      this.queryHistory = this.queryHistory.slice(
        -1000
      );
    }
  }

  /**
   * Get slow queries
   */
  public getSlowQueries(
    threshold: number = 100
  ): GraphQLQuery[] {
    return this.queryHistory.filter(
      q => q.executionTime > threshold
    );
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.queryCache.clear();
    logger.log('GraphQL cache cleared');
  }

  /**
   * Clear cache for specific type
   */
  public clearCacheForType(typeName: string): void {
    const keysToDelete: string[] = [];

    this.queryCache.forEach((cached, key) => {
      if (cached.queryHash.includes(typeName)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.queryCache.delete(key));
    logger.log('Cache cleared for type', { type: typeName });
  }

  /**
   * Get API metrics
   */
  public getMetrics(): typeof this.queryMetrics & {
    cacheSize: number;
    cacheHitRate: number;
  } {
    const totalQueries =
      this.queryMetrics.cacheHits +
      this.queryMetrics.cacheMisses;
    const hitRate =
      totalQueries > 0
        ? (this.queryMetrics.cacheHits / totalQueries) *
          100
        : 0;

    return {
      ...this.queryMetrics,
      cacheSize: this.queryCache.size,
      cacheHitRate: parseFloat(hitRate.toFixed(2))
    };
  }

  /**
   * Generate GraphQL report
   */
  public generateGraphQLReport(): string {
    let report = `# GraphQL API Report\n\n`;

    const metrics = this.getMetrics();
    report += `## Query Metrics\n`;
    report += `- Total Queries: ${metrics.totalQueries}\n`;
    report += `- Cache Hit Rate: ${metrics.cacheHitRate}%\n`;
    report += `- Avg Execution Time: ${metrics.avgExecutionTime.toFixed(2)}ms\n`;
    report += `- Avg Result Size: ${metrics.avgResultSize.toFixed(0)} bytes\n`;
    report += `- Cached Results: ${metrics.cacheSize}\n\n`;

    report += `## Defined Schemas\n`;
    this.schemas.forEach((schema) => {
      report += `- ${schema.typeName} (${schema.fields.length} fields)\n`;
    });

    const slowQueries = this.getSlowQueries(50);
    if (slowQueries.length > 0) {
      report += `\n## Slow Queries (>50ms)\n`;
      slowQueries
        .slice(-5)
        .forEach(query => {
          report += `- ${query.executionTime}ms: ${query.query.substring(
            0,
            50
          )}...\n`;
        });
    }

    return report;
  }
}

export const graphQLAPIManager = new GraphQLAPIManager();
