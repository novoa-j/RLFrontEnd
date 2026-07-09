import { request } from './client'
import type {
  Telemetry,
  TelemetryDTO,
  TelemetryCreated,
  TelemetryPage,
  TelemetryQuery,
} from '../types/telemetry'

/** POST /telemetry — ingest a reading. Rejects duplicates with 409. */
export function createTelemetry(payload: TelemetryDTO, signal?: AbortSignal) {
  return request<TelemetryCreated>('/telemetry', { method: 'POST', body: payload, signal })
}

/** GET /telemetry — list readings with optional filters and pagination. */
export function listTelemetry(query: TelemetryQuery = {}, signal?: AbortSignal) {
  return request<TelemetryPage>('/telemetry', {
    query: {
      satelliteId: query.satelliteId,
      status: query.status,
      offset: query.offset,
      limit: query.limit,
    },
    signal,
  })
}

/** GET /telemetry/{id} — fetch a single record. */
export function getTelemetry(id: string, signal?: AbortSignal) {
  return request<Telemetry>(`/telemetry/${encodeURIComponent(id)}`, { signal })
}

/** DELETE /telemetry/{id} — remove a record. */
export function deleteTelemetry(id: string, signal?: AbortSignal) {
  return request<void>(`/telemetry/${encodeURIComponent(id)}`, { method: 'DELETE', signal })
}
