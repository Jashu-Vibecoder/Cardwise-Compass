import type { TransactionInput } from './types';
import { dateOnly } from './dates';

export function transactionDedupeKey(input: Pick<TransactionInput, 'occurred_at' | 'amount_minor' | 'currency' | 'transaction_type' | 'merchant' | 'description' | 'category_id' | 'card_id' | 'recurring' | 'spend_channel'>, timezone: string) {
  return JSON.stringify([
    dateOnly(input.occurred_at, timezone), input.amount_minor, input.currency.toUpperCase(), input.transaction_type,
    input.merchant.trim().toLocaleLowerCase(), input.description?.trim().toLocaleLowerCase() ?? '',
    input.category_id, input.card_id, input.recurring, input.spend_channel,
  ]);
}
