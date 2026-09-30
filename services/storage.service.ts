import fs from "fs/promises";
import path from "path";

const LOCAL_STORAGE_DIR = path.join(process.cwd(), "storage");

// Allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export interface StoredFile {
  storagePath: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export class StorageService {
  private static async ensureLocalStorageDir(subDir: string = "") {
    const targetDir = path.join(LOCAL_STORAGE_DIR, subDir);
    await fs.mkdir(targetDir, { recursive: true });
    return targetDir;
  }

  /**
   * Validates file mime type and size
   */
  static validateFile(mimeType: string, size: number) {
    if (size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds 25MB limit (received ${(size / (1024 * 1024)).toFixed(1)}MB)`);
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error(`File type '${mimeType}' is not supported. Supported: PDF, Images, Word, Text, CSV`);
    }
  }

  /**
   * Saves a file buffer to storage (Supabase or local protected storage)
   */
  static async uploadFile(
    fileBuffer: Buffer | Uint8Array,
    fileName: string,
    mimeType: string,
    folder: string = "general"
  ): Promise<StoredFile> {
    const size = fileBuffer.length;
    this.validateFile(mimeType, size);

    // Sanitize filename
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueFileName = `${Date.now()}_${cleanFileName}`;
    const relativePath = path.join(folder, uniqueFileName).replace(/\\/g, "/");

    // Local protected storage
    await this.ensureLocalStorageDir(folder);
    const absolutePath = path.join(LOCAL_STORAGE_DIR, relativePath);
    await fs.writeFile(absolutePath, Buffer.from(fileBuffer));

    // File URL points to protected download route
    const fileUrl = `/api/documents/stream?path=${encodeURIComponent(relativePath)}`;

    return {
      storagePath: relativePath,
      fileUrl,
      fileSize: size,
      mimeType,
    };
  }

  /**
   * Retrieves a file from local storage
   */
  static async getFileBuffer(storagePath: string): Promise<Buffer> {
    const safePath = path.normalize(storagePath).replace(/^(\.\.(\/|\\|$))+/, "");
    const absolutePath = path.join(LOCAL_STORAGE_DIR, safePath);
    return fs.readFile(absolutePath);
  }

  /**
   * Deletes a file from storage
   */
  static async deleteFile(storagePath: string): Promise<void> {
    try {
      const safePath = path.normalize(storagePath).replace(/^(\.\.(\/|\\|$))+/, "");
      const absolutePath = path.join(LOCAL_STORAGE_DIR, safePath);
      await fs.unlink(absolutePath);
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code !== "ENOENT") {
        console.error("Failed to delete file from storage:", err);
      }
    }
  }
}
