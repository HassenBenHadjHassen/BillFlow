import fs from "fs/promises";
import path from "path";

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), "storage");

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

// Whitelist of allowed extensions and their corresponding MIME types
export const ALLOWED_EXTENSIONS_MAP: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg", "image/pjpeg"],
  ".jpeg": ["image/jpeg", "image/pjpeg"],
  ".webp": ["image/webp"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".txt": ["text/plain"],
  ".csv": ["text/csv", "application/vnd.ms-excel", "text/plain"],
};

export const ALLOWED_EXTENSIONS = new Set<string>(Object.keys(ALLOWED_EXTENSIONS_MAP));

export const ALLOWED_MIME_TYPES = new Set<string>(
  Object.values(ALLOWED_EXTENSIONS_MAP).flat()
);

// High-risk executable or script extensions that must never be permitted, even in nested/double extensions
export const DANGEROUS_EXTENSIONS = new Set<string>([
  "exe", "dll", "so", "dylib", "bin", "com", "scr", "msi", "app", "dmg", "iso",
  "bat", "cmd", "sh", "bash", "zsh", "csh", "ksh", "ps1", "psm1", "vbs", "vbe", "wsf", "wsh",
  "php", "php3", "php4", "php5", "phtml", "phar", "inc",
  "asp", "aspx", "cer", "asa", "asax", "ashx", "asmx",
  "jsp", "jspx", "jsw", "jsv", "jspa",
  "cgi", "pl", "py", "pyw", "rb", "ru",
  "js", "mjs", "cjs", "jsx", "ts", "tsx", "vue",
  "html", "htm", "xhtml", "shtml", "hta",
  "svg", "xml", "xsl", "xslt", "swf",
  "htaccess", "htpasswd", "env", "ini", "conf", "config", "reg",
  "jar", "war", "ear", "class",
]);

export interface StoredFile {
  storagePath: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  originalName?: string;
  sanitizedName?: string;
}

export interface SanitizedFileInfo {
  cleanFileName: string;
  extension: string;
  safeBaseName: string;
}

