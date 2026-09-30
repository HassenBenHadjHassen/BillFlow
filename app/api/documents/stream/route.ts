import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { StorageService } from "@/services/storage.service";
import path from "path";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");

  if (!filePath) {
    return new NextResponse("Missing file path", { status: 400 });
  }

  try {
    const buffer = await StorageService.getFileBuffer(filePath);
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".txt": "text/plain",
      ".csv": "text/csv",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";

    // Sanitize filename for HTTP header to prevent CRLF injection or header manipulation
    const rawFileName = path.basename(filePath);
    const safeHeaderFileName = rawFileName.replace(/[\r\n"\\]/g, "_").replace(/[^a-zA-Z0-9._-]/g, "_");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${safeHeaderFileName}"; filename*=UTF-8''${encodeURIComponent(safeHeaderFileName)}`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (err: unknown) {
    console.error("Document streaming error:", err);
    return new NextResponse("File not found or access denied", { status: 404 });
  }
}
