import type { CandidateSet } from "@/lib/fits/types";

export function fitSetPageUrl(slug: string): string {
  return `https://fits.shadewellness.shop/fits/${slug}`;
}

export function buildPinTitle(set: CandidateSet): string {
  const hero = set.items
    .slice(0, 2)
    .map((item) => item.title)
    .join(" + ");
  return `${hero} | Gym girl outfit set`.slice(0, 100);
}

export function buildPinDescription(set: CandidateSet): string {
  const slots = set.items.map((item) => item.slot).join(", ");
  return [
    set.blurb,
    `Includes ${slots}.`,
    "Neutral gym outfit ideas, clean girl workout style, gym girl aesthetic.",
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}
