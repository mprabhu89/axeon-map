import { axeonVersionLabel } from '../product/releaseMetadata';

export function AppFooter() {
  return <footer className="app-footer" aria-label="Product version">{axeonVersionLabel()}</footer>;
}
