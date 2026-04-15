export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="table-skeleton" role="status" aria-label="Loading content">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .skeleton-cell {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 1000px 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
          height: 40px;
        }
      `}</style>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: "1rem",
            padding: "1rem",
            alignItems: "center",
            borderBottom: i < rows - 1 ? "1px solid #e2e8f0" : "none"
          }}
        >
          <div className="skeleton-cell" style={{ width: "50px", flexShrink: 0 }} />
          <div className="skeleton-cell" style={{ flex: 2 }} />
          <div className="skeleton-cell" style={{ flex: 3 }} />
          <div className="skeleton-cell" style={{ width: "180px", flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="card-skeleton" role="status" aria-label="Loading content">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .skeleton-line {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 1000px 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
          height: 20px;
        }
      `}</style>
      <div style={{ padding: "1.5rem" }}>
        <div
          className="skeleton-line"
          style={{ width: "60%", height: "28px", marginBottom: "1rem" }}
        />
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton-line"
            style={{
              width: `${100 - i * 10}%`,
              marginBottom: i < lines - 1 ? "0.75rem" : "0",
              height: "16px"
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="page-skeleton" role="status" aria-label="Loading page">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .skeleton-header {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 1000px 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 14px;
          height: 100px;
          margin-bottom: 1.5rem;
        }
        .skeleton-card {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 1000px 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 16px;
          height: 200px;
          margin-bottom: 1rem;
        }
      `}</style>
      <div className="skeleton-header" />
      <div className="skeleton-card" />
      <div className="skeleton-card" />
      <div className="skeleton-card" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div
      className="stat-card-skeleton"
      role="status"
      aria-label="Loading statistic"
      style={{
        padding: "1.25rem",
        borderRadius: "16px",
        background: "white",
        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)"
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .skeleton-stat-icon {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 1000px 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 12px;
          width: 48px;
          height: 48px;
        }
        .skeleton-stat-text {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 1000px 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
          height: 16px;
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div className="skeleton-stat-icon" />
        <div style={{ flex: 1 }}>
          <div className="skeleton-stat-text" style={{ width: "60%", marginBottom: "0.5rem" }} />
          <div className="skeleton-stat-text" style={{ width: "40%", height: "24px" }} />
        </div>
      </div>
    </div>
  );
}
