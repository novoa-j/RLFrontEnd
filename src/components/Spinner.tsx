/** Translucent overlay with a spinner, shown while data is being fetched. */
export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="spinner-overlay" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="spinner-label">{label}</span>
    </div>
  )
}
