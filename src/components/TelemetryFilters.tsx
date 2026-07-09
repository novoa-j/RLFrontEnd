import { useState } from 'react'
import { useTelemetryStore } from '../state/telemetryContext'
import type { Filters } from '../state/telemetryContext'

/** Filter bar for satelliteId / status. Applies on submit or clear. */
export function TelemetryFilters() {
  const { filters, setFilters, refresh, loading } = useTelemetryStore()

  // This component is the sole source of filter changes, so the draft owns its
  // state; the store value is only the initial seed.
  const [draft, setDraft] = useState<Filters>(filters)

  const apply = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters({
      satelliteId: draft.satelliteId.trim(),
      status: draft.status.trim(),
    })
  }

  const clear = () => {
    const empty = { satelliteId: '', status: '' }
    setDraft(empty)
    setFilters(empty)
  }

  return (
    <form className="filters" onSubmit={apply}>
      <label className="field">
        <span>Satellite ID</span>
        <input
          type="text"
          placeholder="e.g. SAT-01"
          value={draft.satelliteId}
          onChange={(e) => setDraft((d) => ({ ...d, satelliteId: e.target.value }))}
        />
      </label>
      <label className="field">
        <span>Health Status</span>
        <input
          type="text"
          placeholder="e.g. nominal"
          value={draft.status}
          onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
        />
      </label>
      <div className="filters-actions">
        <button type="submit" className="btn btn--primary">
          Apply
        </button>
        <button type="button" className="btn" onClick={clear}>
          Clear
        </button>
        <button
          type="button"
          className="btn"
          disabled={loading}
          onClick={() => void refresh()}
          title="Re-fetch from the backend"
        >
          Refresh
        </button>
      </div>
    </form>
  )
}
