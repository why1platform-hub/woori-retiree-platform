import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/auth";
import PlatformSettings from "@/models/PlatformSettings";

export async function GET() {
  try {
    await dbConnect();
    const settings = await PlatformSettings.findOne();
    
    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        platformName: { en: "Woori Retiree Platform", ko: "우리 은퇴자 플랫폼" },
        platformLogo: { url: "", fileName: "" },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching platform settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth || auth.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await dbConnect();
    const body = await req.json();

    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      {
        platformName: body.platformName || {},
        platformLogo: body.platformLogo || {},
        updatedBy: auth.sub,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating platform settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
