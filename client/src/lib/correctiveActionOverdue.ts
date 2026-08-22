import type { CorrectiveAction } from './correctiveActionTypes';

export function isCorrectiveActionOverdue(action: Pick<CorrectiveAction, 'status' | 'dueDate'>): boolean {
  return action.status !== 'Closed' && new Date(action.dueDate).getTime() < Date.now();
}
