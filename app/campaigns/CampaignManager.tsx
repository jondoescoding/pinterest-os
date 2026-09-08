"use client";

import type { Campaign } from "@/lib/db/schema";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Board {
  id: string;
  name: string;
}

// Client island: owns the create form + per-row mutations, then refreshes the
// server component so the list re-reads from the DB (no client-side list state).
export default function CampaignManager({
  campaigns,
}: {
  campaigns: Campaign[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [boardId, setBoardId] = useState("");
  const [pinterestBoardId, setPinterestBoardId] = useState("");
  const [boards, setBoards] = useState<Board[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pinterest boards come from the Postiz channels endpoint, not the DB.
  useEffect(() => {
    let active = true;
    fetch("/api/postiz/channels")
      .then((r) => r.json())
      .then(
        (data: {
          channels?: {
            id: string;
            name: string | null;
            platform: string | null;
          }[];
        }) => {
          if (!active) return;
          const pinterest = (data.channels ?? [])
            .filter((c) => c.platform === "pinterest")
            .map((c) => ({ id: c.id, name: c.name ?? c.id }));
          setBoards(pinterest);
        },
      )
      .catch(() => {
        /* board picker stays empty; name-only campaigns still work */
      });
    return () => {
      active = false;
    };
  }, []);

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const board = boards.find((b) => b.id === boardId);
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          boardIntegrationId: board?.id ?? null,
          pinterestBoardId: pinterestBoardId || null,
          boardName: board?.name ?? null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Failed to create campaign");
      }
      setName("");
      setBoardId("");
      setPinterestBoardId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function mutate(
    id: string,
    init: RequestInit & { method: string },
  ): Promise<void> {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        headers: { "Content-Type": "application/json" },
        ...init,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Request failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const setStatus = (id: string, status: "active" | "archived") =>
    mutate(id, { method: "PATCH", body: JSON.stringify({ status }) });

  const remove = (id: string) => mutate(id, { method: "DELETE" });

  return (
    <div>
      <form className="card campaign-form" onSubmit={createCampaign}>
        <div className="campaign-form-fields">
          <input
            className="input"
            placeholder="Campaign name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Campaign name"
            required
          />
          <select
            className="input"
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            aria-label="Pinterest board"
          >
            <option value="">No board</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Pinterest board ID"
            value={pinterestBoardId}
            onChange={(e) => setPinterestBoardId(e.target.value)}
            aria-label="Pinterest board ID"
          />
          <button
            className="btn btn-accent"
            type="submit"
            disabled={busy || name.trim() === ""}
          >
            Create
          </button>
        </div>
        {error && <p className="campaign-error">{error}</p>}
      </form>

      {campaigns.length === 0 ? (
        <div className="placeholder">
          No campaigns yet — create one above to target a Pinterest board.
        </div>
      ) : (
        <div className="card-grid">
          {campaigns.map((c) => (
            <div className="card" key={c.id}>
              <div className="campaign-card-head">
                <span className="campaign-name">{c.name}</span>
                <span className={`pill ${c.status === "active" ? "ok" : ""}`}>
                  <span className="dot" />
                  {c.status}
                </span>
              </div>
              <p className="muted campaign-board">
                {c.boardName ?? "No board assigned"}
              </p>
              <p className="campaign-date">
                Pinterest board ID: {c.pinterestBoardId ?? "not set"}
              </p>
              <p className="campaign-date">
                {new Date(c.createdAt * 1000).toLocaleDateString()}
              </p>
              <div className="row campaign-actions">
                <Link className="btn btn-accent" href={`/campaigns/${c.id}`}>
                  Open
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
                {c.status === "active" ? (
                  <button
                    className="btn"
                    type="button"
                    onClick={() => setStatus(c.id, "archived")}
                    disabled={busy}
                  >
                    Archive
                  </button>
                ) : (
                  <button
                    className="btn"
                    type="button"
                    onClick={() => setStatus(c.id, "active")}
                    disabled={busy}
                  >
                    Unarchive
                  </button>
                )}
                <button
                  className="btn"
                  type="button"
                  onClick={() => remove(c.id)}
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
