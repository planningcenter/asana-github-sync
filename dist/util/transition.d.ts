/**
 * Transition logic for determining state changes
 */
import { TransitionType, ActionConfig } from '../types';
/**
 * Determine transition type based on PR action and merged status
 */
export declare function determineTransitionType(action: string | undefined, merged: boolean): TransitionType | null;
/**
 * Map transition type to configured state string
 */
export declare function mapTransitionToState(transitionType: TransitionType, config: ActionConfig): string | null;
//# sourceMappingURL=transition.d.ts.map