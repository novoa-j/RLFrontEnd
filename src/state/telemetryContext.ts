import { createContext, useContext } from 'react'
import type { Telemetry, TelemetryDTO } from '../types/telemetry'

/** Rows shown per page (pagination is client-side over the sorted dataset). */
export const PAGE_SIZE = 20

/** Columns the table can be sorted by (the API has no sort parameter, so
 * sorting is done client-side over the cached dataset). */
export type SortKey = 'timestamp' | 'altitude' | 'velocity'

export interface SortState {
  key: SortKey
  dir: 'asc' | 'desc'
}

export interface Filters {
  satelliteId: string
  status: string
}

export interface DeleteProgress {
  done: number
  total: number
}

export interface TelemetryState {
  /** Records matching the current filters, as returned by the backend. */
  records: Telemetry[]
  loading: boolean
  filters: Filters
  sort: SortState
  page: number
  selected: ReadonlySet<string>
  /** Non-null while a batch delete is running. */
  deleteProgress: DeleteProgress | null
}

export interface TelemetryStore extends TelemetryState {
  /** Records sorted by the current sort state (derived from `records`). */
  sorted: Telemetry[]
  /** Pull fresh data for the current filter set from the backend. Always hits
   * the network; cached values are only replaced on a successful response. */
  refresh: () => Promise<void>
  /** Ingest a reading. Throws on failure so the form can display the error. */
  create: (payload: TelemetryDTO) => Promise<void>
  /** Delete every selected record, one DELETE call at a time. */
  deleteSelected: () => Promise<void>
  setFilters: (filters: Filters) => void
  setSort: (key: SortKey) => void
  setPage: (page: number) => void
  toggleSelected: (id: string) => void
  setSelection: (ids: string[], selected: boolean) => void
}

export const TelemetryContext = createContext<TelemetryStore | null>(null)

export function useTelemetryStore(): TelemetryStore {
  const store = useContext(TelemetryContext)
  if (!store) throw new Error('useTelemetryStore must be used within <TelemetryController>')
  return store
}
