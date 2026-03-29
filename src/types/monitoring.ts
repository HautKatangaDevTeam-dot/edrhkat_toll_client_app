export type MonitoringIncidentStatus = "active" | "resolved";
export type MonitoringIncidentSeverity = "error" | "warning";

export type MonitoringIncident = {
  id: string;
  fingerprint: string;
  severity: MonitoringIncidentSeverity;
  status: MonitoringIncidentStatus;
  source: string;
  code: string | null;
  message: string;
  normalized_path: string | null;
  method: string | null;
  last_http_status: number | null;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  last_user_id: string | null;
  last_username: string | null;
  last_device_id: string | null;
  sample_details: unknown;
  sample_stack: string | null;
  resolved_at: string | null;
  resolved_by_user_id: string | null;
  resolved_by_username: string | null;
};

export type MonitoringSummary = {
  activeCount: number;
  resolvedCount: number;
  criticalCount: number;
};

export type MonitoringIncidentsResponse = {
  success: boolean;
  data: MonitoringIncident[];
  summary: MonitoringSummary;
};

export type MonitoringIncidentResponse = {
  success: boolean;
  data: MonitoringIncident;
};

export type HealthStatusResponse = {
  status: "ok";
  timestamp: string;
  uptime: number;
};
