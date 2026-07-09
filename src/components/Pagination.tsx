interface Props {
  total: number
  offset: number
  limit: number
  onOffsetChange: (offset: number) => void
}

/** Prev/next pager driven by the API's total/offset/limit envelope. */
export function Pagination({ total, offset, limit, onOffsetChange }: Props) {
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + limit, total)
  const hasPrev = offset > 0
  const hasNext = offset + limit < total

  return (
    <div className="pagination">
      <span className="pagination-summary">
        {from}–{to} of {total}
      </span>
      <div className="pagination-actions">
        <button
          type="button"
          className="btn"
          disabled={!hasPrev}
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
        >
          ← Prev
        </button>
        <button
          type="button"
          className="btn"
          disabled={!hasNext}
          onClick={() => onOffsetChange(offset + limit)}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
