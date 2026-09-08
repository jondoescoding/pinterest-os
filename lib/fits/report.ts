import type { FitRunResult } from "@/lib/fits/types";

function lineList(values: string[]): string {
  return values.length
    ? values.map((value) => `- ${value}`).join("\n")
    : "- None";
}

export function buildReport(result: FitRunResult): string {
  const status = result.dryRun ? "DRY RUN" : "LIVE RUN";
  const published = result.published.map(
    (set) =>
      `${set.title} (${set.itemCount} items) scheduled ${set.scheduledAt}: ${set.pageUrl}`,
  );
  const drafts = result.drafts.map(
    (set) =>
      `${set.title} (${set.itemCount} items) draft ${set.scheduledAt}: ${set.pageUrl}`,
  );
  const failed = result.failed.map((item) => `${item.title}: ${item.reason}`);
  return [
    `Shade Fit Sets Pipeline - ${status}`,
    `Started: ${result.startedAt}`,
    `Finished: ${result.finishedAt}`,
    "",
    `Published (${result.published.length})`,
    lineList(published),
    "",
    `Drafts (${result.drafts.length})`,
    lineList(drafts),
    "",
    `Skipped (${result.skipped.length})`,
    lineList(result.skipped),
    "",
    `Failed (${result.failed.length})`,
    lineList(failed),
  ].join("\n");
}
