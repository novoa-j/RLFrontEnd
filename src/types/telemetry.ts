// Shapes mirror the RocketLab backend (app/schemas.py).

/** A telemetry reading as sent to the API on ingest. */
export interface TelemetryDTO {
  satelliteId: string
  /** ISO 8601 datetime, e.g. "2026-07-06T12:00:00Z". */
  timestamp: string
  /** Altitude in km. */
  altitude: number
  /** Velocity in km/s. */
  velocity: number
  status: string
}

/** A stored telemetry record, including its server-assigned id. */
export interface Telemetry extends TelemetryDTO {
  id: string
}

/** Response returned by POST /telemetry. */
export interface TelemetryCreated {
  id: string
}

/** Paginated envelope returned by GET /telemetry. */
export interface TelemetryPage {
  items: Telemetry[]
  /** Total records matching the filters, ignoring offset/limit. */
  total: number
  offset: number
  /** Page size requested; null means "no limit". */
  limit: number | null
}

/** Query parameters accepted by GET /telemetry. */
export interface TelemetryQuery {
  satelliteId?: string
  status?: string
  offset?: number
  limit?: number
}
