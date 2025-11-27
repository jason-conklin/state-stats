export type StateInfo = {
  id: string;
  name: string;
  abbreviation: string;
};

export type DataSourceInfo = {
  id: string;
  name: string;
  description?: string;
  homepageUrl?: string;
  apiDocsUrl?: string;
};

export type MetricDefinition = {
  id: string;
  name: string;
  description: string;
  unit: string;
  sourceId: string;
  category: string;
  isDefault?: boolean;
};

export type ObservationRecord = {
  stateId: string;
  metricId: string;
  year: number;
  value: number;
};

export type IngestionStatus = "in_progress" | "success" | "failed" | "partial";

export type IngestionSummary = {
  runId: string;
  status: IngestionStatus;
  startedAt: string;
  completedAt: string | null;
  counts: {
    states: number;
    observationsInserted: number;
    observationsUpdated: number;
    years: { start: number; end: number };
  };
  errors: string[];
};
