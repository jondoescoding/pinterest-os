export interface PriceBand {
  min: number;
  max: number;
}

export interface FitSlot {
  slot: string;
  queryVariants: string[];
  priceBand: PriceBand;
  required: boolean;
}

export interface FitTheme {
  name: string;
  slug: string;
  blurbTemplate: string;
  palette: string[];
  slots: FitSlot[];
}

export interface CandidateSetItem {
  slot: string;
  channel3ProductId: string;
  title: string;
  brand: string | null;
  price: number;
  currency: string;
  buyUrl: string;
  imageUrl: string;
  copy: string;
  position: number;
}

export interface CandidateSet {
  id: string;
  slug: string;
  themeSlug: string;
  title: string;
  blurb: string;
  productHash: string;
  items: CandidateSetItem[];
}

export interface SkipReason {
  code:
    | "required_slot_empty"
    | "set_too_small"
    | "duplicate_set"
    | "search_failed";
  message: string;
}

export type ComposeSetResult =
  | { ok: true; set: CandidateSet; skipped: string[] }
  | { ok: false; reason: SkipReason; skipped: string[] };

export interface PublishedSetResult {
  slug: string;
  title: string;
  pageUrl: string;
  pinId: string | null;
  scheduledAt: string;
  itemCount: number;
}

export interface FailedSetResult {
  title: string;
  reason: string;
}

export interface FitRunResult {
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  published: PublishedSetResult[];
  drafts: PublishedSetResult[];
  skipped: string[];
  failed: FailedSetResult[];
}
