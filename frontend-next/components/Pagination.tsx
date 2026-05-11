'use client';

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
}

export default function Pagination({ page, pages, total, onPage }: PaginationProps) {
  return (
    <div className="pagination">
      <button onClick={() => onPage(page - 1)} disabled={page <= 1}>
        Prev
      </button>
      <span>Hal {page} dari {pages} ({total} data)</span>
      <button onClick={() => onPage(page + 1)} disabled={page >= pages}>
        Next
      </button>
    </div>
  );
}
