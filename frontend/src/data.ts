import type { Retailer } from './types';

export async function loadRetailers(): Promise<Retailer[]> {
  const res = await fetch('/json/retailers.json');
  if (!res.ok) throw new Error(`Failed to load retailers.json: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('retailers.json: expected array');
  return data as Retailer[];
}
