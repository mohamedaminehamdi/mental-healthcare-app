/**
 * Real-Time Data Streaming & Event Processing
 * ==========================================
 * Days 97-100: Apache Kafka/RabbitMQ integration for real-time streaming
 */

import { logger } from './logger';

export interface StreamEvent {
  eventId: string;
  topic: string;
  data: { [key: string]: any };
  timestamp: Date;
  partition?: number;
  offset?: number;
  processed: boolean;
  consumerGroup?: string;
}

export interface StreamConsumer {
  consumerId: string;
  topic: string;
  consumerGroup: string;
  lastOffset: number;
  lag: number;
  status: 'active' | 'inactive' | 'error';
  messagesConsumed: number;
}

export interface StreamProcessor {
  processorId: string;
  name: string;
  inputTopics: string[];
  outputTopic: string;
  processingLogic: (event: StreamEvent) => StreamEvent | null;
  status: 'running' | 'paused' | 'failed';
  eventsProcessed: number;
  errors: number;
}

export interface StreamMetrics {
  messagesPerSecond: number;
  averageLatency: number;
  errorRate: number;
  consumerLag: number;
  bytesConsumed: number;
  topicPartitionDistribution: { [key: string]: number };
}

export class RealTimeStreamingManager {
  private topics: Map<string, StreamEvent[]> = new Map();
  private consumers: Map<string, StreamConsumer> = new Map();
  private processors: Map<string, StreamProcessor> = new Map();
  private deadLetterQueue: StreamEvent[] = [];
  private metrics: StreamMetrics = {
    messagesPerSecond: 0,
    averageLatency: 0,
    errorRate: 0,
    consumerLag: 0,
    bytesConsumed: 0,
    topicPartitionDistribution: {}
  };

