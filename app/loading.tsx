export default function Loading() {
  return (
    <output className="skeleton-page" aria-label="Loading overview">
      <div className="page-head">
        <span className="skeleton-line title" />
        <span className="skeleton-line long" />
      </div>

      <div className="metric-grid">
        {[0, 1, 2, 3].map((item) => (
          <div className="metric-card skeleton-card" key={item}>
            <span className="skeleton-icon" />
            <span className="skeleton-line medium" />
            <strong className="skeleton-line metric" />
            <small className="skeleton-line long" />
          </div>
        ))}
      </div>

      <div className="overview-grid">
        <section className="card overview-card skeleton-card">
          <span className="skeleton-line medium" />
          <span className="skeleton-line long" />
          <div className="dense-list skeleton-list">
            {[0, 1, 2, 3].map((item) => (
              <span className="dense-row skeleton-row" key={item} />
            ))}
          </div>
        </section>
        <section className="card overview-card skeleton-card">
          <span className="skeleton-line medium" />
          <span className="skeleton-line long" />
          <div className="dense-list skeleton-list">
            {[0, 1, 2].map((item) => (
              <span className="dense-row skeleton-row" key={item} />
            ))}
          </div>
        </section>
      </div>
    </output>
  );
}
