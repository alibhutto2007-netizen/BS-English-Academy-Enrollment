export function formatTitleCase(value: string) {
  return value
    .toLocaleLowerCase('en')
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase('en'));
}

export function sanitizeName(value: string) {
  return formatTitleCase(
    value
      .replace(/[^\p{L}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trimStart(),
  );
}

export function sanitizeNumbers(value: string, maxLength?: number) {
  const digits = value.replace(/\D/g, '');
  return maxLength ? digits.slice(0, maxLength) : digits;
}

export function sanitizePhone(value: string) {
  return sanitizeNumbers(value, 15);
}

export function sanitizeCNIC(value: string) {
  return sanitizeNumbers(value, 13);
}

export function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : undefined;
}

export function toLocalDateValue(date?: Date) {
  if (!date || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidDateValue(value: string) {
  return Boolean(parseLocalDate(value));
}