const CALENDAR_CELLS = Array.from(
  { length: 35 },
  (_, item) => `calendar-cell-${item}`,
);

export default function Loading() {
  return (
    <output className="skeleton-page" aria-label="Loading calendar">
      <div className="page-head">
        <span className="skeleton-line title" />
        <span className="skeleton-line long" />
      </div>

      <section className="calendar-shell card">
        <div className="calendar-topbar">
          <div>
            <span className="skeleton-line medium" />
            <span className="skeleton-line long" />
          </div>
        </div>
        <div className="calendar-toolbar">
          <span className="calendar-date-block skeleton-date" />
          <div>
            <span className="skeleton-line medium" />
            <span className="skeleton-line long" />
          </div>
          <div className="calendar-toolbar-actions">
            {[0, 1, 2, 3].map((item) => (
              <span className="skeleton-button" key={item} />
            ))}
          </div>
        </div>
        <div className="calendar-grid-shell">
          <div className="skeleton-calendar-grid">
            {CALENDAR_CELLS.map((cell) => (
              <span className="skeleton-calendar-cell" key={cell} />
            ))}
          </div>
        </div>
      </section>
    </output>
  );
}
