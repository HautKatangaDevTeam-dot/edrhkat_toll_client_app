export type PosKeyRegistryEntry = {
  keyId: string;
  label: string;
  status: "active" | "legacy" | "revoked";
  createdAt: string;
  updatedAt: string;
  updatedByUserId: string | null;
  updatedByUsername: string | null;
};

export type PosKeyRegistryResponse = {
  success: boolean;
  data: PosKeyRegistryEntry[];
};
