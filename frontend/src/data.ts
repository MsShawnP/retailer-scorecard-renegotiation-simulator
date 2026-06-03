import type { Retailer } from './types';

/** Minimal runtime shape check — verifies essential fields exist on each entry. */
function validateRetailer(item: unknown, index: number): item is Retailer {
  if (typeof item !== 'object' || item === null) {
    throw new Error(`retailers.json[${index}]: expected object, got ${typeof item}`);
  }
  const obj = item as Record<string, unknown>;
  const required = ['retailer_id', 'name', 'gross_revenue', 'cogs_rate', 'lever_ranges'] as const;
  for (const key of required) {
    if (!(key in obj)) {
      throw new Error(`retailers.json[${index}]: missing required field "${key}"`);
    }
  }
  if (typeof obj.retailer_id !== 'string') {
    throw new Error(`retailers.json[${index}]: retailer_id must be a string`);
  }
  if (typeof obj.gross_revenue !== 'number') {
    throw new Error(`retailers.json[${index}]: gross_revenue must be a number`);
  }
  return true;
}

export async function loadRetailers(): Promise<Retailer[]> {
  const res = await fetch('/json/retailers.json');
  if (!res.ok) throw new Error(`Failed to load retailers.json: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('retailers.json: expected array');
  data.forEach((item, i) => validateRetailer(item, i));
  return data as Retailer[];
}
