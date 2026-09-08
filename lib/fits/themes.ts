import type { FitTheme } from "@/lib/fits/types";

export const GYM_GIRL_AESTHETIC_THEME: FitTheme = {
  name: "Gym Girl Aesthetic",
  slug: "gym-girl-aesthetic",
  blurbTemplate:
    "A clean gym set built around neutral layers, soft structure, and pieces that still work after training. The vibe is focused, polished, and lowkey practical.",
  palette: ["white", "black", "gray", "grey", "cream", "beige", "taupe"],
  slots: [
    {
      slot: "top",
      required: true,
      priceBand: { min: 18, max: 85 },
      queryVariants: [
        "women neutral workout tank top",
        "women white gym crop top",
        "women black fitted workout top",
      ],
    },
    {
      slot: "bottoms",
      required: true,
      priceBand: { min: 28, max: 120 },
      queryVariants: [
        "women high waist leggings neutral",
        "women black workout leggings",
        "women beige bike shorts gym",
      ],
    },
    {
      slot: "shoes",
      required: true,
      priceBand: { min: 45, max: 180 },
      queryVariants: [
        "women white training sneakers",
        "women neutral gym shoes",
        "women white running shoes",
      ],
    },
    {
      slot: "bag",
      required: false,
      priceBand: { min: 20, max: 140 },
      queryVariants: [
        "women neutral gym tote bag",
        "women black gym duffle bag",
        "cream workout bag women",
      ],
    },
    {
      slot: "headphones",
      required: false,
      priceBand: { min: 25, max: 220 },
      queryVariants: [
        "white wireless headphones gym",
        "neutral over ear headphones workout",
        "black wireless earbuds workout",
      ],
    },
    {
      slot: "water bottle",
      required: false,
      priceBand: { min: 12, max: 55 },
      queryVariants: [
        "white insulated water bottle",
        "neutral gym water bottle",
        "cream stainless steel water bottle",
      ],
    },
    {
      slot: "accessory",
      required: false,
      priceBand: { min: 8, max: 65 },
      queryVariants: [
        "neutral claw clip workout",
        "white crew socks women gym",
        "black workout hair clip",
      ],
    },
  ],
};

export const FIT_THEMES = [GYM_GIRL_AESTHETIC_THEME];
