// Minimal component-test helpers: render with a mock store, fire events,
// query by label. Plain react-dom + happy-dom — no testing-library.

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { ReactElement } from 'react'
import { afterEach, vi } from 'vitest'
import { TelemetryContext, type TelemetryStore } from '../state/telemetryContext'

let container: HTMLElement | null = null
let root: Root | null = null

/** A TelemetryStore where every action is a vi.fn(); override what a test needs. */
export function makeStore(overrides: Partial<TelemetryStore> = {}): TelemetryStore {
  return {
    records: [],
    loading: false,
    filters: { satelliteId: '', status: '' },
    sort: { key: 'timestamp', dir: 'desc' },
    page: 0,
    selected: new Set<string>(),
    deleteProgress: null,
    sorted: [],
    refresh: vi.fn(async () => {}),
    create: vi.fn(async () => {}),
    deleteSelected: vi.fn(async () => {}),
    setFilters: vi.fn(),
    setSort: vi.fn(),
    setPage: vi.fn(),
    toggleSelected: vi.fn(),
    setSelection: vi.fn(),
    ...overrides,
  }
}

/** Mount a component wrapped in the telemetry store context. */
export function renderWithStore(ui: ReactElement, store: TelemetryStore): HTMLElement {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root!.render(<TelemetryContext.Provider value={store}>{ui}</TelemetryContext.Provider>)
  })
  return container
}

afterEach(() => {
  if (root) act(() => root!.unmount())
  container?.remove()
  root = null
  container = null
})

/** Find the input/select inside the <label> whose <span> reads `labelText`. */
export function byLabel(scope: HTMLElement, labelText: string): HTMLInputElement {
  const label = [...scope.querySelectorAll('label')].find(
    (l) => l.querySelector('span')?.textContent === labelText,
  )
  const control = label?.querySelector('input, select')
  if (!control) throw new Error(`No field labelled "${labelText}"`)
  return control as HTMLInputElement
}

/** The inline error text of a labelled field, or null when there is none. */
export function errorOf(scope: HTMLElement, labelText: string): string | null {
  const label = [...scope.querySelectorAll('label')].find(
    (l) => l.querySelector('span')?.textContent === labelText,
  )
  return label?.querySelector('.field-error')?.textContent ?? null
}

/** Set a controlled input/select value the way a user would (fires React's onChange). */
export function typeInto(el: HTMLInputElement | HTMLSelectElement, value: string): void {
  act(() => {
    // Write through the prototype setter to bypass React's value tracker on
    // the instance, so the dispatched event registers as a real change.
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set
    setter?.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

/** Click an element (button, checkbox, …) inside act. */
export async function click(el: HTMLElement): Promise<void> {
  await act(async () => {
    el.click()
  })
}

/** Submit a form and wait for resulting async state updates. */
export async function submit(form: HTMLFormElement): Promise<void> {
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}
