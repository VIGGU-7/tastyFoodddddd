export default function Loading() {
  return (
    <div className="loading-layout" role="status" aria-label="Loading page">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-hero" />
      <div className="skeleton-grid">
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
      <span className="sr-only">Loading your page…</span>
    </div>
  );
}
