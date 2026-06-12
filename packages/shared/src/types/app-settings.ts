export type AppSettingsResponse = {
  version: string;
  changelog: string[];
};

export type UpdateChangelogVersionRequest = {
  version: string;
};

export type UpdateChangelogVersionResponse = {
  success: boolean;
  lastChangelogVersion: string;
};
