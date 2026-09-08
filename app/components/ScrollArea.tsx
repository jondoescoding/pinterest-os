"use client";

import { type ReactNode, useCallback, useEffect, useRef } from "react";

/** Cue band sizes from the scrolling-list guide. */
const CUE = { comfortable: 60, tight: 32 } as const;

interface ScrollAreaProps {
  children: ReactNode;
  /** Extra classes (e.g. layout/padding). `scroll-area` is always applied. */
  className?: string;
  /** Edge-fade band: comfortable (60px, default) or tight (32px, dense lists). */
  cueSize?: keyof typeof CUE;
}

/**
 * Scrollable region with gradient edge-fade cues. The fade only appears on an
 * edge that has hidden content, signalling "there's more" — the core fix for
 * "a clipped list looks finished" on platforms with hidden scrollbars.
 *
 * Faithful to useScrollEdges: tracks scroll position, resizes, and content
 * changes. The fade is driven via CSS custom properties consumed by
 * `.scroll-area` in globals.css.
 */
export default function ScrollArea({
  children,
  className,
  cueSize = "comfortable",
}: ScrollAreaProps) {
  const ref = useRef<HTMLDivElement>(null);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const cue = CUE[cueSize];
    const top = Math.min(el.scrollTop, cue);
    const bottom = Math.min(
      el.scrollHeight - el.clientHeight - el.scrollTop,
      cue,
    );
    el.style.setProperty("--fade-top", `${top}px`);
    el.style.setProperty("--fade-bottom", `${Math.max(bottom, 0)}px`);
  }, [cueSize]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [update]);

  return (
    <div
      ref={ref}
      className={className ? `scroll-area ${className}` : "scroll-area"}
      onScroll={update}
    >
      {children}
    </div>
  );
}