  /**
   * Create a topic for streaming
   */
  public createTopic(
    topicName: string,
    partitions: number = 1
  ): boolean {
    try {
      if (!this.topics.has(topicName)) {
        this.topics.set(topicName, []);
        this.metrics.topicPartitionDistribution[topicName] =
          partitions;

        logger.log('Topic created', {
          topic: topicName,
          partitions
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Topic creation failed', error);
      return false;
    }
  }

  /**
   * Publish event to topic
   */
  public publishEvent(
    topic: string,
    data: { [key: string]: any }
  ): StreamEvent | null {
    try {
      if (!this.topics.has(topic)) {
        this.createTopic(topic);
      }

      const event: StreamEvent = {
        eventId: `evt_${Date.now()}`,
        topic,
        data,
        timestamp: new Date(),
        partition: 0,
        offset:
          (this.topics.get(topic)?.length ?? 0) + 1,
        processed: false
      };

      const topicEvents = this.topics.get(topic);
      if (topicEvents) {
        topicEvents.push(event);
      }

      // Update metrics
      this.metrics.bytesConsumed += JSON.stringify(data).length;
      this.metrics.messagesPerSecond++;

      return event;
    } catch (error) {
      logger.error('Event publishing failed', error);
      return null;
    }
  }

  /**
   * Subscribe consumer to topic
   */
  public subscribeConsumer(
    consumerId: string,
    topic: string,
    consumerGroup: string
  ): StreamConsumer {
    const consumer: StreamConsumer = {
      consumerId,
      topic,
      consumerGroup,
      lastOffset: 0,
      lag: 0,
      status: 'active',
      messagesConsumed: 0
    };

    this.consumers.set(consumerId, consumer);

    logger.log('Consumer subscribed', {
      consumerId,
      topic,
      group: consumerGroup
    });

    return consumer;
  }

  /**
   * Consume messages from topic
   */
  public consumeMessages(
    consumerId: string,
    maxMessages: number = 100
  ): StreamEvent[] {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) return [];

    const topic = this.topics.get(consumer.topic) || [];
    const messages = topic.slice(
      consumer.lastOffset,
      consumer.lastOffset + maxMessages
    );

    consumer.lastOffset += messages.length;
    consumer.messagesConsumed += messages.length;
    consumer.lag = topic.length - consumer.lastOffset;

    // Update metrics
    this.metrics.consumerLag = Math.max(
      this.metrics.consumerLag,
      consumer.lag
    );

    return messages;
  }

  /**
   * Register stream processor
   */
  public registerProcessor(
    processorId: string,
    name: string,
    inputTopics: string[],
    outputTopic: string,
    processingLogic: (event: StreamEvent) => StreamEvent | null
  ): StreamProcessor {
    const processor: StreamProcessor = {
      processorId,
      name,
      inputTopics,
      outputTopic,
      processingLogic,
      status: 'running',
      eventsProcessed: 0,
      errors: 0
    };

    this.processors.set(processorId, processor);
    return processor;
  }

  /**
   * Process stream of events through processor
   */
  public processEvents(
    processorId: string,
    events: StreamEvent[]
  ): void {
    const processor = this.processors.get(processorId);
    if (!processor || processor.status !== 'running') {
      return;
    }

    events.forEach(event => {
      try {
        const startTime = Date.now();
        const processed = processor.processingLogic(event);

        if (processed) {
          // Publish to output topic
          this.publishEvent(processor.outputTopic, processed.data);
          processor.eventsProcessed++;

          // Calculate latency
          const latency = Date.now() - startTime.getTime();
          this.metrics.averageLatency =
            (this.metrics.averageLatency +
              latency) /
            2;
        }
      } catch (error) {
        processor.errors++;
        // Send to dead letter queue
        this.deadLetterQueue.push(event);
        logger.error(
          'Stream processing error',
          error
        );
      }
    });

    // Update error rate
    const totalEvents =
      processor.eventsProcessed + processor.errors;
    this.metrics.errorRate =
      totalEvents > 0
        ? (processor.errors / totalEvents) * 100
        : 0;
  }

  /**
   * Get dead letter queue events
   */
  public getDeadLetterQueue(): StreamEvent[] {
    return this.deadLetterQueue;
  }

  /**
   * Retry event from dead letter queue
   */
  public retryFromDLQ(eventId: string): boolean {
    const index = this.deadLetterQueue.findIndex(
      e => e.eventId === eventId
    );
    if (index > -1) {
      const event = this.deadLetterQueue[index];
      this.publishEvent(event.topic, event.data);
      this.deadLetterQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get streaming metrics
   */
  public getMetrics(): StreamMetrics {
    return { ...this.metrics };
  }

  /**
   * Get consumer lag information
   */
  public getConsumerLagInfo(): {
    consumerId: string;
    topic: string;
    lag: number;
  }[] {
    return Array.from(this.consumers.values()).map(
      consumer => ({
        consumerId: consumer.consumerId,
        topic: consumer.topic,
        lag: consumer.lag
      })
    );
  }

  /**
   * Generate streaming report
   */
  public generateStreamingReport(): string {
    let report = `# Real-Time Streaming Report\n\n`;

    report += `## Metrics\n`;
    report += `- Messages/sec: ${this.metrics.messagesPerSecond}\n`;
    report += `- Avg Latency: ${this.metrics.averageLatency.toFixed(2)}ms\n`;
    report += `- Error Rate: ${this.metrics.errorRate.toFixed(2)}%\n`;
    report += `- Consumer Lag: ${this.metrics.consumerLag}\n`;
    report += `- Total Bytes: ${this.metrics.bytesConsumed}\n\n`;

    report += `## Topics\n`;
    this.topics.forEach((events, topic) => {
      report += `- ${topic}: ${events.length} messages\n`;
    });

    report += `\n## Processors\n`;
    this.processors.forEach(processor => {
      report += `- ${processor.name} [${processor.status}]\n`;
      report += `  Processed: ${processor.eventsProcessed}\n`;
      report += `  Errors: ${processor.errors}\n`;
    });

    if (this.deadLetterQueue.length > 0) {
      report += `\n## Dead Letter Queue\n`;
      report += `- Events: ${this.deadLetterQueue.length}\n`;
    }

    return report;
  }
}

export const realTimeStreamingManager =
  new RealTimeStreamingManager();
