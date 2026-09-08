import { createHash } from "node:crypto";

export function hashInt(seed: string): number {
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 8);
  return Number.parseInt(hex, 16);
}

export function pickSeeded<T>(items: T[], seed: string): T {
  if (items.length === 0) throw new Error("Cannot pick from an empty array");
  return items[hashInt(seed) % items.length] as T;
}

export function jitter(seed: string, range: number): number {
  const unit = (hashInt(seed) % 10_000) / 10_000;
  return (unit * 2 - 1) * range;
}
