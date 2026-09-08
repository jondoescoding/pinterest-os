export default function Loading() {
  return (
    <output className="skeleton-page" aria-label="Loading settings">
      <div className="page-head">
        <span className="skeleton-line title" />
        <span className="skeleton-line long" />
      </div>

      <section className="card settings-panel skeleton-card">
        <div className="settings-grid">
          {[0, 1, 2, 3].map((item) => (
            <div className="settings-field" key={item}>
              <span className="skeleton-line short" />
              <span className="input skeleton-input" />
            </div>
          ))}
          <div className="settings-field connected-targets">
            <span className="skeleton-line medium" />
            <div className="target-list">
              {[0, 1, 2].map((item) => (
                <span className="target-option skeleton-target" key={item} />
              ))}
            </div>
          </div>
        </div>
        <div className="settings-actions-panel">
          <span className="skeleton-button" />
          <span className="setup-actions skeleton-row" />
        </div>
      </section>
    </output>
  );
}
