"use client";

import type { AppSettings } from "@/lib/settings";
import {
  ArrowPathIcon,
  CpuChipIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import ScrollArea from "../components/ScrollArea";

interface Board {
  id: string;
  name: string | null;
  platform: string | null;
  picture?: string | null;
  disabled?: boolean;
}

interface FalModel {
  id: string;
  title: string;
  description: string | null;
  category: string;
  thumbnailUrl: string | null;
}

const MODEL_PAGE_SIZES = [6, 12, 24] as const;

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
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

export default function SettingsPanel({
  initialSettings,
}: {
  initialSettings: AppSettings;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [boards, setBoards] = useState<Board[]>([]);
  const [models, setModels] = useState<FalModel[]>([]);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [modelCategory, setModelCategory] = useState("all");
  const [modelPageSize, setModelPageSize] = useState<number>(
    MODEL_PAGE_SIZES[1],
  );
  const [modelPage, setModelPage] = useState(1);
  const [manualBoardIdOpen, setManualBoardIdOpen] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/postiz/channels")
      .then((res) => res.json())
      .then((data: { channels?: Board[] }) => {
        if (!active) return;
        setBoards(
          (data.channels ?? []).filter(
            (channel) => channel.platform === "pinterest",
          ),
        );
      })
      .catch(() => {
        if (active) setBoards([]);
      });

    fetch("/api/fal/models")
      .then((res) => res.json())
      .then((data: { models?: FalModel[] }) => {
        if (!active) return;
        setModels(data.models ?? []);
      })
      .catch(() => {
        if (active) setModels([]);
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedModel = models.find(
    (model) => model.id === settings.defaultFalModel,
  );
  const selectedBoard = boards.find(
    (board) => board.id === settings.targetBoardIntegrationId,
  );
  const modelCategories = Array.from(
    new Set(models.map((model) => model.category).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const normalizedModelSearch = modelSearch.trim().toLowerCase();
  const filteredModels = models.filter((model) => {
    const categoryMatches =
      modelCategory === "all" || model.category === modelCategory;
    if (!categoryMatches) return false;
    if (!normalizedModelSearch) return true;
    return [model.title, model.id].some((value) =>
      value.toLowerCase().includes(normalizedModelSearch),
    );
  });
  const totalModelPages = Math.max(
    1,
    Math.ceil(filteredModels.length / modelPageSize),
  );
  const currentModelPage = Math.min(modelPage, totalModelPages);
  const visibleModels = filteredModels.slice(
    (currentModelPage - 1) * modelPageSize,
    currentModelPage * modelPageSize,
  );
  const modelRangeStart =
    filteredModels.length === 0
      ? 0
      : (currentModelPage - 1) * modelPageSize + 1;
  const modelRangeEnd = Math.min(
    currentModelPage * modelPageSize,
    filteredModels.length,
  );

  async function save() {
    setBusy("save");
    setError(null);
    setMessage(null);
    try {
      const data = await requestJson<{ settings: AppSettings }>(
        "/api/settings",
        {
          method: "PATCH",
          body: JSON.stringify({
            defaultDestinationUrl: settings.defaultDestinationUrl,
            defaultFalModel: settings.defaultFalModel,
            targetBoardIntegrationId: settings.targetBoardIntegrationId,
            targetPinterestBoardId: settings.targetPinterestBoardId,
            targetBoardName: settings.targetBoardName,
          }),
        },
      );
      setSettings(data.settings);
      setMessage("Settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  function selectPinterestTarget(id: string) {
    const board = boards.find((item) => item.id === id);
    setSettings((current) => ({
      ...current,
      targetBoardIntegrationId: id || null,
      targetBoardName: board?.name ?? current.targetBoardName,
    }));
  }

  async function resolveBoard() {
    setBusy("board");
    setError(null);
    setMessage(null);
    try {
      const data = await requestJson<{
        integration: Board | null;
        board: {
          id: string;
          name: string;
          integrationId: string | null;
        } | null;
        boardIdConfigured: boolean;
        targetName: string;
      }>("/api/postiz/target-board");
      if (!data.integration) {
        throw new Error("No Pinterest integration found in Postiz");
      }
      setSettings((current) => ({
        ...current,
        targetBoardIntegrationId: data.integration?.id ?? null,
        targetPinterestBoardId:
          data.board?.id ?? current.targetPinterestBoardId,
        targetBoardName: data.board?.name ?? data.targetName,
      }));
      setMessage(
        data.boardIdConfigured
          ? `Resolved Pinterest integration and board: ${data.board?.name}`
          : `Resolved Pinterest integration: ${data.integration.name ?? data.integration.id}. Add the board ID for "${data.targetName}" before scheduling.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card settings-panel">
      <div className="settings-grid">
        <label>
          <span>Default destination URL</span>
          <input
            className="input"
            value={settings.defaultDestinationUrl}
            onChange={(e) =>
              setSettings((current) => ({
                ...current,
                defaultDestinationUrl: e.target.value,
              }))
            }
            placeholder="Optional URL for Pinterest pins"
          />
        </label>
        <div className="settings-field">
          <span>Default image model</span>
          <button
            className="model-picker-trigger"
            type="button"
            onClick={() => setModelPickerOpen(true)}
          >
            <CpuChipIcon aria-hidden="true" />
            <span>
              <strong>
                {selectedModel?.title ?? "Configured image model"}
              </strong>
            </span>
          </button>
        </div>
        <label>
          <span>Default Pinterest target</span>
          <select
            className="input"
            value={settings.targetBoardIntegrationId ?? ""}
            onChange={(e) => selectPinterestTarget(e.target.value)}
          >
            <option value="">Choose a connected Pinterest target</option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name ?? board.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Pinterest board</span>
          <select
            className="input"
            value={settings.targetBoardName}
            onChange={(e) =>
              setSettings((current) => ({
                ...current,
                targetBoardName: e.target.value,
              }))
            }
          >
            <option value={settings.targetBoardName}>
              {settings.targetBoardName}
              {settings.targetPinterestBoardId
                ? ` - ${settings.targetPinterestBoardId}`
                : ""}
            </option>
            {boards
              .filter(
                (board) =>
                  board.name && board.name !== settings.targetBoardName,
              )
              .map((board) => (
                <option key={board.id} value={board.name ?? board.id}>
                  {board.name ?? board.id} - Postiz target
                </option>
              ))}
          </select>
        </label>
        <div className="settings-field target-summary">
          <span className="settings-label">Resolved scheduling target</span>
          <div className="target-card">
            <strong>{settings.targetBoardName}</strong>
            <small>
              {settings.targetPinterestBoardId
                ? `Pinterest board ID ${settings.targetPinterestBoardId}`
                : "No Pinterest board ID saved yet"}
            </small>
            <small>
              {selectedBoard?.name
                ? `Postiz target ${selectedBoard.name}`
                : "Choose a Postiz target before scheduling"}
            </small>
          </div>
          <button
            className="inline-link"
            type="button"
            onClick={() => setManualBoardIdOpen((open) => !open)}
          >
            {manualBoardIdOpen ? "Hide manual ID" : "Edit board ID manually"}
          </button>
          {manualBoardIdOpen && (
            <input
              className="input"
              value={settings.targetPinterestBoardId ?? ""}
              onChange={(e) =>
                setSettings((current) => ({
                  ...current,
                  targetPinterestBoardId: e.target.value || null,
                }))
              }
              placeholder="Pinterest board ID"
            />
          )}
        </div>
        <div>
          <span className="settings-label">Allowed platforms</span>
          <div className="row settings-platforms">
            {settings.allowedPlatforms.map((platform) => (
              <span className="pill ok" key={platform}>
                <span className="dot" />
                {platform}
              </span>
            ))}
          </div>
        </div>
        <div className="settings-field connected-targets">
          <span className="settings-label">Connected Pinterest boards</span>
          <div className="target-list">
            {boards.length === 0 ? (
              <span className="target-empty">
                No Pinterest boards connected.
              </span>
            ) : (
              boards.map((board) => (
                <button
                  className={`target-option${
                    board.id === settings.targetBoardIntegrationId
                      ? " selected"
                      : ""
                  }`}
                  key={board.id}
                  type="button"
                  onClick={() => selectPinterestTarget(board.id)}
                >
                  {board.picture ? <img src={board.picture} alt="" /> : null}
                  <span>
                    <strong>{board.name ?? board.id}</strong>
                    <small>{board.id}</small>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="settings-actions-panel">
        <button
          className="btn btn-accent"
          type="button"
          onClick={save}
          disabled={Boolean(busy)}
        >
          {busy === "save" ? "Saving..." : "Save settings"}
        </button>
        <div className="setup-actions">
          <div>
            <strong>Postiz connection</strong>
            <span>Refresh the connected Pinterest targets from Postiz.</span>
          </div>
          <button
            className="btn"
            type="button"
            onClick={resolveBoard}
            disabled={Boolean(busy)}
          >
            <ArrowPathIcon aria-hidden="true" />
            {busy === "board" ? "Syncing..." : "Sync Pinterest target"}
          </button>
        </div>
      </div>
      {message && <p className="studio-message">{message}</p>}
      {error && <p className="campaign-error">{error}</p>}
      {modelPickerOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setModelPickerOpen(false)}
        >
          <dialog
            className="modal-panel model-modal"
            open
            aria-modal="true"
            aria-labelledby="image-model-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2 id="image-model-title">Choose image model</h2>
                <p>
                  Approved text-to-image models available to this workspace.
                </p>
              </div>
              <button
                className="icon-btn"
                type="button"
                onClick={() => setModelPickerOpen(false)}
                aria-label="Close model picker"
              >
                <XMarkIcon aria-hidden="true" />
              </button>
            </div>
            <div className="model-picker-controls">
              <label className="field">
                <span>Search by name</span>
                <input
                  className="input"
                  value={modelSearch}
                  onChange={(event) => {
                    setModelSearch(event.target.value);
                    setModelPage(1);
                  }}
                  placeholder="Model name"
                />
              </label>
              <label className="field">
                <span>Filter</span>
                <select
                  className="input"
                  value={modelCategory}
                  onChange={(event) => {
                    setModelCategory(event.target.value);
                    setModelPage(1);
                  }}
                >
                  <option value="all">All categories</option>
                  {modelCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Models per page</span>
                <select
                  className="input"
                  value={modelPageSize}
                  onChange={(event) => {
                    setModelPageSize(Number(event.target.value));
                    setModelPage(1);
                  }}
                >
                  {MODEL_PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <ScrollArea className="model-list" cueSize="tight">
              {catalogLoading && (
                <div className="modal-empty">Loading image models...</div>
              )}
              {!models.some(
                (model) => model.id === settings.defaultFalModel,
              ) && (
                <button
                  className="model-option selected"
                  type="button"
                  onClick={() => setModelPickerOpen(false)}
                >
                  <span className="model-thumb">
                    <CpuChipIcon aria-hidden="true" />
                  </span>
                  <span>
                    <strong>Configured image model</strong>
                  </span>
                </button>
              )}
              {!catalogLoading && models.length === 0 && (
                <div className="modal-empty">
                  Could not load the image model catalog. The saved model is
                  still available.
                </div>
              )}
              {!catalogLoading &&
                models.length > 0 &&
                visibleModels.length === 0 && (
                  <div className="modal-empty">
                    No models match the current search and filter.
                  </div>
                )}
              {visibleModels.map((model) => (
                <button
                  className={`model-option${
                    model.id === settings.defaultFalModel ? " selected" : ""
                  }`}
                  key={model.id}
                  type="button"
                  onClick={() => {
                    setSettings((current) => ({
                      ...current,
                      defaultFalModel: model.id,
                    }));
                    setModelPickerOpen(false);
                  }}
                >
                  {model.thumbnailUrl ? (
                    <img src={model.thumbnailUrl} alt="" />
                  ) : (
                    <span className="model-thumb">
                      <CpuChipIcon aria-hidden="true" />
                    </span>
                  )}
                  <span>
                    <strong>{model.title}</strong>
                    {model.description && <em>{model.description}</em>}
                  </span>
                </button>
              ))}
            </ScrollArea>
            <div className="model-pagination">
              <span>
                Showing {modelRangeStart}-{modelRangeEnd} of{" "}
                {filteredModels.length}
              </span>
              <div className="model-pagination-actions">
                <button
                  className="btn"
                  type="button"
                  onClick={() => setModelPage((page) => Math.max(1, page - 1))}
                  disabled={currentModelPage === 1}
                >
                  Previous
                </button>
                <span>
                  Page {currentModelPage} of {totalModelPages}
                </span>
                <button
                  className="btn"
                  type="button"
                  onClick={() =>
                    setModelPage((page) => Math.min(totalModelPages, page + 1))
                  }
                  disabled={currentModelPage === totalModelPages}
                >
                  Next
                </button>
              </div>
            </div>
          </dialog>
        </div>
      )}
    </section>
  );
}
