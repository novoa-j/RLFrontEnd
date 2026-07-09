import { useState } from 'react'
import { errorMessage } from '../api/client'
import { useTelemetryStore } from '../state/telemetryContext'
import {
  EMPTY_FORM,
  LOCAL_OFFSET,
  TZ_OFFSETS,
  nowInOffset,
  toPayload,
  validate,
  type Field,
  type FormState,
} from './telemetryFormLogic'

/**
 * Ingest form. Every field is validated client-side before the POST; invalid
 * fields get a red border and an inline message as soon as they're touched.
 */
export function TelemetryForm() {
  const { create } = useTelemetryStore()

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const errors = validate(form)
  // Show a field's error once it has been touched or a submit was attempted —
  // or immediately while typing if it already has content (an improper value
  // should be flagged on entry, not only on blur). Required-field errors still
  // wait for blur/submit since the field is empty until then.
  const visibleError = (field: Field): string | undefined =>
    submitAttempted || touched[field] || form[field] !== '' ? errors[field] : undefined

  const set = (field: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
  }
  const blur = (field: Field) => () => setTouched((t) => ({ ...t, [field]: true }))

  // Fill the timestamp with the current date/time in the selected timezone.
  const setNow = () => {
    setForm((f) => ({ ...f, timestamp: nowInOffset(f.tz) }))
    setTouched((t) => ({ ...t, timestamp: true }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)
    setServerError(null)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      await create(toPayload(form))
      // Keep satellite/status/timezone for rapid consecutive entries.
      setForm((f) => ({ ...EMPTY_FORM, satelliteId: f.satelliteId, status: f.status, tz: f.tz }))
      setTouched({})
      setSubmitAttempted(false)
    } catch (err) {
      setServerError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const field = (
    name: Field,
    label: string,
    inputProps: React.InputHTMLAttributes<HTMLInputElement>,
  ) => {
    const error = visibleError(name)
    return (
      <label className="field">
        <span>{label}</span>
        <input
          {...inputProps}
          className={error ? 'input--invalid' : undefined}
          aria-invalid={error ? true : undefined}
          value={form[name]}
          onChange={set(name)}
          onBlur={blur(name)}
        />
        {error && <span className="field-error">{error}</span>}
      </label>
    )
  }

  return (
    <form className="ingest-form" onSubmit={submit} noValidate>
      <div className="ingest-grid">
        {field('satelliteId', 'Satellite ID', { type: 'text', placeholder: 'SAT-01' })}
        <label className="field">
          <span>Timestamp</span>
          <div className="field-row">
            <input
              type="datetime-local"
              step={1}
              className={visibleError('timestamp') ? 'input--invalid' : undefined}
              aria-invalid={visibleError('timestamp') ? true : undefined}
              value={form.timestamp}
              onChange={set('timestamp')}
              onBlur={blur('timestamp')}
            />
            <button
              type="button"
              className="btn btn--sm"
              onClick={setNow}
              title="Set to the current date and time in the selected timezone"
            >
              Now
            </button>
          </div>
          {visibleError('timestamp') && (
            <span className="field-error">{visibleError('timestamp')}</span>
          )}
        </label>
        <label className="field">
          <span>Timezone</span>
          <select
            value={form.tz}
            onChange={(e) => setForm((f) => ({ ...f, tz: e.target.value }))}
            aria-label="Timestamp timezone (ISO 8601 offset)"
          >
            <option value="Z">Z (UTC)</option>
            {TZ_OFFSETS.map((offset) => (
              <option key={offset} value={offset}>
                {offset === LOCAL_OFFSET ? `${offset} (local)` : offset}
              </option>
            ))}
          </select>
        </label>
        {field('altitude', 'Altitude (km)', { type: 'text', inputMode: 'decimal', placeholder: '512.4' })}
        {field('velocity', 'Velocity (km/s)', { type: 'text', inputMode: 'decimal', placeholder: '7.66' })}
        {field('status', 'Health Status', { type: 'text', placeholder: 'nominal' })}
      </div>

      <div className="ingest-footer">
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Ingesting…' : 'Ingest reading'}
        </button>
        {serverError && (
          <span className="msg msg--error" role="alert">
            {serverError}
          </span>
        )}
      </div>
    </form>
  )
}
