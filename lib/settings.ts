import { db } from "@/lib/db/client";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const ALLOWED_PLATFORMS = ["pinterest", "tiktok"] as const;
export const DEFAULT_DESTINATION_URL = "https://dim0k2-iy.myshopify.com/";
export const DEFAULT_FAL_MODEL =
  "fal-ai/bytedance/seedream/v5/lite/text-to-image";
export const TARGET_BOARD_NAME = "gym girl aesthetic";

export interface AppSettings {
  defaultDestinationUrl: string;
  defaultFalModel: string;
  targetBoardIntegrationId: string | null;
  targetPinterestBoardId: string | null;
  targetBoardName: string;
  allowedPlatforms: typeof ALLOWED_PLATFORMS;
}

type SettingKey =
  | "defaultDestinationUrl"
  | "defaultFalModel"
  | "targetBoardIntegrationId"
  | "targetPinterestBoardId"
  | "targetBoardName";

const DEFAULTS: Record<SettingKey, string | null> = {
  defaultDestinationUrl: DEFAULT_DESTINATION_URL,
  defaultFalModel: DEFAULT_FAL_MODEL,
  targetBoardIntegrationId: null,
  targetPinterestBoardId: null,
  targetBoardName: TARGET_BOARD_NAME,
};

export async function getSetting(key: SettingKey): Promise<string | null> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);
  return rows[0]?.value ?? DEFAULTS[key];
}

export async function setSetting(
  key: SettingKey,
  value: string | null,
): Promise<void> {
  await db
    .insert(appSettings)
    .values({
      key,
      value,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: Math.floor(Date.now() / 1000) },
    });
}

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.select().from(appSettings);
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const read = (key: SettingKey) => values.get(key) ?? DEFAULTS[key];

  return {
    defaultDestinationUrl: read("defaultDestinationUrl") ?? "",
    defaultFalModel: read("defaultFalModel") ?? DEFAULT_FAL_MODEL,
    targetBoardIntegrationId: read("targetBoardIntegrationId"),
    targetPinterestBoardId: read("targetPinterestBoardId"),
    targetBoardName: read("targetBoardName") ?? TARGET_BOARD_NAME,
    allowedPlatforms: ALLOWED_PLATFORMS,
  };
}

export async function updateSettings(
  patch: Partial<Record<SettingKey, string | null>>,
): Promise<AppSettings> {
  for (const [key, value] of Object.entries(patch) as [
    SettingKey,
    string | null | undefined,
  ][]) {
    if (value !== undefined) {
      await setSetting(key, value === "" ? null : value);
    }
  }
  return getSettings();
}
