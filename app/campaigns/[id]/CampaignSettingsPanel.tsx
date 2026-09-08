"use client";

import type { Campaign } from "@/lib/db/schema";
import type { AppSettings } from "@/lib/settings";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Board {
  id: string;
  name: string | null;
  platform: string | null;
  picture?: string | null;
  disabled?: boolean;
}

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

export default function CampaignSettingsPanel({
  campaign,
  globalSettings,
}: {
  campaign: Campaign;
  globalSettings: AppSettings;
}) {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [draft, setDraft] = useState({
    name: campaign.name,
    boardIntegrationId: campaign.boardIntegrationId ?? "",
    pinterestBoardId: campaign.pinterestBoardId ?? "",
    boardName: campaign.boardName ?? "",
    status: campaign.status,
  });
  const [busy, setBusy] = useState(false);
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
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const board = boards.find((item) => item.id === draft.boardIntegrationId);
    try {
      await requestJson<{ campaign: Campaign }>(
        `/api/campaigns/${campaign.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: draft.name,
            boardIntegrationId: draft.boardIntegrationId || null,
            pinterestBoardId: draft.pinterestBoardId || null,
            boardName: draft.boardName || board?.name || null,
            status: draft.status,
          }),
        },
      );
      setMessage("Campaign settings saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function selectBoard(id: string) {
    const board = boards.find((item) => item.id === id);
    setDraft((current) => ({
      ...current,
      boardIntegrationId: id,
      boardName: board?.name ?? current.boardName,
    }));
  }

  return (
    <div className="settings-stack">
      <section className="card settings-panel">
        <div className="card-title-row">
          <div>
            <h2>Campaign settings</h2>
            <p>Overrides for this campaign only.</p>
          </div>
        </div>
        <div className="settings-grid">
          <label>
            <span>Campaign name</span>
            <input
              className="input"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>Status</span>
            <select
              className="input"
              value={draft.status}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              <option value="active">active</option>
              <option value="archived">archived</option>
            </select>
          </label>
          <label>
            <span>Campaign Pinterest board</span>
            <select
              className="input"
              value={draft.boardIntegrationId}
              onChange={(event) => {
                const board = boards.find(
                  (item) => item.id === event.target.value,
                );
                setDraft((current) => ({
                  ...current,
                  boardIntegrationId: event.target.value,
                  boardName: board?.name ?? current.boardName,
                }));
              }}
            >
              <option value="">Use global default</option>
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name ?? board.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Campaign board name</span>
            <input
              className="input"
              value={draft.boardName}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  boardName: event.target.value,
                }))
              }
              placeholder={globalSettings.targetBoardName}
            />
          </label>
          <label>
            <span>Pinterest board ID</span>
            <input
              className="input"
              value={draft.pinterestBoardId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  pinterestBoardId: event.target.value,
                }))
              }
              placeholder={
                globalSettings.targetPinterestBoardId ?? "Use global default"
              }
            />
          </label>
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
                      board.id === draft.boardIntegrationId ? " selected" : ""
                    }`}
                    key={board.id}
                    type="button"
                    onClick={() => selectBoard(board.id)}
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
        <div className="studio-actions settings-actions">
          <button
            className="btn btn-accent"
            type="button"
            onClick={save}
            disabled={busy || draft.name.trim() === ""}
          >
            {busy ? "Saving..." : "Save campaign settings"}
          </button>
        </div>
        {message && <p className="studio-message">{message}</p>}
        {error && <p className="campaign-error">{error}</p>}
      </section>

      <section className="card inherited-settings">
        <div className="card-title-row">
          <div>
            <h2>Global defaults</h2>
            <p>Used when this campaign leaves a matching field empty.</p>
          </div>
        </div>
        <div className="dense-list">
          <div className="dense-row">
            <span>
              <strong>Destination URL</strong>
              <small>{globalSettings.defaultDestinationUrl}</small>
            </span>
          </div>
          <div className="dense-row">
            <span>
              <strong>Default image model</strong>
              <small>Configured in workspace settings</small>
            </span>
          </div>
          <div className="dense-row">
            <span>
              <strong>Target board</strong>
              <small>{globalSettings.targetBoardName}</small>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
