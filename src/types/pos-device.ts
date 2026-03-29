export type PosDeviceMonitor = {
  id: string;
  deviceType: string | null;
  label: string | null;
  contactPhone: string | null;
  assignedPost: string | null;
  isActive: boolean;
  lastSeenAt: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  stale: boolean;
  staleMinutes: number | null;
};

export type PosDevicesResponse = {
  success: boolean;
  stale_minutes: number;
  stale_count: number;
  data: PosDeviceMonitor[];
};

export type PosDeviceResponse = {
  success: boolean;
  data: PosDeviceMonitor;
};
