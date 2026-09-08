export default function Loading() {
  return (
    <output className="skeleton-page" aria-label="Loading campaigns">
      <div className="page-head">
        <span className="skeleton-line title" />
        <span className="skeleton-line long" />
      </div>

      <div className="card campaign-form">
        <div className="campaign-form-fields">
          <span className="input skeleton-input" />
          <span className="input skeleton-input" />
          <span className="input skeleton-input" />
          <span className="skeleton-button" />
        </div>
      </div>

      <div className="card-grid">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div className="card skeleton-card" key={item}>
            <div className="campaign-card-head">
              <span className="skeleton-line medium" />
              <span className="skeleton-pill" />
            </div>
            <span className="skeleton-line long" />
            <span className="skeleton-line medium" />
            <div className="row campaign-actions">
              <span className="skeleton-button" />
              <span className="skeleton-button" />
            </div>
          </div>
        ))}
      </div>
    </output>
  );
}
