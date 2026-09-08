"use client";

import type { ContentItemWithCampaign } from "@/lib/content";
import { CONTENT_STATES } from "@/lib/content-state";
import type { Schedule } from "@/lib/db/schema";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const FILTERS = ["all", ...CONTENT_STATES] as const;
type Filter = (typeof FILTERS)[number];

async function parseError(res: Response, fallback: string): Promise<Error> {
  const data = (await res.json().catch(() => null)) as {
    error?: string;
  } | null;
  return new Error(data?.error ?? fallback);
}

// Client island: owns the state filter + per-row delete, then refreshes the
// server component so the list re-reads from the DB (no client-side list state).
export default function LibraryView({
  items,
  schedules,
}: {
  items: ContentItemWithCampaign[];
  schedules: Schedule[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.state === filter)),
    [items, filter],
  );
  const scheduleByContent = useMemo(() => {
    const map = new Map<string, Schedule>();
    for (const schedule of schedules) {
      const current = map.get(schedule.contentId);
      if (!current || schedule.scheduledAt > current.scheduledAt) {
        map.set(schedule.contentId, schedule);
      }
    }
    return map;
  }, [schedules]);

  async function remove(id: string) {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw await parseError(res, "Failed to delete content");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function unschedule(id: string) {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw await parseError(res, "Failed to unschedule content");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="row library-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`btn ${filter === f ? "btn-accent" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <p className="campaign-error">{error}</p>}

      {visible.length === 0 ? (
        <div className="placeholder">
          {items.length === 0
            ? "No content yet — generate and save an item to see it here."
            : `No ${filter} content.`}
        </div>
      ) : (
        <div className="card-grid">
          {visible.map((item) => (
            <div className="card library-card" key={item.id}>
              {(() => {
                const schedule = scheduleByContent.get(item.id);
                return (
                  <>
                    {item.imageUrl ? (
                      <img
                        className="library-thumb"
                        src={item.imageUrl}
                        alt={item.title ?? "Content image"}
                      />
                    ) : (
                      <div className="library-thumb image-empty" />
                    )}
                    <div className="library-meta-stack">
                      <div className="campaign-card-head">
                        <span className="campaign-name">
                          {item.title ?? "Untitled"}
                        </span>
                        <span
                          className={`pill ${item.state === "posted" ? "ok" : ""} ${
                            item.state === "failed" ? "err" : ""
                          }`}
                        >
                          <span className="dot" />
                          {item.state}
                        </span>
                      </div>
                      {schedule && (
                        <div className="library-schedule">
                          <span
                            className={`pill ${
                              schedule.status === "scheduled" ? "ok" : ""
                            } ${schedule.status === "failed" ? "err" : ""}`}
                          >
                            <span className="dot" />
                            {schedule.status}
                          </span>
                          <span>
                            {new Date(
                              schedule.scheduledAt * 1000,
                            ).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
              {item.description && (
                <p className="muted library-desc">{item.description}</p>
              )}
              {item.destinationUrl && (
                <p className="campaign-board library-campaign">
                  <a href={item.destinationUrl}>{item.destinationUrl}</a>
                </p>
              )}
              <p className="campaign-board library-campaign">
                {item.campaignName ?? "No campaign"}
              </p>
              <p className="campaign-date">
                {new Date(item.createdAt * 1000).toLocaleDateString()}
              </p>
              <div className="row campaign-actions">
                {scheduleByContent.get(item.id) && (
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      const schedule = scheduleByContent.get(item.id);
                      if (schedule) void unschedule(schedule.id);
                    }}
                    disabled={busy}
                  >
                    Unschedule
                  </button>
                )}
                <button
                  className="btn"
                  type="button"
                  onClick={() => remove(item.id)}
                  disabled={busy}
                >
                  Delete content
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
