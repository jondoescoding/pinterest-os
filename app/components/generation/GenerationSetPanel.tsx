"use client";

import type { Campaign, GenerationSet } from "@/lib/db/schema";
import { type ScheduleUnit, buildSchedulePlan } from "@/lib/schedule-plan";
import type { AppSettings } from "@/lib/settings";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  CpuChipIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface FalModel {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
}

interface GenerationItem {
  key: string;
  title: string;
  description: string;
  prompt: string;
}

interface GenerationSetPanelProps {
  campaigns: Campaign[];
  settings: AppSettings;
  initialSet?: GenerationSet | null;
  defaultCampaignId?: string | null;
  showCampaignPicker?: boolean;
}

function parseItems(value?: string): GenerationItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      const row =
        typeof item === "object" && item !== null
          ? (item as Record<string, unknown>)
          : {};
      return {
        key: crypto.randomUUID(),
        title: typeof row.title === "string" ? row.title : "",
        description: typeof row.description === "string" ? row.description : "",
        prompt: typeof row.prompt === "string" ? row.prompt : "",
      };
    });
  } catch {
    return [];
  }
}

function toDatetimeLocal(ms: number): string {
  const date = new Date(ms);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string): number | null {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = (await res.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  if (!data) throw new Error("Empty response");
  return data;
}

function emptyItem(): GenerationItem {
  return { key: crypto.randomUUID(), title: "", description: "", prompt: "" };
}

export default function GenerationSetPanel({
  campaigns,
  settings,
  initialSet,
  defaultCampaignId = null,
  showCampaignPicker = true,
}: GenerationSetPanelProps) {
  const router = useRouter();
  const initialCampaignId =
    initialSet?.campaignId ?? defaultCampaignId ?? campaigns[0]?.id ?? "";
  const [setId, setSetId] = useState(initialSet?.id ?? null);
  const [name, setName] = useState(initialSet?.name ?? "New generation set");
  const [campaignId, setCampaignId] = useState(initialCampaignId);
  const [falModel, setFalModel] = useState(
    initialSet?.falModel ?? settings.defaultFalModel,
  );
  const [destinationUrl, setDestinationUrl] = useState(
    initialSet?.destinationUrl ?? settings.defaultDestinationUrl,
  );
  const [scheduleStart, setScheduleStart] = useState(
    toDatetimeLocal((initialSet?.scheduleStart ?? Date.now() / 1000) * 1000),
  );
  const [scheduleInterval, setScheduleInterval] = useState(
    initialSet?.scheduleInterval ?? 1,
  );
  const [scheduleUnit, setScheduleUnit] = useState<ScheduleUnit>(
    initialSet?.scheduleUnit === "minutes" ||
      initialSet?.scheduleUnit === "hours" ||
      initialSet?.scheduleUnit === "days"
      ? initialSet.scheduleUnit
      : "days",
  );
  const [scheduleAfterSave, setScheduleAfterSave] = useState(
    initialSet?.scheduleAfterSave ?? false,
  );
  const [items, setItems] = useState<GenerationItem[]>(() => {
    const parsed = parseItems(initialSet?.itemsJson);
    return parsed.length ? parsed : [emptyItem()];
  });
  const [models, setModels] = useState<FalModel[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/fal/models")
      .then((res) => res.json())
      .then((modelResult) => {
        if (!active) return;
        setModels(modelResult.models ?? []);
      })
      .catch(() => {
        if (active) setModels([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedCampaign = campaigns.find(
    (campaign) => campaign.id === campaignId,
  );
  const serializableItems = items.map(({ title, description, prompt }) => ({
    title,
    description,
    prompt,
  }));
  const validItems = items.filter(
    (item) =>
      item.title.trim() && item.description.trim() && item.prompt.trim(),
  );
  const startMs = fromDatetimeLocal(scheduleStart) ?? Date.now();
  const previewSlots = useMemo(
    () =>
      buildSchedulePlan({
        startMs,
        interval: scheduleInterval,
        unit: scheduleUnit,
        count: Math.min(Math.max(validItems.length, 1), 5),
      }),
    [startMs, scheduleInterval, scheduleUnit, validItems.length],
  );

  function updateItem(
    index: number,
    field: keyof GenerationItem,
    value: string,
  ) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  async function persistPreset(): Promise<GenerationSet> {
    const payload = {
      campaignId: campaignId || null,
      name,
      falModel,
      destinationUrl: destinationUrl || null,
      scheduleStart: Math.floor(startMs / 1000),
      scheduleInterval,
      scheduleUnit,
      scheduleAfterSave,
      items: serializableItems,
    };
    const data = setId
      ? await jsonRequest<{ generationSet: GenerationSet }>(
          `/api/generation-sets/${setId}`,
          { method: "PATCH", body: JSON.stringify(payload) },
        )
      : await jsonRequest<{ generationSet: GenerationSet }>(
          "/api/generation-sets",
          { method: "POST", body: JSON.stringify(payload) },
        );
    setSetId(data.generationSet.id);
    return data.generationSet;
  }

  async function savePreset() {
    if (busy) return;
    setBusy("save");
    setError(null);
    setMessage(null);
    try {
      await persistPreset();
      setMessage("Generation set saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="generation-panel card">
      <div className="generation-panel-head">
        <div>
          <span className="eyebrow">Reusable generation set</span>
          <label className="generation-name-label">
            <span className="sr-only">Generation set name</span>
            <input
              className="generation-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        </div>
        <span className="status-pill">
          <SparklesIcon aria-hidden="true" />
          {setId ? "Saved preset" : "Unsaved preset"}
        </span>
      </div>

      <div className="generation-layout">
        <div className="generation-main">
          <div className="generation-section">
            <div className="generation-section-head">
              <SparklesIcon aria-hidden="true" />
              <div>
                <h2>Source</h2>
                <p>Destination and campaign binding.</p>
              </div>
            </div>
            <div className="control-grid two">
              {showCampaignPicker && (
                <label className="field">
                  <span>Campaign</span>
                  <select
                    className="input"
                    value={campaignId}
                    onChange={(event) => {
                      const nextCampaignId = event.target.value;
                      setCampaignId(nextCampaignId);
                    }}
                  >
                    <option value="">No campaign</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="field">
                <span>Destination URL</span>
                <input
                  className="input"
                  value={destinationUrl}
                  onChange={(event) => setDestinationUrl(event.target.value)}
                  placeholder="https://..."
                />
              </label>
            </div>
          </div>

          <div className="generation-section">
            <div className="generation-section-head">
              <CpuChipIcon aria-hidden="true" />
              <div>
                <h2>Image model</h2>
                <p>Approved text-to-image models, with a saved fallback.</p>
              </div>
            </div>
            <label className="field">
              <span>Text-to-image model</span>
              <select
                className="input model-select"
                value={falModel}
                onChange={(event) => setFalModel(event.target.value)}
              >
                {!models.some((model) => model.id === falModel) && (
                  <option value={falModel}>Configured image model</option>
                )}
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="generation-section">
            <div className="generation-section-head">
              <CalendarDaysIcon aria-hidden="true" />
              <div>
                <h2>Batch schedule</h2>
                <p>
                  Fill the next slot from the start time using the selected
                  cadence.
                </p>
              </div>
            </div>
            <div className="control-grid schedule-grid">
              <label className="field">
                <span>Start</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={scheduleStart}
                  onChange={(event) => setScheduleStart(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Every</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={scheduleInterval}
                  onChange={(event) =>
                    setScheduleInterval(Number(event.target.value))
                  }
                />
              </label>
              <label className="field">
                <span>Cadence</span>
                <select
                  className="input"
                  value={scheduleUnit}
                  onChange={(event) =>
                    setScheduleUnit(event.target.value as ScheduleUnit)
                  }
                >
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                  <option value="days">days</option>
                </select>
              </label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={scheduleAfterSave}
                  onChange={(event) =>
                    setScheduleAfterSave(event.target.checked)
                  }
                />
                <span>Schedule after saving</span>
              </label>
            </div>
          </div>

          <div className="generation-section">
            <div className="generation-section-head">
              <SparklesIcon aria-hidden="true" />
              <div>
                <h2>Items</h2>
                <p>
                  Each row becomes one generated image and one saved content
                  item.
                </p>
              </div>
            </div>
            <div className="generation-items">
              {items.map((item, index) => (
                <article className="generation-item" key={item.key}>
                  <div className="generation-item-head">
                    <span>Item {index + 1}</span>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove item ${index + 1}`}
                      onClick={() =>
                        setItems((current) =>
                          current.length === 1
                            ? [emptyItem()]
                            : current.filter(
                                (_item, itemIndex) => itemIndex !== index,
                              ),
                        )
                      }
                    >
                      <TrashIcon aria-hidden="true" />
                    </button>
                  </div>
                  <div className="control-grid two">
                    <label className="field">
                      <span>Title</span>
                      <input
                        className="input"
                        value={item.title}
                        onChange={(event) =>
                          updateItem(index, "title", event.target.value)
                        }
                        placeholder="Pinterest title"
                      />
                    </label>
                    <label className="field">
                      <span>Description</span>
                      <input
                        className="input"
                        value={item.description}
                        onChange={(event) =>
                          updateItem(index, "description", event.target.value)
                        }
                        placeholder="Finished pin description"
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>Image prompt</span>
                    <textarea
                      className="input textarea generation-prompt"
                      value={item.prompt}
                      onChange={(event) =>
                        updateItem(index, "prompt", event.target.value)
                      }
                      placeholder="Describe the image to generate."
                    />
                  </label>
                </article>
              ))}
            </div>
            <button
              type="button"
              className="btn ghost-btn"
              onClick={() => setItems((current) => [...current, emptyItem()])}
            >
              <PlusIcon aria-hidden="true" />
              Add item
            </button>
          </div>
        </div>

        <aside className="generation-side">
          <div className="generation-side-card">
            <span className="eyebrow">Next slots</span>
            <div className="slot-list">
              {previewSlots.map((slot, index) => (
                <div className="slot-row" key={slot}>
                  <span>{index + 1}</span>
                  <strong>{new Date(slot).toLocaleDateString()}</strong>
                  <small>{new Date(slot).toLocaleTimeString()}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="generation-side-card">
            <span className="eyebrow">Readiness</span>
            <div className="readiness-list">
              <span className={campaignId ? "ready" : ""}>
                <CheckCircleIcon aria-hidden="true" />
                Campaign selected
              </span>
              <span className={falModel ? "ready" : ""}>
                <CheckCircleIcon aria-hidden="true" />
                Image model selected
              </span>
              <span className={validItems.length > 0 ? "ready" : ""}>
                <CheckCircleIcon aria-hidden="true" />
                {validItems.length} complete item
                {validItems.length === 1 ? "" : "s"}
              </span>
              <span
                className={
                  !scheduleAfterSave ||
                  (selectedCampaign?.boardIntegrationId &&
                    selectedCampaign.pinterestBoardId)
                    ? "ready"
                    : ""
                }
              >
                <CheckCircleIcon aria-hidden="true" />
                Scheduling target ready
              </span>
            </div>
          </div>
          <div className="generation-actions">
            <button
              type="button"
              className="btn"
              onClick={savePreset}
              disabled={busy !== null || !name.trim()}
            >
              {busy === "save" ? (
                <ArrowPathIcon className="spin" aria-hidden="true" />
              ) : (
                <CheckCircleIcon aria-hidden="true" />
              )}
              Save preset
            </button>
          </div>
          {message && <p className="studio-message">{message}</p>}
          {error && <p className="campaign-error">{error}</p>}
        </aside>
      </div>
    </section>
  );
}
