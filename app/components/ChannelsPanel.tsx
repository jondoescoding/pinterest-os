"use client";

import type { Channel } from "@/lib/postiz";
import { useCallback, useEffect, useState } from "react";

interface ChannelsState {
  loading: boolean;
  ok?: boolean;
  count?: number;
  channels?: Channel[];
  error?: string;
}

export default function ChannelsPanel() {
  const [state, setState] = useState<ChannelsState>({ loading: true });

  const load = useCallback(async () => {
    setState({ loading: true });
    try {
      const res = await fetch("/api/postiz/channels");
      const data = await res.json();
      setState({ loading: false, ...data });
    } catch (err) {
      setState({ loading: false, ok: false, error: String(err) });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.loading) {
    return <div className="card muted">Connecting to Postiz…</div>;
  }

  if (!state.ok) {
    return (
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="pill err">
            <span className="dot" /> Postiz error
          </span>
          <button type="button" className="btn" onClick={load}>
            Retry
          </button>
        </div>
        <p className="muted" style={{ marginTop: 12, wordBreak: "break-word" }}>
          {state.error}
        </p>
      </div>
    );
  }

  const channels = state.channels ?? [];
  return (
    <div>
      <div
        className="row"
        style={{ justifyContent: "space-between", marginBottom: 14 }}
      >
        <span className="pill ok">
          <span className="dot" /> Postiz connected
        </span>
        <span className="muted">
          {state.count} channel{state.count === 1 ? "" : "s"} ·{" "}
          <button
            type="button"
            className="btn"
            onClick={load}
            style={{ padding: "4px 10px" }}
          >
            Refresh
          </button>
        </span>
      </div>

      {channels.length === 0 ? (
        <div className="placeholder">
          Authenticated, but no channels are connected in Postiz yet.
        </div>
      ) : (
        <div className="card-grid">
          {channels.map((c) => (
            <div key={c.id} className="card channel">
              {c.picture ? (
                <img className="avatar" src={c.picture} alt="" />
              ) : (
                <span className="avatar">
                  {(c.platform ?? "?").slice(0, 2)}
                </span>
              )}
              <div className="meta">
                <span className="name">{c.name ?? "Untitled"}</span>
                <span className="plat">{c.platform ?? "unknown"}</span>
                <span className="code" style={{ marginTop: 4 }}>
                  {c.id}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
