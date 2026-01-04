import { queueManager } from '../modules/queue';

interface CardRecurringServiceParams {
  plan_id: number;
  card_id: number;
  user_id: number;
}

export class CardRecurringService {
  async register(): Promise<any> {
    queueManager.register('CARD_RECURRING', this.handler.bind(this))
  }

  async handler (params: CardRecurringServiceParams) {
    try {

      // executa tudo oque precisa
      console.log("Cartao registrado com sucesso!");

      return { success: true, response: "" }
    } catch (error: any) {
      const errorMessage = error.message || "";
      return { success: false, response: errorMessage }
    }
  }
}