export class StorageService {
  /**
   * Resolves and secures an absolute path within LOCAL_STORAGE_DIR to prevent directory traversal.
   */
  static resolveStoragePath(storagePath: string): string {
    const clean = storagePath.replace(/\0/g, "").replace(/%00/gi, "");
    const baseDir = path.resolve(LOCAL_STORAGE_DIR);
    const resolved = path.resolve(baseDir, clean);

    if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) {
      throw new Error("Security violation: Path traversal detected in storage path");
    }
    return resolved;
  }

  /**
   * Ensures the storage target directory exists safely inside LOCAL_STORAGE_DIR.
   */
  private static async ensureLocalStorageDir(subDir: string = ""): Promise<string> {
    const cleanSubDir = subDir
      .replace(/\\/g, "/")
      .replace(/\0/g, "")
      .split("/")
      .filter((seg) => seg && seg !== "." && seg !== "..")
      .map((seg) => seg.replace(/[^a-zA-Z0-9_-]/g, "_"))
      .join(path.sep);

    const targetDir = path.resolve(LOCAL_STORAGE_DIR, cleanSubDir);
    if (!targetDir.startsWith(LOCAL_STORAGE_DIR)) {
      throw new Error("Invalid directory path: Access denied");
    }
    await fs.mkdir(targetDir, { recursive: true });
    return targetDir;
  }

  /**
   * Inspects binary buffer for dangerous executable headers (PE/MZ, ELF, Mach-O, Java bytecode, Shebang).
   */
  static checkDangerousSignatures(buffer: Buffer): string | null {
    if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
      return "Windows Executable (PE/MZ)";
    }
    if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
      return "Linux ELF Binary";
    }
    if (buffer.length >= 4 && buffer[0] === 0xca && buffer[1] === 0xfe && buffer[2] === 0xba && buffer[3] === 0xbe) {
      return "Java Bytecode / Mach-O Fat Binary";
    }
    if (
      buffer.length >= 4 &&
      ((buffer[0] === 0xfe && buffer[1] === 0xed && buffer[2] === 0xfa && (buffer[3] === 0xce || buffer[3] === 0xcf)) ||
        (buffer[0] === 0xcf && buffer[1] === 0xfa && buffer[2] === 0xed && buffer[3] === 0xfe) ||
        (buffer[0] === 0xce && buffer[1] === 0xfa && buffer[2] === 0xed && buffer[3] === 0xfe))
    ) {
      return "Mach-O Binary";
    }
    if (buffer.length >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) {
      return "Executable Script (Shebang)";
    }
    return null;
  }

  /**
   * Validates binary content against magic bytes for the declared extension.
   * Returns the verified authoritative MIME type.
   */
  static verifyMagicBytes(buffer: Buffer, extension: string): string {
    // 1. First ensure the buffer doesn't match any known executable signatures
    const dangerousSig = this.checkDangerousSignatures(buffer);
    if (dangerousSig) {
      throw new Error(`Upload rejected: File contains forbidden executable signature (${dangerousSig})`);
    }

    const ext = extension.toLowerCase();

    // 2. Specific signature inspection per allowed file type
    if (ext === ".pdf") {
      // PDF must contain '%PDF' within the first 1024 bytes
      const checkLength = Math.min(buffer.length, 1024);
      const headerStr = buffer.subarray(0, checkLength).toString("latin1");
      if (!headerStr.includes("%PDF")) {
        throw new Error("Invalid PDF file: File content is missing the %PDF signature");
      }
      return "application/pdf";
    }

    if (ext === ".png") {
      // PNG magic bytes: \x89PNG\r\n\x1a\n
      if (
        buffer.length < 8 ||
        buffer[0] !== 0x89 ||
        buffer[1] !== 0x50 ||
        buffer[2] !== 0x4e ||
        buffer[3] !== 0x47 ||
        buffer[4] !== 0x0d ||
        buffer[5] !== 0x0a ||
        buffer[6] !== 0x1a ||
        buffer[7] !== 0x0a
      ) {
        throw new Error("Invalid PNG image: Header signature mismatch");
      }
      return "image/png";
    }

    if (ext === ".jpg" || ext === ".jpeg") {
      // JPEG magic bytes: FF D8 FF
      if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
        throw new Error("Invalid JPEG image: Header signature mismatch");
      }
      return "image/jpeg";
    }

    if (ext === ".webp") {
      // WebP: RIFF....WEBP
      if (
        buffer.length < 12 ||
        buffer.subarray(0, 4).toString("ascii") !== "RIFF" ||
        buffer.subarray(8, 12).toString("ascii") !== "WEBP"
      ) {
        throw new Error("Invalid WebP image: Header signature mismatch");
      }
      return "image/webp";
    }

    if (ext === ".docx") {
      // Word (.docx) is a ZIP package: PK\x03\x04
      if (
        buffer.length < 4 ||
        buffer[0] !== 0x50 ||
        buffer[1] !== 0x4b ||
        buffer[2] !== 0x03 ||
        buffer[3] !== 0x04
      ) {
        throw new Error("Invalid Word document (.docx): Missing ZIP package signature");
      }
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    if (ext === ".doc") {
      // Legacy Word (.doc): OLE Compound File Binary format \xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1
      if (
        buffer.length < 8 ||
        buffer[0] !== 0xd0 ||
        buffer[1] !== 0xcf ||
        buffer[2] !== 0x11 ||
        buffer[3] !== 0xe0 ||
        buffer[4] !== 0xa1 ||
        buffer[5] !== 0xb1 ||
        buffer[6] !== 0x1a ||
        buffer[7] !== 0xe1
      ) {
        throw new Error("Invalid Word document (.doc): Missing OLE compound file signature");
      }
      return "application/msword";
    }

    if (ext === ".txt" || ext === ".csv") {
      // Text and CSV must not contain binary null bytes
      if (buffer.includes(0x00)) {
        throw new Error("Invalid text document: Binary null bytes detected");
      }

      // Check against embedded scripts, HTML or SVG injections (Stored XSS mitigation)
      const textSample = buffer.subarray(0, Math.min(buffer.length, 8192)).toString("utf8");
      const dangerousPatterns = [
        /<script[\s>]/i,
        /<\?php/i,
        /<!doctype\s+html/i,
        /<html[\s>]/i,
        /<svg[\s>]/i,
        /<iframe[\s>]/i,
        /<object[\s>]/i,
        /<embed[\s>]/i,
        /javascript:/i,
        /vbscript:/i,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(textSample)) {
          throw new Error("File contains disallowed script or executable markup tags");
        }
      }

      return ext === ".csv" ? "text/csv" : "text/plain";
    }

    throw new Error(`Unsupported file extension '${ext}'`);
  }

  /**
   * Sanitizes original filename:
   * - Strips path traversal sequences and null bytes
   * - Neutralizes double extensions (e.g. invoice.php.pdf)
   * - Validates against allowed extensions whitelist
   * - Retains safe characters [a-zA-Z0-9_-] and limits length
   */
  static sanitizeFileName(originalFileName: string, fallbackMimeType?: string): SanitizedFileInfo {
    if (!originalFileName || typeof originalFileName !== "string") {
      originalFileName = "document.pdf";
    }

    // 1. Strip null bytes, control chars, and path separators
    const cleanRaw = originalFileName
      .replace(/\0/g, "")
      .replace(/%00/gi, "")
      .replace(/[\r\n\t]/g, "")
      .trim();

    const baseLeaf = path.basename(cleanRaw);

    // 2. Extract extension
    let ext = path.extname(baseLeaf).toLowerCase();

    // If extension is missing, attempt to infer from fallbackMimeType
    if (!ext && fallbackMimeType) {
      for (const [e, mimes] of Object.entries(ALLOWED_EXTENSIONS_MAP)) {
        if (mimes.includes(fallbackMimeType)) {
          ext = e;
          break;
        }
      }
    }

    if (!ext) {
      throw new Error("File missing an extension. Supported extensions: .pdf, .png, .jpg, .jpeg, .webp, .doc, .docx, .txt, .csv");
    }

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(`File extension '${ext}' is not permitted. Supported: PDF, PNG, JPG, WEBP, DOCX, DOC, TXT, CSV`);
    }

    // 3. Prevent double-extension attack (e.g. file.php.pdf, payload.exe.png)
    const baseWithoutExt = path.basename(baseLeaf, path.extname(baseLeaf));
    const segments = baseWithoutExt.split(".").filter(Boolean);

    for (const seg of segments) {
      const lowerSeg = seg.toLowerCase().trim();
      if (DANGEROUS_EXTENSIONS.has(lowerSeg)) {
        throw new Error(`Upload rejected: Dangerous nested extension '.${lowerSeg}' detected in filename`);
      }
    }

    // 4. Sanitize base name: alphanumeric, hyphen, underscore only
    let safeBase = baseWithoutExt
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60);

    if (!safeBase) {
      safeBase = "document";
    }

    return {
      cleanFileName: `${safeBase}${ext}`,
      extension: ext,
      safeBaseName: safeBase,
    };
  }

  /**
   * Validates file size and basic constraints. Kept for backwards compatibility.
   */
  static validateFile(mimeType: string, size: number) {
    if (size <= 0) {
      throw new Error("File is empty (0 bytes)");
    }

    if (size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds 25MB limit (received ${(size / (1024 * 1024)).toFixed(1)}MB)`);
    }

    if (mimeType && mimeType !== "application/octet-stream" && !ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error(`File type '${mimeType}' is not supported. Supported: PDF, Images, Word, Text, CSV`);
    }
  }

  /**
   * Full validation and sanitization pipeline for upload buffers.
   */
  static validateAndSanitize(
    buffer: Buffer,
    originalFileName: string,
    claimedMimeType?: string
  ): { cleanFileName: string; detectedMimeType: string; extension: string } {
    if (buffer.length === 0) {
      throw new Error("Uploaded file is empty (0 bytes)");
    }

    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds 25MB limit (received ${(buffer.length / (1024 * 1024)).toFixed(1)}MB)`);
    }

    // Sanitize filename & check extensions
    const { cleanFileName, extension } = this.sanitizeFileName(originalFileName, claimedMimeType);

    // Verify magic bytes & get verified MIME type
    const detectedMimeType = this.verifyMagicBytes(buffer, extension);

    // If client claimed a specific MIME type, check for major conflicts
    if (claimedMimeType && claimedMimeType !== "application/octet-stream") {
      const allowedForExt = ALLOWED_EXTENSIONS_MAP[extension] || [];
      if (!allowedForExt.includes(claimedMimeType) && !allowedForExt.includes(detectedMimeType)) {
        throw new Error(
          `MIME type mismatch: Declared type '${claimedMimeType}' does not match verified file extension '${extension}'`
        );
      }
    }

    return { cleanFileName, detectedMimeType, extension };
  }

  /**
   * Saves a file buffer to storage after full sanitization, magic byte inspection, and path traversal defense.
   */
  static async uploadFile(
    fileBuffer: Buffer | Uint8Array,
    fileName: string,
    mimeType?: string,
    folder: string = "general"
  ): Promise<StoredFile> {
    const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);

    // Run complete sanitization pipeline
    const { cleanFileName, detectedMimeType } = this.validateAndSanitize(buffer, fileName, mimeType);

    // Generate collision-resistant unique filename
    const uniqueFileName = `${Date.now()}_${cleanFileName}`;

    // Sanitize folder path
    const cleanFolder = folder
      .replace(/\\/g, "/")
      .replace(/\0/g, "")
      .split("/")
      .filter((seg) => seg && seg !== "." && seg !== "..")
      .map((seg) => seg.replace(/[^a-zA-Z0-9_-]/g, "_"))
      .join("/");

    const targetFolder = cleanFolder || "general";
    const relativePath = `${targetFolder}/${uniqueFileName}`;

    // Ensure directory exists within protected storage root
    await this.ensureLocalStorageDir(targetFolder);

    // Resolve path strictly within storage root
    const absolutePath = this.resolveStoragePath(relativePath);
    await fs.writeFile(absolutePath, buffer);

    const fileUrl = `/api/documents/stream?path=${encodeURIComponent(relativePath)}`;

    return {
      storagePath: relativePath,
      fileUrl,
      fileSize: buffer.length,
      mimeType: detectedMimeType,
      originalName: fileName,
      sanitizedName: cleanFileName,
    };
  }

  /**
   * Retrieves a file safely from local storage.
   */
  static async getFileBuffer(storagePath: string): Promise<Buffer> {
    const absolutePath = this.resolveStoragePath(storagePath);
    return fs.readFile(absolutePath);
  }

  /**
   * Deletes a file safely from local storage.
   */
  static async deleteFile(storagePath: string): Promise<void> {
    try {
      const absolutePath = this.resolveStoragePath(storagePath);
      await fs.unlink(absolutePath);
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code !== "ENOENT") {
        console.error("Failed to delete file from storage:", err);
      }
    }
  }
}
