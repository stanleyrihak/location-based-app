import type { Coordinates } from './geo.ts';
import { HttpError } from './http.ts';

// Small checks for request fields. Anything a client sends can be wrong or made up, so every
// field is checked before use. (A real project would likely use a library such as Zod.)

function invalid(field: string, expected: string): never {
  throw new HttpError(400, 'invalid_field', `"${field}" must be ${expected}.`, { field });
}

export function asString(value: unknown, field: string, maxLength = 500): string {
  if (typeof value !== 'string' || value.length > maxLength) {
    invalid(field, `text of at most ${maxLength} characters`);
  }
  return value;
}

export function asInteger(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    invalid(field, `a whole number from ${min} to ${max}`);
  }
  return value;
}

export function asObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalid(field, 'an object');
  }
  return value as Record<string, unknown>;
}

export function asArray(value: unknown, field: string, maxLength = 50): unknown[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxLength) {
    invalid(field, `a list of 1 to ${maxLength} entries`);
  }
  return value;
}

export function asCoordinates(value: unknown, field: string): Coordinates {
  const object = asObject(value, field);
  const { latitude, longitude } = object;
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    invalid(field, 'an object with a latitude and a longitude');
  }
  return { latitude, longitude };
}

/** "+358 40 123 4567" or "+358401234567" becomes "+358401234567". */
export function asPhone(value: unknown, field = 'phone'): string {
  const phone = asString(value, field, 30).replace(/[\s-]/g, '');
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
    invalid(field, 'a phone number with its country code, like +358401234567');
  }
  return phone;
}
