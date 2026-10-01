// Transport-independent evidence shape. A Real Maximo Adapter must restrict
// these records to the current user's authorized context before analysis.
export interface WorkOrderAnalyticalEvidence {
  id: string;
  site: string;
  status: string;
  priority: number | string | null;
  classification: string;
  location: string;
  asset: string | null;
  workType: string;
  reportDate: string;
  statusDate: string;
  targetStart: string | null;
  targetFinish: string | null;
  actualStart: string | null;
  actualFinish: string | null;
}
