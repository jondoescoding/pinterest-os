export default function Loading() {
  return (
    <output className="skeleton-page" aria-label="Loading library">
      <div className="page-head">
        <span className="skeleton-line title" />
        <span className="skeleton-line long" />
      </div>

      <div className="row library-filters">
        {[0, 1, 2, 3, 4].map((item) => (
          <span className="skeleton-button" key={item} />
        ))}
      </div>

      <div className="card-grid">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div className="card library-card skeleton-card" key={item}>
            <span className="library-thumb skeleton-thumb" />
            <span className="skeleton-line medium" />
            <span className="skeleton-line long" />
            <span className="skeleton-line short" />
          </div>
        ))}
      </div>
    </output>
  );
}
