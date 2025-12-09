/**
 * Transition logic for determining state changes
 */

import { TransitionType, ActionConfig } from '../types';

/**
 * Determine transition type based on PR action and merged status
 */
export function determineTransitionType(
  action: string | undefined,
  merged: boolean
): TransitionType | null {
  if (action === 'opened') {
    return TransitionType.ON_OPENED;
  } else if (action === 'edited' && !merged) {
    return TransitionType.ON_OPENED;
  } else if (action === 'closed' && merged) {
    return TransitionType.ON_MERGED;
  } else {
    return null;
  }
}

/**
 * Map transition type to configured state string
 */
export function mapTransitionToState(
  transitionType: TransitionType,
  config: ActionConfig
): string | null {
  switch (transitionType) {
    case TransitionType.ON_OPENED:
      return config.stateOnOpened;
    case TransitionType.ON_MERGED:
      return config.stateOnMerged;
    default:
      return null;
  }
}
