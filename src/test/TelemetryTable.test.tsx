import { describe, expect, it } from 'vitest'
import { TelemetryTable } from '../components/TelemetryTable'
import { click, makeStore, renderWithStore } from './utils'
import type { Telemetry } from '../types/telemetry'

const ROWS: Telemetry[] = [
  {
    id: 'id-1',
    satelliteId: 'SAT-01',
    timestamp: '2026-07-07T12:00:00Z',
    altitude: 512.4,
    velocity: 7.66,
    status: 'nominal',
  },
  {
    id: 'id-2',
    satelliteId: 'SAT-02',
    timestamp: '2026-07-06T12:00:00Z',
    altitude: 433.1,
    velocity: 7.12,
    status: 'critical',
  },
]

function renderTable(items: Telemetry[] = ROWS, storeOverrides = {}) {
  const store = makeStore(storeOverrides)
  const container = renderWithStore(<TelemetryTable items={items} />, store)
  return { store, container }
}

const cellTexts = (row: Element) => [...row.querySelectorAll('td')].map((td) => td.textContent)

describe('<TelemetryTable />', () => {
  it('renders one row per record with all five data columns (happy path)', () => {
    const { container } = renderTable()
    const rows = [...container.querySelectorAll('tbody tr')]
    expect(rows).toHaveLength(2)

    const [checkbox, sat, ts, alt, vel, status] = cellTexts(rows[0])
    expect(checkbox).toBe('') // checkbox cell has no text
    expect(sat).toBe('SAT-01')
    expect(ts).toBe(new Date('2026-07-07T12:00:00Z').toLocaleString())
    expect(alt).toBe('512.4')
    expect(vel).toBe('7.66')
    expect(status).toBe('nominal')
  })

  it('renders an unparseable timestamp as-is instead of "Invalid Date"', () => {
    const { container } = renderTable([{ ...ROWS[0], timestamp: 'not-a-date' }])
    expect(cellTexts(container.querySelector('tbody tr')!)[2]).toBe('not-a-date')
  })

  it('styles the status pill by its lowercased value', () => {
    const { container } = renderTable([{ ...ROWS[0], status: 'CRITICAL' }])
    const pill = container.querySelector('tbody .status')!
    expect(pill.className).toContain('status--critical')
  })

  it('shows the empty message when there are no records and no load in flight', () => {
    const { container } = renderTable([])
    expect(container.textContent).toContain('No telemetry records match the current filters.')
    expect(container.querySelector('table')).toBeNull()
  })

  it('keeps the (empty) table while loading instead of flashing the empty message', () => {
    const { container } = renderTable([], { loading: true })
    expect(container.querySelector('table')).not.toBeNull()
    expect(container.textContent).not.toContain('No telemetry records match')
  })

  it('toggles a row via its checkbox', async () => {
    const { store, container } = renderTable()
    const rowCheckbox = container.querySelector<HTMLInputElement>('tbody input[type=checkbox]')!
    await click(rowCheckbox)
    expect(store.toggleSelected).toHaveBeenCalledWith('id-1')
  })

  it('select-all checks every row on the page', async () => {
    const { store, container } = renderTable()
    const headerCheckbox = container.querySelector<HTMLInputElement>('thead input[type=checkbox]')!
    await click(headerCheckbox)
    expect(store.setSelection).toHaveBeenCalledWith(['id-1', 'id-2'], true)
  })

  it('select-all unchecks when everything is already selected', async () => {
    const { store, container } = renderTable(ROWS, { selected: new Set(['id-1', 'id-2']) })
    const headerCheckbox = container.querySelector<HTMLInputElement>('thead input[type=checkbox]')!
    expect(headerCheckbox.checked).toBe(true)
    await click(headerCheckbox)
    expect(store.setSelection).toHaveBeenCalledWith(['id-1', 'id-2'], false)
  })

  it('select-all is indeterminate when only some rows are selected', () => {
    const { container } = renderTable(ROWS, { selected: new Set(['id-1']) })
    const headerCheckbox = container.querySelector<HTMLInputElement>('thead input[type=checkbox]')!
    expect(headerCheckbox.indeterminate).toBe(true)
    expect(headerCheckbox.checked).toBe(false)
  })

  it('highlights selected rows', () => {
    const { container } = renderTable(ROWS, { selected: new Set(['id-2']) })
    const rows = [...container.querySelectorAll('tbody tr')]
    expect(rows[0].className).toBe('')
    expect(rows[1].className).toBe('row--selected')
  })

  it('disables all checkboxes while a batch delete is running', () => {
    const { container } = renderTable(ROWS, { deleteProgress: { done: 1, total: 2 } })
    const checkboxes = [...container.querySelectorAll<HTMLInputElement>('input[type=checkbox]')]
    expect(checkboxes.length).toBe(3) // header + 2 rows
    expect(checkboxes.every((c) => c.disabled)).toBe(true)
  })

  it('marks the active sort column and direction via aria-sort', () => {
    const { container } = renderTable(ROWS, { sort: { key: 'altitude', dir: 'asc' } })
    const headers = [...container.querySelectorAll('th')]
    const byText = (t: string) => headers.find((h) => h.textContent?.includes(t))!
    expect(byText('Altitude').getAttribute('aria-sort')).toBe('ascending')
    expect(byText('Timestamp').getAttribute('aria-sort')).toBe('none')
  })

  it('clicking a sortable header asks the store to sort by that column', async () => {
    const { store, container } = renderTable()
    const headers = [...container.querySelectorAll('th button')]
    await click(headers.find((h) => h.textContent?.includes('Velocity')) as HTMLElement)
    expect(store.setSort).toHaveBeenCalledWith('velocity')
  })

  it('satellite ID column is not sortable', () => {
    const { container } = renderTable()
    const satHeader = [...container.querySelectorAll('th')].find((h) =>
      h.textContent?.includes('Satellite ID'),
    )!
    expect(satHeader.querySelector('button')).toBeNull()
  })
})
