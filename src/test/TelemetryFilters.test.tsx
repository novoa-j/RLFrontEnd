import { describe, expect, it } from 'vitest'
import { TelemetryFilters } from '../components/TelemetryFilters'
import { byLabel, click, makeStore, renderWithStore, submit, typeInto } from './utils'

function renderFilters(storeOverrides = {}) {
  const store = makeStore(storeOverrides)
  const container = renderWithStore(<TelemetryFilters />, store)
  const buttons = [...container.querySelectorAll('button')]
  return {
    store,
    container,
    form: container.querySelector('form')!,
    applyButton: buttons.find((b) => b.textContent === 'Apply')!,
    clearButton: buttons.find((b) => b.textContent === 'Clear')!,
    refreshButton: buttons.find((b) => b.textContent === 'Refresh')!,
  }
}

describe('<TelemetryFilters />', () => {
  it('seeds the inputs from the store filters', () => {
    const { container } = renderFilters({ filters: { satelliteId: 'SAT-9', status: 'critical' } })
    expect(byLabel(container, 'Satellite ID').value).toBe('SAT-9')
    expect(byLabel(container, 'Health Status').value).toBe('critical')
  })

  it('applies trimmed filters on submit (happy path)', async () => {
    const { store, container, form } = renderFilters()
    typeInto(byLabel(container, 'Satellite ID'), '  SAT-01  ')
    typeInto(byLabel(container, 'Health Status'), ' nominal ')
    await submit(form)

    expect(store.setFilters).toHaveBeenCalledTimes(1)
    expect(store.setFilters).toHaveBeenCalledWith({ satelliteId: 'SAT-01', status: 'nominal' })
  })

  it('treats whitespace-only input as an empty filter', async () => {
    const { store, container, form } = renderFilters()
    typeInto(byLabel(container, 'Satellite ID'), '   ')
    await submit(form)

    expect(store.setFilters).toHaveBeenCalledWith({ satelliteId: '', status: '' })
  })

  it('typing alone does not apply filters (draft-only until submit)', () => {
    const { store, container } = renderFilters()
    typeInto(byLabel(container, 'Satellite ID'), 'SAT-01')
    expect(store.setFilters).not.toHaveBeenCalled()
  })

  it('Clear empties the inputs and applies empty filters', async () => {
    const { store, container, clearButton } = renderFilters({
      filters: { satelliteId: 'SAT-9', status: 'critical' },
    })
    await click(clearButton)

    expect(store.setFilters).toHaveBeenCalledWith({ satelliteId: '', status: '' })
    expect(byLabel(container, 'Satellite ID').value).toBe('')
    expect(byLabel(container, 'Health Status').value).toBe('')
  })

  it('Refresh triggers a store refresh', async () => {
    const { store, refreshButton } = renderFilters()
    await click(refreshButton)
    expect(store.refresh).toHaveBeenCalledTimes(1)
  })

  it('disables Refresh while a load is in flight', () => {
    const { refreshButton, applyButton } = renderFilters({ loading: true })
    expect(refreshButton.disabled).toBe(true)
    expect(applyButton.disabled).toBe(false) // only Refresh is gated on loading
  })
})
