export type CreateReportRequest = {
  reportedUserId: string;
  reason?: string;
};

export type ReportItem = {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterUsername: string;
  reportedUserId: string;
  reportedUserName: string;
  reportedUserUsername: string;
  reason: string | null;
  createdAt: string;
};
