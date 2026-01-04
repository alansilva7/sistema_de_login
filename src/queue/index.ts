import { CardRecurringService } from "./card_recurring";

const cardRecurringService = new CardRecurringService();

export const registerAll = () => {
  cardRecurringService.register();
}