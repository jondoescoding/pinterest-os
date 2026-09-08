"use client";

import type {
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventInput,
  EventSourceFunc,
  EventSourceFuncArg,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useRef, useState } from "react";

interface CalendarCampaign {
  id: string;
  name: string;
  boardName: string | null;
  boardIntegrationId: string | null;
  pinterestBoardId: string | null;
  status: string;
}

interface CalendarPost {
  id: string;
  title?: string;
  content?: string;
  publishDate?: string;
  state?: string;
  integration?: { id?: string; name?: string };
}

interface PostizCalendarGridProps {
  posts?: CalendarPost[];
  campaigns: CalendarCampaign[];
  title?: string;
  subtitle?: string;
  integrationId?: string | null;
}

interface ManualPostForm {
  campaignId: string;
  scheduledAt: string;
  title: string;
  description: string;
  imageUrl: string;
  destinationUrl: string;
}

const VIEW_OPTIONS = [
  { view: "timeGridDay", label: "Day" },
  { view: "timeGridWeek", label: "Week" },
  { view: "dayGridMonth", label: "Month" },
] as const;

function localInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function dateFromInput(value: string): string {
  return new Date(value).toISOString();
}

function plainText(value: string | undefined): string | undefined {
  return value
    ?.replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function postTitle(post: CalendarPost): string {
  return (
    plainText(post.title) ??
    plainText(post.content?.split(/\r?\n/)[0]) ??
    post.id ??
    "Scheduled post"
  );
}

function postToEvent(post: CalendarPost, index: number): EventInput | null {
  if (!post.publishDate) return null;
  return {
    id: post.id,
    title: postTitle(post),
    start: post.publishDate,
    classNames: [`calendar-event-tone-${index % 5}`],
    extendedProps: {
      content: plainText(post.content) ?? "",
      integrationName: post.integration?.name ?? "Pinterest",
      state: post.state ?? "scheduled",
    },
  };
}

function initialForm(campaigns: CalendarCampaign[]): ManualPostForm {
  const scheduledAt = new Date();
  scheduledAt.setMinutes(Math.ceil(scheduledAt.getMinutes() / 15) * 15, 0, 0);
  return {
    campaignId:
      campaigns.find((campaign) => campaign.status === "active")?.id ??
      campaigns[0]?.id ??
      "",
    scheduledAt: localInputValue(scheduledAt),
    title: "",
    description: "",
    imageUrl: "",
    destinationUrl: "",
  };
}

function eventContent(arg: EventContentArg) {
  return (
    <div className="calendar-event-card">
      <strong>{arg.event.title}</strong>
      <span>{arg.timeText}</span>
    </div>
  );
}

export default function PostizCalendarGrid({
  posts = [],
  campaigns,
  title = "Content Calendar",
  subtitle = "Pulled directly from Postiz scheduled posts.",
  integrationId = null,
}: PostizCalendarGridProps) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [currentTitle, setCurrentTitle] = useState("This week");
  const [activeView, setActiveView] = useState("timeGridWeek");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ManualPostForm>(() =>
    initialForm(campaigns),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<{
    title: string;
    time: string;
    board: string;
    content: string;
  } | null>(null);

  const loadEvents: EventSourceFunc = async ({
    startStr,
    endStr,
  }: EventSourceFuncArg) => {
    const params = new URLSearchParams({ start: startStr, end: endStr });
    const res = await fetch(`/api/calendar?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Calendar events could not be loaded");
    const data = (await res.json()) as { posts?: CalendarPost[] };
    return (data.posts ?? [])
      .filter(
        (post) => !integrationId || post.integration?.id === integrationId,
      )
      .map(postToEvent)
      .filter((event): event is EventInput => Boolean(event));
  };

  function calendarApi() {
    return calendarRef.current?.getApi();
  }

  function changeView(view: string) {
    calendarApi()?.changeView(view);
    setActiveView(view);
  }

  function moveCalendar(action: "prev" | "next" | "today") {
    const api = calendarApi();
    if (!api) return;
    api[action]();
    setCurrentTitle(api.view.title);
  }

  function datesChanged(arg: DatesSetArg) {
    setCurrentTitle(arg.view.title);
    setActiveView(arg.view.type);
  }

  function openManualPost(date?: Date) {
    setError(null);
    setSelectedPost(null);
    const next = initialForm(campaigns);
    setForm((current) => ({
      ...next,
      ...current,
      campaignId: current.campaignId || next.campaignId,
      scheduledAt: date ? localInputValue(date) : current.scheduledAt,
    }));
    setModalOpen(true);
  }

  function clickedDate(arg: DateClickArg) {
    const date = new Date(arg.date);
    if (arg.allDay) date.setHours(9, 0, 0, 0);
    openManualPost(date);
  }

  function clickedEvent(arg: EventClickArg) {
    setSelectedPost({
      title: arg.event.title,
      time: arg.event.start?.toLocaleString() ?? "Scheduled",
      board: String(arg.event.extendedProps.integrationName ?? "Pinterest"),
      content: String(arg.event.extendedProps.content ?? ""),
    });
  }

  function closeModal() {
    if (busy) return;
    setModalOpen(false);
    setError(null);
  }

  async function submitManualPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const contentRes = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: form.campaignId,
          title: form.title,
          description: form.description,
          imageUrl: form.imageUrl,
          destinationUrl: form.destinationUrl || null,
          state: "draft",
        }),
      });
      const contentData = (await contentRes.json().catch(() => null)) as {
        contentItem?: { id: string };
        error?: string;
      } | null;
      if (!contentRes.ok || !contentData?.contentItem?.id) {
        throw new Error(contentData?.error ?? "Could not create the post");
      }

      const scheduleRes = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: contentData.contentItem.id,
          scheduledAt: dateFromInput(form.scheduledAt),
        }),
      });
      const scheduleData = (await scheduleRes.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!scheduleRes.ok || !scheduleData?.ok) {
        throw new Error(scheduleData?.error ?? "Could not schedule the post");
      }

      setForm(initialForm(campaigns));
      setModalOpen(false);
      calendarApi()?.refetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="calendar-shell card">
        <div className="calendar-topbar">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>
        <div className="calendar-toolbar">
          <div className="calendar-date-block">
            <span>
              {new Date().toLocaleString(undefined, { month: "short" })}
            </span>
            <strong>{new Date().getDate()}</strong>
          </div>
          <div>
            <h3>{currentTitle}</h3>
            <p>Day, week, and month views for scheduled Pinterest posts.</p>
          </div>
          <div className="calendar-toolbar-actions">
            <button
              type="button"
              className="icon-button"
              onClick={() => moveCalendar("prev")}
              aria-label="Previous range"
            >
              <ChevronLeftIcon aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => moveCalendar("today")}
            >
              Today
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => moveCalendar("next")}
              aria-label="Next range"
            >
              <ChevronRightIcon aria-hidden="true" />
            </button>
            <div className="calendar-view-switch" aria-label="Calendar view">
              {VIEW_OPTIONS.map((option) => (
                <button
                  type="button"
                  className={activeView === option.view ? "active" : ""}
                  key={option.view}
                  onClick={() => changeView(option.view)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-accent"
              onClick={() => openManualPost()}
            >
              <PlusIcon aria-hidden="true" />
              Add post
            </button>
          </div>
        </div>

        <div className="calendar-grid-shell">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={false}
            allDaySlot={false}
            nowIndicator
            height="auto"
            slotMinTime="06:00:00"
            slotMaxTime="23:00:00"
            slotDuration="01:00:00"
            eventMinHeight={44}
            events={loadEvents}
            datesSet={datesChanged}
            dateClick={clickedDate}
            eventClick={clickedEvent}
            eventContent={eventContent}
            dayMaxEvents={3}
          />
        </div>
      </section>

      {selectedPost && (
        <div className="calendar-popover">
          <button
            type="button"
            className="icon-button"
            onClick={() => setSelectedPost(null)}
            aria-label="Close post details"
          >
            <XMarkIcon aria-hidden="true" />
          </button>
          <strong>{selectedPost.title}</strong>
          <span>{selectedPost.time}</span>
          <span>{selectedPost.board}</span>
          {selectedPost.content && <p>{selectedPost.content}</p>}
        </div>
      )}

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <dialog
            className="modal-panel calendar-modal"
            open
            aria-modal="true"
            aria-labelledby="manual-post-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2 id="manual-post-title">Schedule Pinterest post</h2>
                <p>Create one content item and schedule it through Postiz.</p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={closeModal}
                aria-label="Close"
                disabled={busy}
              >
                <XMarkIcon aria-hidden="true" />
              </button>
            </div>
            <form className="calendar-form" onSubmit={submitManualPost}>
              <label>
                <span>Pinterest board</span>
                <select
                  className="input"
                  value={form.campaignId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      campaignId: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select board</option>
                  {campaigns
                    .filter((campaign) => campaign.status === "active")
                    .map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.boardName ?? campaign.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <span>Publish time</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      scheduledAt: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                <span>Title</span>
                <input
                  className="input"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  maxLength={100}
                  required
                />
              </label>
              <label>
                <span>Image URL</span>
                <input
                  className="input"
                  type="url"
                  value={form.imageUrl}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      imageUrl: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                <span>Destination URL</span>
                <input
                  className="input"
                  type="url"
                  value={form.destinationUrl}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      destinationUrl: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  className="input textarea"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              {error && <p className="campaign-error">{error}</p>}
              <div className="calendar-form-actions">
                <button
                  className="btn"
                  type="button"
                  onClick={closeModal}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-accent"
                  type="submit"
                  disabled={busy || !form.campaignId}
                >
                  {busy ? "Scheduling..." : "Schedule post"}
                </button>
              </div>
            </form>
          </dialog>
        </div>
      )}
    </>
  );
}
