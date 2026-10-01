export const dimensions = ['Site', 'Status', 'Priority', 'Classification', 'Location', 'Asset'] as const;
export type Dimension = typeof dimensions[number];

export interface PathSegment {
  dimension: Dimension;
  value: string;
}


export function availableDimensions(path: readonly PathSegment[]): Dimension[] {
  const used = new Set(path.map((segment) => segment.dimension));
  return dimensions.filter((dimension) => !used.has(dimension));
}

export function pathLabels(path: readonly PathSegment[]): string[] {
  return ['Work Orders', ...path.map(({ dimension, value }) => `${dimension}: ${value}`)];
}
