import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadLocalEnv } from "@/lib/env";
import { renderCollage } from "@/lib/fits/collage";
import { composeSet } from "@/lib/fits/composer";
import { GYM_GIRL_AESTHETIC_THEME } from "@/lib/fits/themes";

loadLocalEnv();

function localDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function main(): Promise<void> {
  const date =
    process.argv
      .slice(2)
      .find((arg) => arg.startsWith("--date="))
      ?.split("=")[1] ?? localDate();
  const countArg = process.argv
    .slice(2)
    .find((arg) => arg.startsWith("--count="));
  const count = Math.max(
    1,
    Math.min(countArg ? Number(countArg.split("=")[1]) : 3, 5),
  );
  const dir = join(process.cwd(), "out", "fits-samples");
  await mkdir(dir, { recursive: true });

  for (let index = 0; index < count; index += 1) {
    const result = await composeSet({
      date,
      runIndex: index,
      theme: GYM_GIRL_AESTHETIC_THEME,
    });
    if (!result.ok) {
      console.log(`Skipped sample ${index + 1}: ${result.reason.message}`);
      continue;
    }
    const collage = await renderCollage(result.set.items, result.set.slug);
    const path = join(dir, `${result.set.slug}.jpg`);
    await writeFile(path, collage);
    console.log(path);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
