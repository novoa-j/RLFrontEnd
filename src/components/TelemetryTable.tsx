import { useTelemetryStore, type SortKey } from '../state/telemetryContext'
import type { Telemetry } from '../types/telemetry'

interface Props {
  /** The current page of sorted records. */
  items: Telemetry[]
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString()
}

/** Header cell that sorts the table by its column when clicked. */
function SortableTh({ label, sortKey }: { label: string; sortKey: SortKey }) {
  const { sort, setSort } = useTelemetryStore()
  const active = sort.key === sortKey
  const arrow = active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'
  return (
    <th aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        className={`th-sort${active ? ' th-sort--active' : ''}`}
        onClick={() => setSort(sortKey)}
        title={`Sort by ${label.toLowerCase()}`}
      >
        {label}
        <span className="sort-arrow" aria-hidden="true">
          {arrow}
        </span>
      </button>
    </th>
  )
}

/**
 * The main telemetry table: sortable by timestamp/altitude/velocity, with
 * checkbox selection feeding the batch-delete action.
 */
export function TelemetryTable({ items }: Props) {
  const { selected, toggleSelected, setSelection, deleteProgress, loading } = useTelemetryStore()

  const pageIds = items.map((r) => r.id)
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const someChecked = pageIds.some((id) => selected.has(id))
  const busy = deleteProgress !== null

  if (items.length === 0 && !loading) {
    return <p className="empty">No telemetry records match the current filters.</p>
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th className="checkbox-cell">
              <input
                type="checkbox"
                aria-label="Select all rows on this page"
                checked={allChecked}
                disabled={busy || pageIds.length === 0}
                ref={(el) => {
                  if (el) el.indeterminate = someChecked && !allChecked
                }}
                onChange={(e) => setSelection(pageIds, e.target.checked)}
              />
            </th>
            <th>Satellite ID</th>
            <SortableTh label="Timestamp" sortKey="timestamp" />
            <SortableTh label="Altitude (km)" sortKey="altitude" />
            <SortableTh label="Velocity (km/s)" sortKey="velocity" />
            <th>Health Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className={selected.has(row.id) ? 'row--selected' : undefined}>
              <td className="checkbox-cell">
                <input
                  type="checkbox"
                  aria-label={`Select reading ${row.id}`}
                  checked={selected.has(row.id)}
                  disabled={busy}
                  onChange={() => toggleSelected(row.id)}
                />
              </td>
              <td className="mono">{row.satelliteId}</td>
              <td>{formatTimestamp(row.timestamp)}</td>
              <td className="num">{row.altitude}</td>
              <td className="num">{row.velocity}</td>
              <td>
                <span className={`status status--${row.status.toLowerCase()}`}>{row.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
