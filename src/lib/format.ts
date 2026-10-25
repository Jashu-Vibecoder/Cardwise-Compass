import { dateOnly } from '../domain/dates';

export const currencyFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(amountMinor: number) {
  return currencyFormat.format(amountMinor / 100);
}

export function parseINRAmount(value: string) {
  const cleaned = value.trim().replaceAll(',', '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [rupees, paise = ''] = cleaned.split('.');
  const minor = Number(rupees) * 100 + Number(paise.padEnd(2, '0'));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

export function parseINRAmountOrZero(value: string) {
  const cleaned = value.trim().replaceAll(',', '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [rupees, paise = ''] = cleaned.split('.');
  const minor = Number(rupees) * 100 + Number(paise.padEnd(2, '0'));
  return Number.isSafeInteger(minor) && minor >= 0 ? minor : null;
}

export function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

export function shortDate(value: string, timezone = 'UTC') {
  const date = dateOnly(value, timezone);
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function percent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'No prior data';
  const rounded = Math.round(Math.abs(value));
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${rounded}%`;
}

export function currentMonth(timezone = 'UTC') {
  return dateOnly(new Date().toISOString(), timezone).slice(0, 7);
}
