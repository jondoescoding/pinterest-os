import { describe, expect, it } from "vitest";
import { extractPostizPostId, parseScheduledAt } from "../lib/publish";

describe("publish helpers", () => {
  it("parses ISO and unix scheduled times", () => {
    expect(parseScheduledAt("2026-06-30T14:00:00.000Z")).toBe(1782828000);
    expect(parseScheduledAt(1782828000)).toBe(1782828000);
    expect(parseScheduledAt(1782828000000)).toBe(1782828000);
    expect(parseScheduledAt("not a date")).toBeNull();
  });

  it("extracts Postiz ids from common response shapes", () => {
    expect(extractPostizPostId({ id: "post-1" })).toBe("post-1");
    expect(extractPostizPostId({ postId: "post-2" })).toBe("post-2");
    expect(extractPostizPostId({ data: { posts: [{ id: "post-3" }] } })).toBe(
      "post-3",
    );
    expect(extractPostizPostId([{ id: "post-4" }])).toBe("post-4");
    expect(extractPostizPostId({ data: null })).toBeNull();
  });
});
