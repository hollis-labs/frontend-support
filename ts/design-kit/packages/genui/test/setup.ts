import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(cleanup)
if (!('PointerEvent' in window)) Object.defineProperty(window, 'PointerEvent', { value: MouseEvent, configurable: true })
