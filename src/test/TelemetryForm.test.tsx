import { describe, expect, it, vi } from 'vitest'
import { TelemetryForm } from '../components/TelemetryForm'
import { EMPTY_FORM, toPayload, validate, type FormState } from '../components/telemetryFormLogic'
import { ApiError } from '../api/client'
import { byLabel, click, errorOf, makeStore, renderWithStore, submit, typeInto } from './utils'

// A form state that passes every rule; tests override single fields.
const VALID: FormState = {
  satelliteId: 'SAT-01',
  timestamp: '2026-07-07T18:00',
  tz: 'Z',
  altitude: '512.4',
  velocity: '7.66',
  status: 'nominal',
}

describe('validate — happy path', () => {
  it('accepts a fully valid form', () => {
    expect(validate(VALID)).toEqual({})
  })

  it('accepts boundary lengths (200-char satelliteId, 100-char status)', () => {
    expect(validate({ ...VALID, satelliteId: 'x'.repeat(200) })).toEqual({})
    expect(validate({ ...VALID, status: 'x'.repeat(100) })).toEqual({})
  })

  it('accepts negative, decimal-only, and scientific-notation numbers', () => {
    for (const good of ['-512.4', '.5', '1.2e3', '+7', '0']) {
      expect(validate({ ...VALID, altitude: good })).toEqual({})
      expect(validate({ ...VALID, velocity: good })).toEqual({})
    }
  })
})

describe('validate — satelliteId', () => {
  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
  ])('requires a value (%s)', (_name, value) => {
    expect(validate({ ...VALID, satelliteId: value }).satelliteId).toBe('Satellite ID is required.')
  })

  it('rejects more than 200 characters', () => {
    expect(validate({ ...VALID, satelliteId: 'x'.repeat(201) }).satelliteId).toBe(
      'Must be 200 characters or fewer.',
    )
  })
})

describe('validate — timestamp', () => {
  it('requires a value', () => {
    expect(validate({ ...VALID, timestamp: '' }).timestamp).toBe('Timestamp is required.')
  })

  it('rejects an unparseable date', () => {
    expect(validate({ ...VALID, timestamp: 'not-a-date' }).timestamp).toBe(
      'Enter a valid date and time.',
    )
  })
})

describe('validate — altitude and velocity', () => {
  it.each(['abc', '1.2.3', '512km', 'Infinity', 'NaN', '0x10', '1e'])(
    'rejects non-numeric value %j',
    (bad) => {
      expect(validate({ ...VALID, altitude: bad }).altitude).toBe(
        'Only numeric values are allowed, e.g. 512.4.',
      )
      expect(validate({ ...VALID, velocity: bad }).velocity).toBe(
        'Only numeric values are allowed, e.g. 7.66.',
      )
    },
  )

  it('requires values', () => {
    expect(validate({ ...VALID, altitude: '' }).altitude).toBe('Altitude is required.')
    expect(validate({ ...VALID, velocity: ' ' }).velocity).toBe('Velocity is required.')
  })
})

describe('validate — status', () => {
  it('requires a value', () => {
    expect(validate({ ...VALID, status: '  ' }).status).toBe('Status is required.')
  })

  it('rejects more than 100 characters', () => {
    expect(validate({ ...VALID, status: 'x'.repeat(101) }).status).toBe(
      'Must be 100 characters or fewer.',
    )
  })
})

describe('toPayload', () => {
  it('trims text fields, adds seconds, and appends the timezone designator', () => {
    expect(toPayload({ ...VALID, satelliteId: '  SAT-01  ', status: ' nominal ' })).toEqual({
      satelliteId: 'SAT-01',
      timestamp: '2026-07-07T18:00:00Z',
      altitude: 512.4,
      velocity: 7.66,
      status: 'nominal',
    })
  })

  it('keeps existing seconds and supports offset timezones', () => {
    const payload = toPayload({ ...VALID, timestamp: '2026-07-07T18:00:30', tz: '+05:30' })
    expect(payload.timestamp).toBe('2026-07-07T18:00:30+05:30')
  })

  it('converts numeric strings, including scientific notation', () => {
    const payload = toPayload({ ...VALID, altitude: '1.2e3', velocity: ' 7 ' })
    expect(payload.altitude).toBe(1200)
    expect(payload.velocity).toBe(7)
  })
})

