export default function Loading() {
  return (
    <output className="skeleton-page" aria-label="Loading campaign workspace">
      <div className="campaign-workspace-head">
        <div>
          <span className="skeleton-line short" />
          <span className="skeleton-line title" />
          <span className="skeleton-line long" />
        </div>
        <span className="skeleton-pill" />
      </div>

      <nav className="workspace-tabs" aria-label="Loading tabs">
        {[0, 1, 2, 3, 4].map((item) => (
          <span className="workspace-tab skeleton-tab" key={item} />
        ))}
      </nav>

      <div className="metric-grid">
        {[0, 1, 2, 3].map((item) => (
          <div className="metric-card skeleton-card" key={item}>
            <span className="skeleton-line medium" />
            <strong className="skeleton-line metric" />
            <small className="skeleton-line long" />
          </div>
        ))}
      </div>
    </output>
  );
}
