import { prisma } from "../prisma";
import _ from "lodash";
import { CronExpressionParser } from 'cron-parser';

export enum QueueStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum QueueType {
  SEQUENTIAL = 'SEQUENTIAL',
  PARALLEL = 'PARALLEL',
}

type FunctionToCall = (
  params: any,
  queue_id: number
) => Promise<{ success: boolean; response: string }>;

interface QueueData {
  id: number;
  attempt: number;
  method: string;
  type: QueueType;
  params: any;
  description?: string;
  priority?: number;
  scheduled_at?: Date;
  recurring?: boolean;
  cron_expr?: string;
  status?: QueueStatus;
}

interface QueueOptions {
  type: QueueType;
  description?: string;
  priority?: number;
  scheduled_at?: Date;
  recurring?: boolean;
  cron_expr?: string;
}

interface UpdateQueueData {
  response?: string;
  attempt?: number;
  executed_at?: Date;
  finished_at?: Date;
  status?: QueueStatus;
}

export class QueueManager {
  private queueProcessing = false;
  private queueInProcess = new Set<number>();
  private queueHandlers = new Map<string, FunctionToCall>();
  private maxQueueRegisters = 20;

  /* =========================
     REGISTRO DE HANDLERS
  ========================= */
  register(method: string, fn: FunctionToCall) {
    this.queueHandlers.set(method, fn);
  }

  /* =========================
     ADD NA FILA
  ========================= */
  async add(
    method: string,
    params: any,
    options: QueueOptions
  ): Promise<QueueData> {
    return prisma.queues.create({
      select: {
        id: true,
        description: true,
        method: true,
        type: true,
        params: true,
      },
      data: {
        description: options.description,
        method,
        type: options.type,
        params,
        priority: options.priority,
        scheduled_at: options.scheduled_at,
        recurring: options.recurring,
        cron_expr: options.cron_expr,
        status: QueueStatus.PENDING,
      },
    });
  }

  /* =========================
     UPDATE
  ========================= */
  private async update(id: number, data: UpdateQueueData) {
    return prisma.queues.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    });
  }

  /* =========================
     BUSCAR FILA
     attempts < max_attempts
  ========================= */
  private async getQueueToProcess(): Promise<QueueData[]> {
    return prisma.queues.findMany({
      where: {
        id: {
          notIn: Array.from(this.queueInProcess),
        },
        status: {
          in: [QueueStatus.PENDING, QueueStatus.FAILED],
        },
        attempts: {
          lt: prisma.queues.fields.max_attempts,
        },
        OR: [
          {
            scheduled_at: null,
          },
          {
            scheduled_at: {
              lte: new Date(),
            },
          },
        ],
      },
      orderBy: [
        { priority: 'asc' },
        { created_at: 'desc' },
      ],
      take: this.maxQueueRegisters,
    });
  }

  /* =========================
     PROCESSAMENTO
  ========================= */
  async run() {
    if (this.queueProcessing) return;
    this.queueProcessing = true;

    try {
      const toProcess = await this.getQueueToProcess();
      const grouped = _.groupBy(toProcess, 'type');

      if (grouped[QueueType.PARALLEL]) {
        await this.processParallel(grouped[QueueType.PARALLEL]);
      }

      if (grouped[QueueType.SEQUENTIAL]) {
        await this.processSequential(grouped[QueueType.SEQUENTIAL]);
      }
    } catch (err) {
      console.error("Queue error:", err);
    } finally {
      this.queueProcessing = false;
    }
  }

  private calcNextExecution(cronExpr: string): Date {
    try {
      const interval = CronExpressionParser.parse(cronExpr, {
        tz: 'America/Sao_Paulo',
      });

      const nextExecution = interval.next().toDate();

      console.log(
        `✅ [CRON] Next execution calculated successfully: ${nextExecution.toISOString()}`
      );

      return nextExecution;
    } catch (error: any) {
      console.error(
        `❌ [CRON] Failed to calculate next execution for expression "${cronExpr}".`,
        error?.message || error
      );

      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() + 1);

      console.warn(
        `⚠️ [CRON] Using fallback date: ${fallbackDate.toISOString()}`
      );

      return fallbackDate;
    }
  }

  private async schedule (cron_expr: string, queue: QueueData) {
    try {
      const nextExecution = this.calcNextExecution(cron_expr);

      await this.add(queue.method, queue.params, {
        cron_expr: cron_expr,
        recurring: true,
        type: queue.type,
        description: queue.description,
        priority: queue.priority,
        scheduled_at: nextExecution,
      })

      console.log("schedule: ", nextExecution);
    } catch (error) {
      console.log("schedule: ",error);
    }
  }

  private async processQueue(queue: QueueData) {
    // Controle de concorrencia
    if (this.queueInProcess.has(queue.id)) {
      return;
    }
    
    this.queueInProcess.add(queue.id);

    try {
      await this.update(queue.id, {
        status: QueueStatus.PROCESSING,
        attempt: queue.attempt + 1,
        executed_at: new Date(),
      });

      const handler = this.queueHandlers.get(queue.method);
      if (!handler) throw new Error(`Handler não registrado: ${queue.method}`);

      const { success, response } = await handler(queue.params, queue.id);

      if (!success) throw new Error(response);

      if (queue.recurring && queue.cron_expr) {
        await this.schedule(queue.cron_expr, queue);
      }

      await this.update(queue.id, {
        status: QueueStatus.COMPLETED,
        finished_at: new Date(),
        response,
      });
    } catch (error: any) {
      await this.update(queue.id, {
        status: QueueStatus.FAILED,
        finished_at: new Date(),
        response: error?.message || 'Erro desconhecido',
      });
    } finally {
      this.queueInProcess.delete(queue.id);
    }
  }

  private async processParallel(rows: QueueData[]) {
    await Promise.allSettled(rows.map(r => this.processQueue(r)));
  }

  private async processSequential(rows: QueueData[]) {
    for (const row of rows) {
      await this.processQueue(row);
    }
  }

  /* =========================
     START
  ========================= */
  start(intervalMs = 60_000) {
    this.run();
    setInterval(() => this.run(), intervalMs);
  }
}


export const queueManager = new QueueManager();