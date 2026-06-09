/**
 * Drizzle returns Date objects for timestamp columns.
 * Generated Zod schemas expect ISO strings.
 * Call serializeDates() before parsing DB rows with Zod.
 */
export function serializeDates<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (value === null || value === undefined) {
      result[key] = value;
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

export function serializeDatesArray<T extends Record<string, unknown>>(arr: T[]): T[] {
  return arr.map(serializeDates);
}
