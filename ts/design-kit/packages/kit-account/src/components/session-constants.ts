export const SIGN_IN_REASONS = ['signed-out', 'expired', 'denied'] as const
export type SignInReason = (typeof SIGN_IN_REASONS)[number]

export const STEP_UP_STATUSES = ['idle', 'granting', 'failed'] as const
export type StepUpStatus = (typeof STEP_UP_STATUSES)[number]
