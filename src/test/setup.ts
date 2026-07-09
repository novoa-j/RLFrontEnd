// React's act() refuses to run unless the environment declares itself a test
// environment. Vitest doesn't set this automatically.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
