import { availableDimensions, type Dimension, type PathSegment } from './exploration';

export interface InvestigationState {
  path: readonly PathSegment[];
  selectedCounts: readonly number[];
  displayDimension: Dimension | null;
}

export const initialInvestigation: InvestigationState = { path: [], selectedCounts: [], displayDimension: null };

export type InvestigationAction =
  | { type: 'choose-dimension'; dimension: Dimension }
  | { type: 'explore-child'; value: string; count: number }
  | { type: 'restore'; path: readonly PathSegment[]; counts: readonly number[] }
  | { type: 'back' }
  | { type: 'reset' };

export function viewParentPath(state: InvestigationState): readonly PathSegment[] {
  return state.path;
}

export function investigationReducer(state: InvestigationState, action: InvestigationAction): InvestigationState {
  switch (action.type) {
    case 'choose-dimension':
      return availableDimensions(state.path).includes(action.dimension)
        ? { ...state, displayDimension: action.dimension }
        : state;
    case 'explore-child': {
      if (!state.displayDimension) return state;
      return {
        path: [...state.path, { dimension: state.displayDimension, value: action.value }],
        selectedCounts: [...state.selectedCounts, action.count],
        displayDimension: null,
      };
    }
    case 'restore':
      return { path: action.path, selectedCounts: action.counts, displayDimension: null };
    case 'back': {
      if (state.path.length === 0) return { ...state, displayDimension: null };
      const removed = state.path.at(-1)!;
      return { path: state.path.slice(0, -1), selectedCounts: state.selectedCounts.slice(0, -1), displayDimension: removed.dimension };
    }
    case 'reset':
      return initialInvestigation;
  }
}
