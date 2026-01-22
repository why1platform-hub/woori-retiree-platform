import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/auth";
import PlatformSettings from "@/models/PlatformSettings";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth || auth.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await dbConnect();
    const formData = await req.formData();
    const file = formData.get("logo") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to base64 for storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Update settings with new logo
    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      {
        platformLogo: {
          url: dataUrl,
          fileName: file.name,
        },
        updatedBy: auth.sub,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      logo: settings.platformLogo,
    });
  } catch (error) {
    console.error("Error uploading logo:", error);
    return NextResponse.json({ error: "Failed to upload logo" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth || auth.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await dbConnect();

    // Update settings to clear the logo
    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      {
        platformLogo: {
          url: "",
          fileName: "",
        },
        updatedBy: auth.sub,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      logo: settings.platformLogo,
    });
  } catch (error) {
    console.error("Error deleting logo:", error);
    return NextResponse.json({ error: "Failed to delete logo" }, { status: 500 });
  }
}
