import type { AuthUser, CreateReportRequest, ReportItem } from '@game-platform/shared';
import { ReportsRepository } from './reports.repository.js';

export class ReportsError extends Error {
  constructor(public message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'ReportsError';
  }
}

export class ReportsService {
  private repository = new ReportsRepository();

  async createReport(user: AuthUser, data: CreateReportRequest) {
    if (user.id === data.reportedUserId) {
      throw new ReportsError('You cannot report yourself', 400);
    }

    await this.repository.createReport({
      reporterId: user.id,
      reportedUserId: data.reportedUserId,
      reason: data.reason || null
    });

    return { message: 'Report submitted successfully' };
  }

  async listReports(user: AuthUser): Promise<ReportItem[]> {
    if (user.role !== 'admin' && user.role !== 'observer') {
      throw new ReportsError('Forbidden', 403);
    }

    return await this.repository.listReports();
  }
}
