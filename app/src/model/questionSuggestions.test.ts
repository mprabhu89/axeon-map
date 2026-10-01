import { expect, test } from 'vitest';
import { analyticalLenses, suggestAnalyticalQuestions } from './questionSuggestions';
import type { PathSegment } from './exploration';

const questions = (path: readonly PathSegment[]) => {
  const last = path.at(-1);
  return suggestAnalyticalQuestions({
    nodeDimension: last?.dimension ?? 'Work Orders',
    nodeLabel: last?.value ?? 'Work Orders',
    path,
  });
};
const site = [{ dimension: 'Site', value: 'SITE-A' }] as const;
const statusPriority = [{ dimension: 'Status', value: 'WAPPR' }, { dimension: 'Priority', value: '1' }] as const;

test('suggestions carry stable identifiers and frozen analytical lenses, bounded to four', () => {
  for (const path of [[], site, statusPriority, [{ dimension: 'Asset', value: 'A-PUMP-01' }] as const]) {
    const result = questions(path);
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.length).toBeLessThanOrEqual(4);
    expect(new Set(result.map(({ id }) => id)).size).toBe(result.length);
    expect(new Set(result.map(({ lens }) => lens)).size).toBe(result.length);
    for (const suggestion of result) {
      expect(suggestion.id).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
      expect(analyticalLenses).toContain(suggestion.lens);
      expect(suggestion.text).toMatch(/\?$/);
    }
  }
  expect(questions(site).map(({ id }) => id)).toEqual(
    questions([{ dimension: 'Site', value: 'SITE-B' }]).map(({ id }) => id),
  );
});

test('root questions guide operational investigation without inventing findings', () => {
  const result = questions([]);
  expect(result.map(({ lens }) => lens)).toContain('Risk');
  expect(result.map(({ lens }) => lens)).toContain('Backlog & Aging');
  expect(result.map(({ text }) => text).join(' ')).toMatch(/operational exposure|backlog/i);
});

test('Site questions use the site and address risk, backlog, and repeated work', () => {
  const result = questions(site);
  expect(result.every(({ text }) => text.includes('SITE-A'))).toBe(true);
  expect(result.map(({ lens }) => lens)).toEqual(['Risk', 'Backlog & Aging', 'Repeat Work', 'Optimization']);
});

test('Status to Priority asks about operational conditions without assuming Site', () => {
  const result = questions(statusPriority);
  expect(result[0]?.text).toBe('Are Priority 1 Work Orders aging unusually long in WAPPR?');
  expect(result.map(({ lens }) => lens)).toContain('Process Bottleneck');
  expect(result.map(({ text }) => text).join(' ')).not.toMatch(/site|SITE-A/i);
});

test('Site to Status to Priority preserves complete context with meaningful guidance', () => {
  const result = questions([...site, ...statusPriority]);
  expect(result[0]?.text).toBe('Are any Priority 1 Work Orders at SITE-A aging unusually long in WAPPR?');
  expect(result.map(({ lens }) => lens)).toEqual(['Risk', 'Repeat Work', 'Process Bottleneck', 'Optimization']);
  expect(result.every(({ text }) => text.includes('SITE-A'))).toBe(true);
});

test('shorter multi-level Site paths retain their fixed context', () => {
  for (const path of [
    [...site, { dimension: 'Status', value: 'WAPPR' }] as const,
    [...site, { dimension: 'Priority', value: '1' }] as const,
  ]) {
    const result = questions(path);
    expect(result.every(({ text }) => text.includes('SITE-A'))).toBe(true);
    expect(result.every(({ text }) => text.includes(path.at(-1)!.value))).toBe(true);
  }
});

test('Asset context addresses repeat work and reliability; other node types get relevant lenses', () => {
  const asset = questions([{ dimension: 'Asset', value: 'A-PUMP-01' }]);
  expect(asset.map(({ lens }) => lens)).toEqual(['Repeat Work', 'Reliability', 'Data Quality', 'Optimization']);
  expect(asset.every(({ text }) => text.includes('A-PUMP-01'))).toBe(true);
  expect(questions([{ dimension: 'Classification', value: 'Electrical' }]).map(({ lens }) => lens)).toContain('Work Mix');
  expect(questions([{ dimension: 'Location', value: 'A-PLANT' }]).map(({ lens }) => lens)).toContain('Repeat Work');
  expect(questions([{ dimension: 'Status', value: 'WAPPR' }]).map(({ lens }) => lens)).toContain('Process Bottleneck');
});

test('questions do not merely restate Explore By and never assert analytical findings', () => {
  const paths: PathSegment[][] = [
    [], [...site], [...statusPriority], [...site, ...statusPriority],
    [{ dimension: 'Classification', value: 'Electrical' }],
    [{ dimension: 'Location', value: 'A-PLANT' }],
    [{ dimension: 'Asset', value: 'A-PUMP-01' }],
  ];
  for (const path of paths) {
    for (const { text } of questions(path)) {
      expect(text).not.toMatch(/^(Which|What) (sites|statuses|priorities|classifications|locations|assets)\b/i);
      expect(text).not.toMatch(/\b(has detected|shows that|is confirmed|we found)\b/i);
    }
  }
});
