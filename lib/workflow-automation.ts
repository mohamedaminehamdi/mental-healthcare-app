/**
 * Custom Healthcare Workflows & Automation Engine
 * ==============================================
 * Days 106-110: Custom workflow builder and business process automation
 */

import { logger } from './logger';

export interface WorkflowStep {
  stepId: string;
  name: string;
  type: 'action' | 'condition' | 'wait' | 'notification';
  config: { [key: string]: any };
  nextStepId?: string;
  condition?: (context: any) => boolean;
}

export interface Workflow {
  workflowId: string;
  name: string;
  description: string;
  version: string;
  steps: WorkflowStep[];
  triggers: string[];
  status: 'draft' | 'active' | 'archived';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  executions: number;
}

export interface WorkflowExecution {
  executionId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  context: { [key: string]: any };
  currentStep: string;
  startedAt: Date;
  completedAt?: Date;
  outputs: { [key: string]: any };
  errors?: string[];
}

export interface AutomationRule {
  ruleId: string;
  name: string;
  trigger: string; // event type that triggers the rule
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  actions: Array<{
    type: string;
    payload: { [key: string]: any };
  }>;
  enabled: boolean;
  createdAt: Date;
  lastExecuted?: Date;
}

export class WorkflowAutomationEngine {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private automationRules: Map<string, AutomationRule> = new Map();
  private executionHistory: WorkflowExecution[] = [];
  private ruleExecutionLog: Array<{
    ruleId: string;
    executedAt: Date;
    result: string;
  }> = [];

  /**
   * Create a new workflow
   */
  public createWorkflow(
    name: string,
    description: string,
    steps: WorkflowStep[],
    triggers: string[],
    createdBy: string
  ): Workflow {
    const workflow: Workflow = {
      workflowId: `wf_${Date.now()}`,
      name,
      description,
      version: '1.0.0',
      steps,
      triggers,
      status: 'draft',
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      executions: 0
    };

    this.workflows.set(workflow.workflowId, workflow);

    logger.log('Workflow created', {
      workflowId: workflow.workflowId,
      steps: steps.length,
      triggers: triggers.length
    });

    return workflow;
  }

  /**
   * Activate workflow
   */
  public activateWorkflow(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    workflow.status = 'active';
    workflow.updatedAt = new Date();

    logger.log('Workflow activated', {
      workflowId,
      name: workflow.name
    });

    return true;
  }

  /**
   * Execute workflow
   */
  public async executeWorkflow(
    workflowId: string,
    context: { [key: string]: any }
  ): Promise<WorkflowExecution | null> {
    const workflow = this.workflows.get(workflowId);
    if (
      !workflow ||
      workflow.status !== 'active'
    ) {
      return null;
    }

    const execution: WorkflowExecution = {
      executionId: `exec_${Date.now()}`,
      workflowId,
      status: 'running',
      context,
      currentStep: workflow.steps[0]?.stepId || '',
      startedAt: new Date(),
      outputs: {},
      errors: []
    };

    this.executions.set(execution.executionId, execution);
    workflow.executions++;

    try {
      // Execute each step in sequence
      for (const step of workflow.steps) {
        execution.currentStep = step.stepId;

        // Check conditions
        if (step.type === 'condition') {
          if (!step.condition?.(execution.context)) {
            logger.log('Workflow condition failed', {
              step: step.name
            });
            break;
          }
        }

        // Execute action
        if (step.type === 'action') {
          const result = await this.executeAction(
            step,
            execution.context
          );
          execution.outputs[step.stepId] = result;
        }

        // Handle notifications
        if (step.type === 'notification') {
          await this.sendNotification(
            step.config,
            execution.context
          );
        }

        // Handle wait
        if (step.type === 'wait') {
          const waitMs = step.config.duration || 0;
          await new Promise(resolve =>
            setTimeout(resolve, waitMs)
          );
        }
      }

      execution.status = 'completed';
      execution.completedAt = new Date();

      logger.log('Workflow execution completed', {
        executionId: execution.executionId,
        workflowId
      });
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.errors?.push(String(error));

      logger.error('Workflow execution failed', error);
    }

    this.executionHistory.push(execution);
    if (this.executionHistory.length > 500) {
      this.executionHistory =
        this.executionHistory.slice(-500);
    }

    return execution;
  }

  private async executeAction(
    step: WorkflowStep,
    context: any
  ): Promise<any> {
    // Simulate action execution
    return {
      step: step.name,
      status: 'success',
      timestamp: new Date(),
      ...step.config
    };
  }

