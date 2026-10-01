import {
  adapterCapabilities, adapterError, type AdapterSecurityContext, type AnalyticalEvidenceAdapter,
  type AnalyticalEvidenceRequest, type AnalyticalEvidenceResponse, type ExplorationRequest,
  type ExplorationResponse, type FilterValuesRequest, type FilterValuesResponse, type MaximoAdapterProfile,
  type RecordExportRequest, type RecordExportResponse, type RecordPreviewRequest, type RecordPreviewResponse,
} from './maximoAdapter';
import { axeonLogger } from '../support/logger';

const REAL_NOT_CONFIGURED_SECURITY_CONTEXT: AdapterSecurityContext = Object.freeze({
  kind: 'current-user', enforcement: 'not-configured', source: 'real-adapter',
});

export const REAL_MAXIMO_ADAPTER_PROFILE: MaximoAdapterProfile = Object.freeze({
  id: 'real-maximo', displayName: 'Real Maximo Adapter', mode: 'production', availability: 'not-configured',
  capabilities: adapterCapabilities([]), securityContext: REAL_NOT_CONFIGURED_SECURITY_CONTEXT,
});

const unavailable = <T>(): Promise<T> => {
  axeonLogger.security({ eventCode: 'AX-SEC-ADAPTER-REJECTED', component: 'adapter', operation: 'real-adapter', result: 'rejected', errorCode: 'unavailable', adapterId: 'real-maximo', adapterMode: 'production', securityScope: 'not-configured' });
  return Promise.reject(adapterError('unavailable'));
};

// Non-executing port only. No endpoint, Object Structure, credential, query syntax, network call, or Mock fallback exists here.
export class RealMaximoAdapter implements AnalyticalEvidenceAdapter {
  readonly profile = REAL_MAXIMO_ADAPTER_PROFILE;
  explore(_request: ExplorationRequest): Promise<ExplorationResponse> { return unavailable(); }
  filterValues(_request: FilterValuesRequest): Promise<FilterValuesResponse> { return unavailable(); }
  previewRecords(_request: RecordPreviewRequest): Promise<RecordPreviewResponse> { return unavailable(); }
  exportRecords(_request: RecordExportRequest): Promise<RecordExportResponse> { return unavailable(); }
  analyticalEvidence(_request: AnalyticalEvidenceRequest): Promise<AnalyticalEvidenceResponse> { return unavailable(); }
}

export const realMaximoAdapter = new RealMaximoAdapter();
