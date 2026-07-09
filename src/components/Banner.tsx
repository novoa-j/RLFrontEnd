import type { ReactNode } from 'react'

interface Props {
  kind: 'error' | 'notice'
  children: ReactNode
  onDismiss: () => void
}

/** Dismissible message strip for API errors and success notices. */
export function Banner({ kind, children, onDismiss }: Props) {
  return (
    <div className={`banner banner--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span className="banner-text">{children}</span>
      <button type="button" className="banner-close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}
