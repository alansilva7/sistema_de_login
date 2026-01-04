import { Request, Response } from "express";
import { prisma } from "../prisma";
import { QueueStatus } from "../../generated/prisma/enums";

interface CreaterQueueBody {
  description?: string;
  method: string;
  type: string;
  params?: unknown;
  priority?: number;
  scheduled_at?: string | Date;
  recurring?: boolean;
  cron_expr?: string;
}

class QueueController {
  async store(req: Request<{}, {}, CreaterQueueBody>, res: Response) {
    const {
      description,
      method,
      type,
      params,
      priority,
      scheduled_at,
      recurring,
      cron_expr,
    } = req.body;

    try {
      const queue = await prisma.queues.create({
        data: {
          description: description ? String(description) : undefined,
          method: String(method),
          type: String(type),
          params: params
            ? typeof params === "string"
              ? JSON.parse(params)
              : params
            : undefined,
          priority: priority !== undefined ? Number(priority) : undefined,
          scheduled_at: scheduled_at ? new Date(scheduled_at) : undefined,
          recurring,
          cron_expr,
          status: QueueStatus.PENDING,
        },
      });

      return res.status(201).json(queue);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Erro ao criar fila." });
    }
  }
}

export default new QueueController();
