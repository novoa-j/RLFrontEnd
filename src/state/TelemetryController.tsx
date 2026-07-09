import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createTelemetry, deleteTelemetry, listTelemetry } from '../api/telemetry'
import { errorMessage } from '../api/client'
import { useNotifications } from './notificationsContext'
import {
  TelemetryContext,
  type DeleteProgress,
  type Filters,
  type SortKey,
  type SortState,
  type TelemetryStore,
} from './telemetryContext'
import type { Telemetry, TelemetryDTO } from '../types/telemetry'

function cacheKey(filters: Filters): string {
  return `${filters.satelliteId} ${filters.status}`
}

export function TelemetryController({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Telemetry[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFiltersState] = useState<Filters>({ satelliteId: '', status: '' })
  const [sort, setSortState] = useState<SortState>({ key: 'timestamp', dir: 'desc' })
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [deleteProgress, setDeleteProgress] = useState<DeleteProgress | null>(null)

  // Banner messaging lives in its own state controller (NotificationsController);
  // this store only publishes into it.
  const { showError, showNotice, dismissError, clearAll } = useNotifications()

  // Last-known-good records per filter set. Written ONLY on a successful
  // backend response; used as the display fallback when a refresh fails.
  const cacheRef = useRef(new Map<string, Telemetry[]>())
  // Monotonic counter so a slow, stale response can't clobber a newer one.
  const fetchSeqRef = useRef(0)

  /** Put a fresh dataset on screen and drop selections that no longer exist. */
  const showRecords = useCallback((items: Telemetry[]) => {
    setRecords(items)
    const ids = new Set(items.map((r) => r.id))
    setSelected((prev) => new Set([...prev].filter((id) => ids.has(id))))
  }, [])

  // Always attempts to pull fresh data from the backend — the cache is never
  // served in place of a fetch. Cached values are only replaced on a
  // successful response; on failure they're kept and shown as a fallback.
  const refresh = useCallback(async () => {
    const key = cacheKey(filters)
    const seq = ++fetchSeqRef.current
    setLoading(true)
    try {
      // No `limit` → the backend returns every matching record, which is what
      // client-side sorting and pagination need to be correct.
      const page = await listTelemetry({
        satelliteId: filters.satelliteId || undefined,
        status: filters.status || undefined,
      })
      if (seq !== fetchSeqRef.current) return // superseded by a newer fetch
      cacheRef.current.set(key, page.items)
      showRecords(page.items)
      dismissError() // a successful load makes any stale load error obsolete
    } catch (err) {
      if (seq !== fetchSeqRef.current) return
      // Fall back to the last-known-good records for this filter set, so the
      // table keeps showing data (relevant when the filters just changed and
      // `records` still holds a different filter's results).
      const cached = cacheRef.current.get(key)
      if (cached) showRecords(cached)
      showError(errorMessage(err))
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false)
    }
  }, [filters, showRecords, dismissError, showError])

  // Fetch on mount and whenever the filters change.
  useEffect(() => {
    const load = async () => {
      await refresh()
    }
    void load()
  }, [refresh])

  /** Apply new filters; pagination and selection reset with them. */
  const setFilters = useCallback((next: Filters) => {
    setFiltersState(next)
    setPage(0)
    setSelected(new Set())
  }, [])

  /** Sort by a column — clicking the active column flips the direction. */
  const setSort = useCallback((key: SortKey) => {
    setSortState((prev) => {
      const dir =
        prev.key === key
          ? prev.dir === 'asc'
            ? 'desc'
            : 'asc'
          : key === 'timestamp'
            ? 'desc' // newest first feels natural for a fresh timestamp sort
            : 'asc'
      return { key, dir }
    })
    setPage(0)
  }, [])

  /** Check or uncheck a single row. */
  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  /** Check or uncheck a batch of rows (the select-all header checkbox). */
  const setSelection = useCallback((ids: string[], isSelected: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (isSelected) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }, [])

  /** Ingest a reading, then reload so the table shows it. */
  const create = useCallback(
    async (payload: TelemetryDTO) => {
      // Let failures propagate — the form renders them next to its fields.
      await createTelemetry(payload)
      await refresh()
      showNotice(`Ingested reading for ${payload.satelliteId}.`)
    },
    [refresh, showNotice],
  )

  /** Delete every selected record, one DELETE call at a time. */
  const deleteSelected = useCallback(async () => {
    const ids = [...selected]
    if (ids.length === 0) return

    clearAll() // a new operation supersedes whatever banners are up
    setDeleteProgress({ done: 0, total: ids.length })
    const failures: string[] = []
    let done = 0
    // Per the API contract there is no bulk delete: loop through every checked
    // record and call DELETE /telemetry/{id} one at a time.
    for (const id of ids) {
      try {
        await deleteTelemetry(id)
      } catch (err) {
        failures.push(errorMessage(err))
      }
      done += 1
      setDeleteProgress({ done, total: ids.length })
    }
    setDeleteProgress(null)
    setSelected(new Set())

    // Refresh BEFORE announcing the outcome, so the reload can't clear the
    // failure message we're about to show.
    await refresh()
    if (failures.length === 0) {
      showNotice(`Deleted ${ids.length} reading${ids.length === 1 ? '' : 's'}.`)
    } else {
      showError(
        `Deleted ${ids.length - failures.length} of ${ids.length} readings; ${failures.length} failed. First error: ${failures[0]}`,
      )
    }
  }, [selected, refresh, clearAll, showNotice, showError])

  // The API always returns timestamp-desc and has no sort parameter, so
  // sorting happens here over the full cached dataset.
  const sorted = useMemo(() => {
    const { key, dir } = sort
    const mul = dir === 'asc' ? 1 : -1
    const value = (r: Telemetry) => (key === 'timestamp' ? Date.parse(r.timestamp) : r[key])
    return [...records].sort((a, b) => {
      const av = value(a)
      const bv = value(b)
      if (Number.isNaN(av) || Number.isNaN(bv)) return 0
      return (av - bv) * mul
    })
  }, [records, sort])

  const store = useMemo<TelemetryStore>(
    () => ({
      records,
      loading,
      filters,
      sort,
      page,
      selected,
      deleteProgress,
      sorted,
      refresh,
      create,
      deleteSelected,
      setFilters,
      setSort,
      setPage,
      toggleSelected,
      setSelection,
    }),
    [
      records,
      loading,
      filters,
      sort,
      page,
      selected,
      deleteProgress,
      sorted,
      refresh,
      create,
      deleteSelected,
      setFilters,
      setSort,
      toggleSelected,
      setSelection,
    ],
  )

  return <TelemetryContext.Provider value={store}>{children}</TelemetryContext.Provider>
}
