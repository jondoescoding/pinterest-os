import { describe, expect, it } from "vitest";
import type { Channel3Product } from "../lib/channel3";
import { getLayoutBoxes } from "../lib/fits/collage";
import { composeSet } from "../lib/fits/composer";
import { productHash } from "../lib/fits/dedupe";
import { filterPublishable } from "../lib/fits/filters";
import { buildPinDescription, buildPinTitle } from "../lib/fits/pin-copy";
import { buildReport } from "../lib/fits/report";
import { scheduledPinTimes } from "../lib/fits/schedule";
import type { FitTheme } from "../lib/fits/types";

function product(
  id: string,
  patch: Partial<Channel3Product> = {},
): Channel3Product {
  return {
    id,
    title: `Product ${id}`,
    description: "Neutral workout layer for training days.",
    key_features: ["soft neutral fabric"],
    brands: [{ name: "Brand" }],
    images: [
      {
        url: `https://example.com/${id}.png`,
        is_cleaned_image: true,
        alt_text: "white product",
      },
    ],
    offers: [
      {
        url: `https://buy.trychannel3.com/${id}`,
        availability: "InStock",
        max_commission_rate: 10,
        price: { price: 50, currency: "USD" },
      },
    ],
    ...patch,
  };
}

const testTheme: FitTheme = {
  name: "Gym Girl Aesthetic",
  slug: "gym-girl-aesthetic",
  blurbTemplate: "Clean gym layers for a neutral workout set.",
  palette: ["white"],
  slots: [
    {
      slot: "top",
      required: true,
      priceBand: { min: 1, max: 100 },
      queryVariants: ["top"],
    },
    {
      slot: "bottoms",
      required: true,
      priceBand: { min: 1, max: 100 },
      queryVariants: ["bottoms"],
    },
    {
      slot: "shoes",
      required: true,
      priceBand: { min: 1, max: 100 },
      queryVariants: ["shoes"],
    },
    {
      slot: "bag",
      required: false,
      priceBand: { min: 1, max: 100 },
      queryVariants: ["bag"],
    },
    {
      slot: "accessory",
      required: false,
      priceBand: { min: 1, max: 100 },
      queryVariants: ["accessory"],
    },
  ],
};

describe("fit product filters", () => {
  it("keeps only in-stock commission products with cleaned images in band", () => {
    const products = [
      product("ok"),
      product("oos", { offers: [{ availability: "OutOfStock" }] }),
      product("free", {
        offers: [
          {
            availability: "InStock",
            max_commission_rate: 0,
            price: { price: 50 },
            url: "https://buy.trychannel3.com/free",
          },
        ],
      }),
      product("dirty", { images: [{ url: "https://example.com/dirty.png" }] }),
      product("expensive", {
        offers: [
          {
            availability: "InStock",
            max_commission_rate: 10,
            price: { price: 500 },
            url: "https://buy.trychannel3.com/expensive",
          },
        ],
      }),
    ];
    expect(filterPublishable(products, { min: 1, max: 100 })).toHaveLength(1);
    expect(filterPublishable(products, { min: 1, max: 100 })[0]?.id).toBe("ok");
  });
});

describe("fit dedupe", () => {
  it("hashes product combinations independent of product order", () => {
    expect(productHash(["b", "a", "c"])).toBe(productHash(["c", "b", "a"]));
    expect(productHash(["a", "b", "c"])).not.toBe(productHash(["a", "b"]));
  });
});

describe("fit composer", () => {
  it("falls back when optional slots are empty but four items remain", async () => {
    const result = await composeSet({
      date: "2026-07-04",
      runIndex: 0,
      theme: testTheme,
      deps: {
        search: async (query) =>
          query === "accessory" ? [] : [product(query)],
        isRecentlyUsed: async () => false,
        hasProductHash: async () => false,
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.set.items).toHaveLength(4);
  });

  it("rejects duplicate product hashes", async () => {
    const result = await composeSet({
      date: "2026-07-04",
      runIndex: 0,
      theme: testTheme,
      deps: {
        search: async (query) => [product(query)],
        isRecentlyUsed: async () => false,
        hasProductHash: async () => true,
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.code).toBe("duplicate_set");
  });

  it("rejects products used inside the 30-day window", async () => {
    const result = await composeSet({
      date: "2026-07-04",
      runIndex: 0,
      theme: testTheme,
      deps: {
        search: async (query) => [product(query)],
        isRecentlyUsed: async () => true,
        hasProductHash: async () => false,
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.code).toBe("required_slot_empty");
  });
});

describe("fit pin copy", () => {
  it("builds bounded templated title and description", async () => {
    const result = await composeSet({
      date: "2026-07-04",
      runIndex: 0,
      theme: testTheme,
      deps: {
        search: async (query) => [product(query)],
        isRecentlyUsed: async () => false,
        hasProductHash: async () => false,
      },
    });
    if (!result.ok) throw new Error("Expected composed set");
    expect(buildPinTitle(result.set)).toContain("Gym girl outfit set");
    expect(buildPinTitle(result.set).length).toBeLessThanOrEqual(100);
    expect(buildPinDescription(result.set)).toContain("Neutral gym outfit");
    expect(buildPinDescription(result.set).length).toBeLessThanOrEqual(500);
  });
});

describe("fit reports and schedules", () => {
  it("formats a report with published, skipped, and failed sections", () => {
    const report = buildReport({
      dryRun: true,
      startedAt: "2026-07-04T13:00:00.000Z",
      finishedAt: "2026-07-04T13:01:00.000Z",
      published: [],
      drafts: [
        {
          slug: "set-1",
          title: "Set 1",
          pageUrl: "https://fits.shadewellness.shop/fits/set-1",
          pinId: null,
          scheduledAt: "2026-07-04T09:00:00-05:00",
          itemCount: 5,
        },
      ],
      skipped: ["accessory: no eligible product"],
      failed: [{ title: "Set 2", reason: "Image fetch failed" }],
    });
    expect(report).toContain("DRY RUN");
    expect(report).toContain("Drafts (1)");
    expect(report).toContain("Skipped (1)");
    expect(report).toContain("Failed (1)");
  });

  it("spreads five pins across one day", () => {
    expect(scheduledPinTimes("2026-07-04", 5)).toEqual([
      "2026-07-04T08:30:00-05:00",
      "2026-07-04T11:30:00-05:00",
      "2026-07-04T14:30:00-05:00",
      "2026-07-04T17:30:00-05:00",
      "2026-07-04T20:00:00-05:00",
    ]);
  });
});

describe("fit collage layout", () => {
  it("keeps layout boxes inside the 1000x1500 canvas", () => {
    for (const count of [4, 5, 6, 7]) {
      for (const box of getLayoutBoxes(count, `seed-${count}`)) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.maxW).toBeLessThanOrEqual(1000);
        expect(box.y + box.maxH).toBeLessThanOrEqual(1500);
      }
    }
  });
});