  private async sendNotification(
    config: any,
    context: any
  ): Promise<void> {
    logger.log('Workflow notification sent', {
      type: config.type,
      recipient: config.recipient
    });
  }

  /**
   * Create automation rule
   */
  public createAutomationRule(
    name: string,
    trigger: string,
    conditions: AutomationRule['conditions'],
    actions: AutomationRule['actions']
  ): AutomationRule {
    const rule: AutomationRule = {
      ruleId: `rule_${Date.now()}`,
      name,
      trigger,
      conditions,
      actions,
      enabled: true,
      createdAt: new Date()
    };

    this.automationRules.set(rule.ruleId, rule);

    logger.log('Automation rule created', {
      ruleId: rule.ruleId,
      name,
      trigger
    });

    return rule;
  }

  /**
   * Evaluate rules based on event
   */
  public async evaluateRules(
    triggerEvent: string,
    eventData: any
  ): Promise<void> {
    for (const rule of this.automationRules.values()) {
      if (!rule.enabled || rule.trigger !== triggerEvent) {
        continue;
      }

      // Check conditions
      const conditionsMet = rule.conditions.every(
        condition => this.evaluateCondition(
          condition,
          eventData
        )
      );

      if (conditionsMet) {
        // Execute actions
        for (const action of rule.actions) {
          await this.executeRuleAction(action);
        }

        rule.lastExecuted = new Date();

        this.ruleExecutionLog.push({
          ruleId: rule.ruleId,
          executedAt: new Date(),
          result: 'executed'
        });
      }
    }
  }

  private evaluateCondition(
    condition: AutomationRule['conditions'][0],
    data: any
  ): boolean {
    const fieldValue = data[condition.field];

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return String(fieldValue).includes(
          String(condition.value)
        );
      case 'greaterThan':
        return fieldValue > condition.value;
      case 'lessThan':
        return fieldValue < condition.value;
      case 'in':
        return Array.isArray(condition.value)
          ? condition.value.includes(fieldValue)
          : false;
      default:
        return false;
    }
  }

  private async executeRuleAction(
    action: AutomationRule['actions'][0]
  ): Promise<void> {
    logger.log('Automation rule action executed', {
      actionType: action.type,
      payload: action.payload
    });
  }

  /**
   * Get workflow execution status
   */
  public getExecutionStatus(
    executionId: string
  ): WorkflowExecution | null {
    return this.executions.get(executionId) || null;
  }

  /**
   * Get workflow statistics
   */
  public getWorkflowStats(): {
    totalWorkflows: number;
    activeWorkflows: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
  } {
    let totalExecutions = 0;
    let successfulExecutions = 0;
    let failedExecutions = 0;
    let totalTime = 0;

    this.executionHistory.forEach(exec => {
      totalExecutions++;
      if (exec.status === 'completed') {
        successfulExecutions++;
      } else if (exec.status === 'failed') {
        failedExecutions++;
      }

      if (exec.completedAt) {
        totalTime +=
          exec.completedAt.getTime() -
          exec.startedAt.getTime();
      }
    });

    const activeWorkflows = Array.from(
      this.workflows.values()
    ).filter(w => w.status === 'active').length;

    return {
      totalWorkflows: this.workflows.size,
      activeWorkflows,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime:
        totalExecutions > 0
          ? totalTime / totalExecutions
          : 0
    };
  }

  /**
   * Generate workflow report
   */
  public generateAutomationReport(): string {
    let report = `# Workflow & Automation Report\n\n`;

    const stats = this.getWorkflowStats();

    report += `## Statistics\n`;
    report += `- Total Workflows: ${stats.totalWorkflows}\n`;
    report += `- Active: ${stats.activeWorkflows}\n`;
    report += `- Total Executions: ${stats.totalExecutions}\n`;
    report += `- Success Rate: ${
      stats.totalExecutions > 0
        ? (
          (stats.successfulExecutions /
            stats.totalExecutions) *
          100
        ).toFixed(2)
        : 0
    }%\n`;
    report += `- Avg Execution Time: ${stats.averageExecutionTime.toFixed(
      0
    )}ms\n\n`;

    report += `## Automation Rules\n`;
    report += `- Total Rules: ${this.automationRules.size}\n`;

    const recentExecutions = this.ruleExecutionLog.slice(
      -5
    );
    if (recentExecutions.length > 0) {
      report += `- Recent Executions: ${recentExecutions.length}\n`;
    }

    return report;
  }
}

export const workflowAutomationEngine =
  new WorkflowAutomationEngine();
