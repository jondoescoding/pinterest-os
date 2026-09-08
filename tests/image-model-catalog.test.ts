import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertApprovedImageModel,
  listFalTextToImageModels,
} from "../lib/fal-models";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("approved image model catalog", () => {
  it("exposes Nano Banana 2 by its public name", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    const models = await listFalTextToImageModels();
    expect(models).toContainEqual(
      expect.objectContaining({
        id: "fal-ai/nano-banana-2",
        title: "Nano Banana 2",
      }),
    );
  });

  it("rejects arbitrary model strings before generation", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    await expect(assertApprovedImageModel("pinterest")).rejects.toThrow(
      "not in the approved model catalog",
    );
  });
});
