export default function Pagination({ page, totalPages, setPage }) {
  return (
    <div className="d-flex justify-content-center gap-2 mt-3">
      <button
        className="btn btn-sm btn-secondary"
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        Prev
      </button>

      <span>Page {page} of {totalPages}</span>

      <button
        className="btn btn-sm btn-secondary"
        disabled={page === totalPages}
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
