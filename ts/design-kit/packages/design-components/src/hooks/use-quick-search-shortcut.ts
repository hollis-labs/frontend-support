import { useShortcut } from './use-shortcut'
import { useShiftShift } from './use-shift-shift'
import { defaultEscapeStack, type EscapeStack } from '../lib/escape-stack'

export interface UseQuickSearchShortcutOptions {
  /** Callback fired when Cmd+K / Ctrl+K or Shift-Shift triggers. */
  onOpen: () => void
  /** Shift-Shift timing threshold in ms. Default: 300ms per DEC-079 Nil spec. */
  thresholdMs?: number
  /** Whether the shortcuts are active. Default: true. */
  enabled?: boolean
  /** Time provider function for deterministic testing without Date.now(). */
  getTime?: () => number
  /** Suspend shortcuts when an active overlay owns keyboard focus. Default: true. */
  preventWhenOverlayActive?: boolean
  /** Optional custom EscapeStack to check for active overlay ownership. */
  escapeStack?: EscapeStack
  accessible?: boolean
  sourceGeneration?: unknown
  isAdmitted?: () => boolean
  scopeElement?: HTMLElement | null | (() => HTMLElement | null)
}

export interface UseQuickSearchShortcutResult {
  /** Whether the composite shortcuts are currently live. */
  isLive: () => boolean
}

/**
 * Composite hook binding Cmd+K (macOS) / Ctrl+K (Windows/Linux) as primary
 * and Shift-Shift (double-tap within 300ms) as alias for quick search.
 */
export function useQuickSearchShortcut(
  options: UseQuickSearchShortcutOptions,
): UseQuickSearchShortcutResult {
  const {
    onOpen,
    thresholdMs = 300,
    enabled = true,
    getTime,
    preventWhenOverlayActive = true,
    escapeStack = defaultEscapeStack,
  } = options

  // Primary: Mod+K (Cmd+K on macOS, Ctrl+K on other platforms)
  const shortcutResult = useShortcut({
    key: 'k',
    modifiers: { mod: true },
    onTrigger: () => onOpen(),
    enabled,
    preventWhenOverlayActive,
    escapeStack,
    accessible: options.accessible,
    sourceGeneration: options.sourceGeneration,
    isAdmitted: options.isAdmitted,
    scopeElement: options.scopeElement,
  })

  // Alias: Shift-Shift
  const shiftShiftResult = useShiftShift({
    onTrigger: () => onOpen(),
    thresholdMs,
    enabled,
    getTime,
    preventWhenOverlayActive,
    escapeStack,
    accessible: options.accessible,
    sourceGeneration: options.sourceGeneration,
    isAdmitted: options.isAdmitted,
    scopeElement: options.scopeElement,
  })

  return {
    isLive: () => shortcutResult.isLive() && shiftShiftResult.isLive(),
  }
}
