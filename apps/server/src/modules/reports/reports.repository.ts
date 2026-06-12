import { db } from '../../db/index.js';
import { userReports, users, type NewUserReport } from '../../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { ReportItem } from '@game-platform/shared';

export class ReportsRepository {
  async createReport(report: NewUserReport) {
    const [result] = await db.insert(userReports).values(report).returning();
    return result;
  }

  async listReports(): Promise<ReportItem[]> {
    const reporter = alias(users, 'reporter');
    const reported = alias(users, 'reported');

    const results = await db
      .select({
        id: userReports.id,
        reporterId: userReports.reporterId,
        reporterName: reporter.fullName,
        reporterUsername: reporter.username,
        reportedUserId: userReports.reportedUserId,
        reportedUserName: reported.fullName,
        reportedUserUsername: reported.username,
        reason: userReports.reason,
        createdAt: userReports.createdAt
      })
      .from(userReports)
      .innerJoin(reporter, eq(userReports.reporterId, reporter.id))
      .innerJoin(reported, eq(userReports.reportedUserId, reported.id))
      .orderBy(desc(userReports.createdAt));

    return results.map(r => ({
      ...r,
      reporterName: r.reporterName || r.reporterUsername,
      reportedUserName: r.reportedUserName || r.reportedUserUsername,
      createdAt: r.createdAt.toISOString()
    }));
  }
}
