import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { NotificationsContext, type NotificationsStore } from './notificationsContext'

/** State controller for the error/notice banners. */
export function NotificationsController({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Stable identities: consumers (e.g. TelemetryController's data callbacks)
  // depend on these without re-running whenever a message changes.
  const showError = useCallback((message: string) => setError(message), [])
  const showNotice = useCallback((message: string) => setNotice(message), [])
  const dismissError = useCallback(() => setError(null), [])
  const dismissNotice = useCallback(() => setNotice(null), [])
  const clearAll = useCallback(() => {
    setError(null)
    setNotice(null)
  }, [])

  const store = useMemo<NotificationsStore>(
    () => ({ error, notice, showError, showNotice, dismissError, dismissNotice, clearAll }),
    [error, notice, showError, showNotice, dismissError, dismissNotice, clearAll],
  )

  return <NotificationsContext.Provider value={store}>{children}</NotificationsContext.Provider>
}
