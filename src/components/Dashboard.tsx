import { Banner } from './Banner'
import { Spinner } from './Spinner'
import { TelemetryForm } from './TelemetryForm'
import { TelemetryFilters } from './TelemetryFilters'
import { TelemetryTable } from './TelemetryTable'
import { Pagination } from './Pagination'
import { PAGE_SIZE, useTelemetryStore } from '../state/telemetryContext'
import { useNotifications } from '../state/notificationsContext'

/** The main screen: ingest form, filter bar, sortable table, batch delete. */
export function Dashboard() {
  const {
    sorted,
    loading,
    page,
    setPage,
    selected,
    deleteSelected,
    deleteProgress,
  } = useTelemetryStore()
  const { error, notice, dismissError, dismissNotice } = useNotifications()

  // Client-side pagination over the sorted dataset; clamp in case deletions
  // shrank the result set below the current page.
  const maxPage = Math.max(0, Math.ceil(sorted.length / PAGE_SIZE) - 1)
  const currentPage = Math.min(page, maxPage)
  const pageItems = sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  const deleting = deleteProgress !== null

  return (
    <div className="app">
      <header className="app-header">
          <div>
            <h1>RocketLab Telemetry</h1>
            <p className="subtitle">Satellite telemetry ingest &amp; monitoring</p>
          </div>
      </header>

      {error && (
        <Banner kind="error" onDismiss={dismissError}>
          {error}
        </Banner>
      )}
      {notice && (
        <Banner kind="notice" onDismiss={dismissNotice}>
          {notice}
        </Banner>
      )}

      <main className="app-main">
        <section className="panel">
          <h2>Ingest reading</h2>
          <TelemetryForm />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Readings</h2>
            <TelemetryFilters />
          </div>

          {(selected.size > 0 || deleting) && (
            <div className="selection-bar">
              <span>
                {deleting
                  ? `Deleting ${deleteProgress.done} of ${deleteProgress.total}…`
                  : `${selected.size} selected`}
              </span>
              <button
                type="button"
                className="btn btn--danger"
                disabled={deleting}
                onClick={() => void deleteSelected()}
              >
                Delete selected
              </button>
            </div>
          )}

          <div className="table-zone">
            <TelemetryTable items={pageItems} />
            {(loading || deleting) && (
              <Spinner label={deleting ? 'Deleting readings…' : 'Fetching telemetry…'} />
            )}
          </div>

          {sorted.length > 0 && (
            <Pagination
              total={sorted.length}
              offset={currentPage * PAGE_SIZE}
              limit={PAGE_SIZE}
              onOffsetChange={(offset) => setPage(Math.floor(offset / PAGE_SIZE))}
            />
          )}
        </section>
      </main>

      <footer className="app-footer">
        <span>Data is runtime-only — the backend stores telemetry in-memory.</span>
      </footer>
    </div>
  )
}
