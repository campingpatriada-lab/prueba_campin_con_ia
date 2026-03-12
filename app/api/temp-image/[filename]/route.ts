import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const TEMP_DIR = path.join(process.cwd(), "public", "temp");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const filePath = path.join(TEMP_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  } catch (error) {
    return new NextResponse("Error", { status: 500 });
  }
}