describe('<TelemetryForm />', () => {
  function renderForm(storeOverrides = {}) {
    const store = makeStore(storeOverrides)
    const container = renderWithStore(<TelemetryForm />, store)
    return { store, container, form: container.querySelector('form')! }
  }

  function fillValid(container: HTMLElement) {
    typeInto(byLabel(container, 'Satellite ID'), 'SAT-01')
    typeInto(byLabel(container, 'Timestamp'), '2026-07-07T18:00')
    typeInto(byLabel(container, 'Timezone'), 'Z')
    typeInto(byLabel(container, 'Altitude (km)'), '512.4')
    typeInto(byLabel(container, 'Velocity (km/s)'), '7.66')
    typeInto(byLabel(container, 'Health Status'), 'nominal')
  }

  it('submits the normalized payload on the happy path', async () => {
    const { store, container, form } = renderForm()
    fillValid(container)
    await submit(form)

    expect(store.create).toHaveBeenCalledTimes(1)
    expect(store.create).toHaveBeenCalledWith({
      satelliteId: 'SAT-01',
      timestamp: '2026-07-07T18:00:00Z',
      altitude: 512.4,
      velocity: 7.66,
      status: 'nominal',
    })
  })

  it('after success, clears measurement fields but keeps satellite, status, and timezone', async () => {
    const { container, form } = renderForm()
    fillValid(container)
    await submit(form)

    expect(byLabel(container, 'Satellite ID').value).toBe('SAT-01')
    expect(byLabel(container, 'Health Status').value).toBe('nominal')
    expect(byLabel(container, 'Timezone').value).toBe('Z')
    expect(byLabel(container, 'Timestamp').value).toBe('')
    expect(byLabel(container, 'Altitude (km)').value).toBe('')
    expect(byLabel(container, 'Velocity (km/s)').value).toBe('')
  })

  it('blocks submit and shows all five required errors when empty', async () => {
    const { store, container, form } = renderForm()
    await submit(form)

    expect(store.create).not.toHaveBeenCalled()
    expect(container.querySelectorAll('.field-error')).toHaveLength(5)
  })

  it('blocks submit when a single field is invalid', async () => {
    const { store, container, form } = renderForm()
    fillValid(container)
    typeInto(byLabel(container, 'Altitude (km)'), '512abc')
    await submit(form)

    expect(store.create).not.toHaveBeenCalled()
    expect(errorOf(container, 'Altitude (km)')).toBe('Only numeric values are allowed, e.g. 512.4.')
  })

  it('flags an invalid value while typing, before any submit', () => {
    const { container } = renderForm()
    const altitude = byLabel(container, 'Altitude (km)')
    typeInto(altitude, 'abc')

    expect(errorOf(container, 'Altitude (km)')).toBe('Only numeric values are allowed, e.g. 512.4.')
    expect(altitude.getAttribute('aria-invalid')).toBe('true')
  })

  it('does not show required errors before the user touches the form', () => {
    const { container } = renderForm()
    expect(container.querySelectorAll('.field-error')).toHaveLength(0)
  })

  it('shows the server error when create rejects (e.g. duplicate 409)', async () => {
    const create = vi.fn(async () => {
      throw new ApiError(409, 'A telemetry entry with identical field values already exists.')
    })
    const { container, form } = renderForm({ create })
    fillValid(container)
    await submit(form)

    expect(container.querySelector('.msg--error')?.textContent).toBe(
      'Conflict (409): A telemetry entry with identical field values already exists.',
    )
    // The user's input is kept so they can correct and resubmit.
    expect(byLabel(container, 'Timestamp').value).toBe('2026-07-07T18:00')
  })

  it('the Now button fills the timestamp with the current time in the selected timezone', async () => {
    const { container } = renderForm()
    typeInto(byLabel(container, 'Timezone'), 'Z')
    const nowButton = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Now')!
    await click(nowButton)

    const value = byLabel(container, 'Timestamp').value
    // "YYYY-MM-DDTHH:mm:ss", within a minute of the actual current UTC time.
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
    const deltaMs = Math.abs(Date.now() - Date.parse(`${value}Z`))
    expect(deltaMs).toBeLessThan(60_000)
    expect(errorOf(container, 'Timestamp')).toBeNull()
  })

  it('offers the full ISO 8601 timezone range in the dropdown', () => {
    const { container } = renderForm()
    const options = [...byLabel(container, 'Timezone').querySelectorAll('option')].map(
      (o) => (o as HTMLOptionElement).value,
    )
    expect(options).toHaveLength(106) // Z + every 15-min offset from -12:00 to +14:00
    expect(options).toContain('Z')
    expect(options).toContain('-12:00')
    expect(options).toContain('+05:30')
    expect(options).toContain('+14:00')
  })

  it('starts from a clean default state', () => {
    const { container } = renderForm()
    expect(byLabel(container, 'Satellite ID').value).toBe(EMPTY_FORM.satelliteId)
    expect(byLabel(container, 'Timezone').value).toBe(EMPTY_FORM.tz)
  })
})
