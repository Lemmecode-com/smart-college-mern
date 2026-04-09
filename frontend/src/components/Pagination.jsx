import {
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
} from "react-icons/fa";

export default function Pagination({ page, totalPages, setPage }) {
  // Generate page numbers to display with ellipsis logic
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (page > 3) {
        pages.push("...");
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
    }
  };

  const pageNumbers = getPageNumbers();

  // No pagination needed for single page
  if (totalPages <= 1) return null;

  return (
    <div className="d-flex justify-content-center align-items-center gap-2 flex-wrap">
      {/* First page button */}
      <button
        className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center hover-lift"
        disabled={page === 1}
        onClick={() => handlePageChange(1)}
        title="First page"
        aria-label="First page"
        style={{ minWidth: "44px", minHeight: "44px" }}
      >
        <FaAngleDoubleLeft size={14} />
      </button>

      {/* Previous page button */}
      <button
        className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center hover-lift"
        disabled={page === 1}
        onClick={() => handlePageChange(page - 1)}
        title="Previous page"
        aria-label="Previous page"
        style={{ minWidth: "44px", minHeight: "44px" }}
      >
        <FaChevronLeft size={14} />
      </button>

      {/* Page numbers */}
      <div className="d-flex gap-1">
        {pageNumbers.map((pageNum, index) =>
          pageNum === "..." ? (
            <span
              key={`ellipsis-${index}`}
              className="btn btn-sm btn-light d-flex align-items-center justify-content-center"
              style={{
                cursor: "default",
                minWidth: "44px",
                minHeight: "44px",
                border: "1px solid transparent",
              }}
            >
              ...
            </span>
          ) : (
            <button
              key={pageNum}
              className={`btn btn-sm d-flex align-items-center justify-content-center transition-all ${
                pageNum === page
                  ? "btn-primary shadow-sm"
                  : "btn-outline-primary hover-lift"
              }`}
              onClick={() => handlePageChange(pageNum)}
              aria-current={pageNum === page ? "page" : undefined}
              style={{
                minWidth: "44px",
                minHeight: "44px",
                fontWeight: pageNum === page ? "600" : "400",
              }}
            >
              {pageNum}
            </button>
          ),
        )}
      </div>

      {/* Next page button */}
      <button
        className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center hover-lift"
        disabled={page === totalPages}
        onClick={() => handlePageChange(page + 1)}
        title="Next page"
        aria-label="Next page"
        style={{ minWidth: "44px", minHeight: "44px" }}
      >
        <FaChevronRight size={14} />
      </button>

      {/* Last page button */}
      <button
        className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center hover-lift"
        disabled={page === totalPages}
        onClick={() => handlePageChange(totalPages)}
        title="Last page"
        aria-label="Last page"
        style={{ minWidth: "44px", minHeight: "44px" }}
      >
        <FaAngleDoubleRight size={14} />
      </button>

      {/* Page info badge */}
      <span className="ms-2 px-3 py-1 bg-light rounded-pill text-muted small fw-semibold">
        Page {page} of {totalPages}
      </span>
    </div>
  );
}
