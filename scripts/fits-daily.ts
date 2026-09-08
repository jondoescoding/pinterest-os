import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db/client";
import { loadLocalEnv } from "@/lib/env";
import { renderCollage } from "@/lib/fits/collage";
import { composeSet } from "@/lib/fits/composer";
import { hasProductHash, isProductRecentlyUsed } from "@/lib/fits/dedupe";
import { publishFitSetPin } from "@/lib/fits/publisher";
import { buildReport } from "@/lib/fits/report";
import { scheduledPinTimes } from "@/lib/fits/schedule";
import { insertDraftSet, markSetPublished } from "@/lib/fits/store";
import { GYM_GIRL_AESTHETIC_THEME } from "@/lib/fits/themes";
import type {
  FailedSetResult,
  FitRunResult,
  PublishedSetResult,
} from "@/lib/fits/types";
import { sendTelegramReport } from "@/lib/telegram";

loadLocalEnv();

interface Args {
  dryRun: boolean;
  count: number;
  date: string;
}

function localDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseArgs(argv: string[]): Args {
  const dryRun = argv.includes("--dry-run");
  const countArg = argv.find((arg) => arg.startsWith("--count="));
  const dateArg = argv.find((arg) => arg.startsWith("--date="));
  const count = countArg ? Number(countArg.split("=")[1]) : 3;
  return {
    dryRun,
    count: Math.max(1, Math.min(Number.isFinite(count) ? count : 3, 5)),
    date: dateArg?.split("=")[1] ?? localDate(),
  };
}

async function saveCollage(slug: string, collage: Buffer): Promise<string> {
  const dir = join(process.cwd(), "out", "fits");
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${slug}.jpg`);
  await writeFile(path, collage);
  return path;
}

function draftResult(
  set: { slug: string; title: string; items: unknown[] },
  scheduledAt: string,
): PublishedSetResult {
  return {
    slug: set.slug,
    title: set.title,
    pageUrl: `https://fits.shadewellness.shop/fits/${set.slug}`,
    pinId: null,
    scheduledAt,
    itemCount: set.items.length,
  };
}

function requireLiveEnv(): void {
  const required = ["POSTIZ_API_KEY", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing live-run env: ${missing.join(", ")}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dryRun) {
    requireLiveEnv();
  }
  const startedAt = new Date().toISOString();
  const run: FitRunResult = {
    dryRun: args.dryRun,
    startedAt,
    finishedAt: startedAt,
    published: [],
    drafts: [],
    skipped: [],
    failed: [],
  };
  const times = scheduledPinTimes(args.date, args.count);

  for (let index = 0; index < args.count; index += 1) {
    const title = `${GYM_GIRL_AESTHETIC_THEME.name} #${index + 1}`;
    try {
      const result = await composeSet({
        date: args.date,
        runIndex: index,
        theme: GYM_GIRL_AESTHETIC_THEME,
        deps: {
          isRecentlyUsed: (id) => isProductRecentlyUsed(db, id),
          hasProductHash: (hash) => hasProductHash(db, hash),
        },
      });
      run.skipped.push(...result.skipped);
      if (!result.ok) {
        run.skipped.push(`${title}: ${result.reason.message}`);
        continue;
      }

      const collage = await renderCollage(result.set.items, result.set.slug);
      await saveCollage(result.set.slug, collage);
      await insertDraftSet(db, result.set);
      const scheduledAt = times[index] ?? times[times.length - 1] ?? startedAt;
      if (args.dryRun) {
        run.drafts.push(draftResult(result.set, scheduledAt));
        continue;
      }

      const published = await publishFitSetPin({
        set: result.set,
        collage,
        scheduledAt,
      });
      await markSetPublished(db, result.set.id, {
        collageUrl: published.mediaUrl,
        pinId: published.pinId,
      });
      run.published.push({
        ...draftResult(result.set, scheduledAt),
        pageUrl: published.pageUrl,
        pinId: published.pinId,
      });
    } catch (err) {
      const failed: FailedSetResult = {
        title,
        reason: err instanceof Error ? err.message : String(err),
      };
      run.failed.push(failed);
    }
  }

  run.finishedAt = new Date().toISOString();
  const report = buildReport(run);
  console.log(report);
  if (!args.dryRun) {
    await sendTelegramReport(report);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
