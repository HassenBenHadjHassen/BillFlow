import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { ZipFile } from "yazl";
import { getSession } from "@/lib/auth";
import { DocumentService } from "@/services/document.service";
import { StorageService } from "@/services/storage.service";

export const runtime = "nodejs";

function archiveName(name: string, filePath: string, usedNames: Set<string>) {
  const original = path.win32.parse(name);
  let stem = original.name
    .normalize("NFC")
    .replace(/[\p{Cc}<>:"|?*]/gu, "_")
    .replace(/^[. ]+|[. ]+$/g, "") || "document";
  if (/^(CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])(?:\.|$)/i.test(stem)) stem = "_" + stem;
  if (Buffer.byteLength(stem) > 240) stem = Array.from(stem).slice(0, 58).join("");

  const extension = path.extname(filePath);
  let entry = stem + extension;
  for (let suffix = 2; usedNames.has(entry.toLowerCase()); suffix++) {
    entry = stem + " (" + suffix + ")" + extension;
  }
  usedNames.add(entry.toLowerCase());
  return entry;
}

export async function GET() {
  if (!await getSession()) return new Response("Unauthorized", { status: 401 });

  try {
    const documents = await DocumentService.getDocumentsForDownload();
    if (!documents.length) return new Response("There are no documents to download.", { status: 404 });

    const root = await realpath(StorageService.resolveStoragePath("."));
    const usedNames = new Set<string>();
    const entries = [];
    // Check the whole vault before sending headers so a missing file does not produce an incomplete ZIP.
    for (const document of documents) {
      const filePath = await realpath(StorageService.resolveStoragePath(document.storagePath));
      const relativePath = path.relative(root, filePath);
      if (!relativePath || relativePath === ".." || relativePath.startsWith(".." + path.sep) || path.isAbsolute(relativePath)) {
        throw new Error("Document path points outside storage");
      }
      const file = await stat(filePath);
      if (!file.isFile()) throw new Error("Document path does not point to a file");
      entries.push({
        name: archiveName(document.name, filePath, usedNames),
        path: filePath,
        size: file.size,
        uploadedAt: document.uploadedAt,
      });
    }

    const zip = new ZipFile();
    // Yazl exposes a PassThrough stream, typed as NodeJS.ReadableStream in its declarations.
    const output = zip.outputStream as Readable;
    const transfer = new AbortController();
    output.once("close", () => transfer.abort());
    zip.on("error", (error) => output.destroy(error));
    const body = Readable.toWeb(output, {
      strategy: { highWaterMark: 64 * 1024, size: (chunk: Uint8Array) => chunk.byteLength },
    }) as ReadableStream<Uint8Array>;

    for (const entry of entries) {
      zip.addReadStreamLazy(entry.name, {
        size: entry.size,
        mtime: entry.uploadedAt,
        compress: false,
      }, (callback) => {
        const file = createReadStream(entry.path, { signal: transfer.signal });
        file.once("error", (error) => output.destroy(error));
        callback(null, file);
      });
    }
    zip.end();

    const date = new Date().toISOString().slice(0, 10);
    return new Response(body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="billflow-documents-' + date + '.zip"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Document archive error:", error);
    return new Response("Could not download all documents. A file may be unavailable.", { status: 500 });
  }
}
