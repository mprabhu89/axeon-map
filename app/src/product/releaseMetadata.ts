import packageMetadata from '../../package.json';

export type SemanticProductVersion = `${number}.${number}.${number}` | `${number}.${number}.${number}-${string}`;
export type ReleaseChannel = 'development' | 'release-candidate' | 'stable';

export interface ProductReleaseMetadata {
  readonly productName: 'Axeon Map';
  readonly version: SemanticProductVersion;
  readonly channel: ReleaseChannel;
}

const semanticVersionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const packageVersion = packageMetadata.version;

if (!semanticVersionPattern.test(packageVersion)) {
  throw new Error('Axeon Map package version must use semantic version format.');
}

const releaseChannel = packageVersion.includes('-rc.')
  ? 'release-candidate'
  : packageVersion.includes('-') ? 'development' : 'stable';

/** package.json is the one release-promotion source; product code imports this typed view. */
export const AXEON_RELEASE: Readonly<ProductReleaseMetadata> = Object.freeze({
  productName: 'Axeon Map',
  version: packageVersion as SemanticProductVersion,
  channel: releaseChannel,
});

export const axeonVersionLabel = () => `AXEON MAP · Version ${AXEON_RELEASE.version}`;
