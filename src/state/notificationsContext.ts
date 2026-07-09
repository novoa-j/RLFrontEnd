import { createContext, useContext } from 'react'

/** User-facing messaging state: the error and notice banners plus their
 * dismissals. Owned by NotificationsController; other stores publish into it. */
export interface NotificationsStore {
  error: string | null
  notice: string | null
  showError: (message: string) => void
  showNotice: (message: string) => void
  dismissError: () => void
  dismissNotice: () => void
  /** Clear both messages at once (e.g. when a new operation starts). */
  clearAll: () => void
}

export const NotificationsContext = createContext<NotificationsStore | null>(null)

export function useNotifications(): NotificationsStore {
  const store = useContext(NotificationsContext)
  if (!store) throw new Error('useNotifications must be used within <NotificationsController>')
  return store
}
