// Pure logic behind TelemetryForm: field validation, timestamp helpers, and
// payload building. Kept free of React so it can be unit-tested directly.

import type { TelemetryDTO } from '../types/telemetry'

export interface FormState {
  satelliteId: string
  timestamp: string
  /** ISO 8601 timezone designator: 'Z' or a '±hh:mm' offset. */
  tz: string
  altitude: string
  velocity: string
  status: string
}

export type Field = keyof FormState
export type FieldErrors = Partial<Record<Field, string>>

// Every timezone designator ISO 8601 accepts: 'Z' plus UTC offsets from
// -12:00 to +14:00 in 15-minute steps (a superset of all real-world zones,
// including :30 and :45 offsets like +05:30 and +05:45).
export const TZ_OFFSETS: string[] = (() => {
  const offsets: string[] = []
  for (let mins = -12 * 60; mins <= 14 * 60; mins += 15) {
    const sign = mins < 0 ? '-' : '+'
    const abs = Math.abs(mins)
    const hh = String(Math.floor(abs / 60)).padStart(2, '0')
    const mm = String(abs % 60).padStart(2, '0')
    offsets.push(`${sign}${hh}:${mm}`)
  }
  return offsets
})()

/** The browser's current UTC offset as ±hh:mm, e.g. '-07:00'. */
export const LOCAL_OFFSET: string = (() => {
  const mins = -new Date().getTimezoneOffset()
  const sign = mins < 0 ? '-' : '+'
  const abs = Math.abs(mins)
  const hh = String(Math.floor(abs / 60)).padStart(2, '0')
  const mm = String(abs % 60).padStart(2, '0')
  return `${sign}${hh}:${mm}`
})()

export const EMPTY_FORM: FormState = {
  satelliteId: '',
  timestamp: '',
  // Default to the browser's zone so "what's on the clock" entries are correct.
  tz: TZ_OFFSETS.includes(LOCAL_OFFSET) ? LOCAL_OFFSET : 'Z',
  altitude: '',
  velocity: '',
  status: '',
}

// Strict decimal number: optional sign, digits with optional fraction, optional
// exponent. Rejects anything Number() would let slip through (hex, 'Infinity',
// whitespace-padded garbage).
const NUMERIC_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/

// Mirrors the backend's TelemetryDTO constraints (see /openapi.json):
// satelliteId 1–200 chars, status 1–100 chars, ISO 8601 timestamp, finite numbers.
export function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {}

  const satelliteId = form.satelliteId.trim()
  if (!satelliteId) errors.satelliteId = 'Satellite ID is required.'
  else if (satelliteId.length > 200) errors.satelliteId = 'Must be 200 characters or fewer.'

  if (!form.timestamp) errors.timestamp = 'Timestamp is required.'
  else if (Number.isNaN(Date.parse(form.timestamp))) errors.timestamp = 'Enter a valid date and time.'

  const altitude = form.altitude.trim()
  if (!altitude) errors.altitude = 'Altitude is required.'
  else if (!NUMERIC_RE.test(altitude) || !Number.isFinite(Number(altitude)))
    errors.altitude = 'Only numeric values are allowed, e.g. 512.4.'

  const velocity = form.velocity.trim()
  if (!velocity) errors.velocity = 'Velocity is required.'
  else if (!NUMERIC_RE.test(velocity) || !Number.isFinite(Number(velocity)))
    errors.velocity = 'Only numeric values are allowed, e.g. 7.66.'

  const status = form.status.trim()
  if (!status) errors.status = 'Status is required.'
  else if (status.length > 100) errors.status = 'Must be 100 characters or fewer.'

  return errors
}

/** Current date/time as a datetime-local string ("YYYY-MM-DDTHH:mm:ss"),
 * expressed as the wall clock of the given ISO 8601 offset — so the
 * timestamp+offset pair always denotes the actual current instant. */
export function nowInOffset(tz: string): string {
  const offsetMins =
    tz === 'Z'
      ? 0
      : (tz.startsWith('-') ? -1 : 1) * (Number(tz.slice(1, 3)) * 60 + Number(tz.slice(4, 6)))
  const shifted = new Date(Date.now() + offsetMins * 60_000)
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${shifted.getUTCFullYear()}-${p(shifted.getUTCMonth() + 1)}-${p(shifted.getUTCDate())}` +
    `T${p(shifted.getUTCHours())}:${p(shifted.getUTCMinutes())}:${p(shifted.getUTCSeconds())}`
  )
}

/** Build the API payload from a validated form: trims text fields, normalizes
 * the datetime-local value to include seconds, and appends the ISO 8601
 * timezone designator. */
export function toPayload(form: FormState): TelemetryDTO {
  const naive = form.timestamp.length === 16 ? `${form.timestamp}:00` : form.timestamp
  return {
    satelliteId: form.satelliteId.trim(),
    timestamp: `${naive}${form.tz}`,
    altitude: Number(form.altitude.trim()),
    velocity: Number(form.velocity.trim()),
    status: form.status.trim(),
  }
}
