import { NextRequest, NextResponse } from "next/server";
import { generateServiceSummaryReport } from "@/lib/gemini";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      serviceTitle = "Sunday Worship Service",
      attendanceYT = 0,
      attendanceIG = 0,
      prayerRequests = [],
      visitors = [],
      messagesBroadcasted = 0,
      sessionId,
    } = body;

    const report = await generateServiceSummaryReport({
      serviceTitle,
      attendanceYT,
      attendanceIG,
      prayerRequests,
      visitors,
      messagesBroadcasted,
    });

    // Save report to database if session exists
    let savedReport = null;
    if (sessionId) {
      try {
        savedReport = await db.serviceReport.upsert({
          where: { sessionId },
          update: {
            totalAttendance: attendanceYT + attendanceIG,
            totalPrayers: prayerRequests.length,
            totalVisitors: visitors.length,
            totalMessagesSent: messagesBroadcasted,
            aiExecutiveSummary: report.summary,
            pastorTakeaways: report.actionItems,
          },
          create: {
            sessionId,
            totalAttendance: attendanceYT + attendanceIG,
            totalPrayers: prayerRequests.length,
            totalVisitors: visitors.length,
            totalMessagesSent: messagesBroadcasted,
            aiExecutiveSummary: report.summary,
            pastorTakeaways: report.actionItems,
          },
        });
      } catch (e) {
        console.warn("Could not upsert report to DB:", e);
      }
    }

    return NextResponse.json({
      success: true,
      report,
      savedReport,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate service summary" },
      { status: 500 }
    );
  }
}
