import { Request, Response } from "express";
import { prisma } from "../prisma";
import { queueManager, QueueType } from "../modules/queue";

interface CreaterSubscribeBody {
  user_id: number;
  card_id: number;
  plan_id: number;
}

class SubscribeController {
  async store(req: Request<{}, {}, CreaterSubscribeBody>, res: Response) {
    const {
      user_id,
      card_id,
      plan_id,
    } = req.body;

    try {

      const params = {
        user_id: user_id,
        card_id: card_id,
        plan_id: plan_id,
      }

      await queueManager.add('CARD_RECURRING', params, {
        description: "Cobrança automatica",
        type: QueueType.PARALLEL,
        priority: 0,
        scheduled_at: new Date(),
        recurring: true,
        cron_expr: "0 3 * * *",
      });

      return res.status(201).json({ message: "" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Erro ao criar fila." });
    }
  }
}

export default new SubscribeController();
