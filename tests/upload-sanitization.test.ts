import { describe, it, expect } from "vitest";
import { StorageService } from "@/services/storage.service";

describe("Upload Sanitization & Security", () => {
  describe("Filename Sanitization", () => {
    it("should sanitize filenames with spaces and special characters", () => {
      const result = StorageService.sanitizeFileName("Invoice #1002 (Signed) [v2]!.pdf");
      expect(result.cleanFileName).toBe("Invoice_1002_Signed_v2.pdf");
      expect(result.extension).toBe(".pdf");
    });

    it("should normalize uppercase extensions to lowercase", () => {
      const result = StorageService.sanitizeFileName("CONTRACT_AGREEMENT.PDF");
      expect(result.cleanFileName).toBe("CONTRACT_AGREEMENT.pdf");
      expect(result.extension).toBe(".pdf");
    });

    it("should strip path traversal from filenames", () => {
      const result = StorageService.sanitizeFileName("../../../../var/log/contract.pdf");
      expect(result.cleanFileName).toBe("contract.pdf");
    });

    it("should strip null bytes from filenames", () => {
      const result = StorageService.sanitizeFileName("document\0.pdf");
      expect(result.cleanFileName).toBe("document.pdf");
    });

    it("should reject dangerous nested double-extensions", () => {
      expect(() => StorageService.sanitizeFileName("invoice.php.pdf")).toThrow(
        /Dangerous nested extension '\.php'/
      );
      expect(() => StorageService.sanitizeFileName("contract.exe.png")).toThrow(
        /Dangerous nested extension '\.exe'/
      );
      expect(() => StorageService.sanitizeFileName("payload.sh.txt")).toThrow(
        /Dangerous nested extension '\.sh'/
      );
      expect(() => StorageService.sanitizeFileName("backdoor.phtml.jpg")).toThrow(
        /Dangerous nested extension '\.phtml'/
      );
      expect(() => StorageService.sanitizeFileName("hack.bat.csv")).toThrow(
        /Dangerous nested extension '\.bat'/
      );
    });

    it("should reject disallowed extensions entirely", () => {
      expect(() => StorageService.sanitizeFileName("evil.exe")).toThrow(/not permitted/);
      expect(() => StorageService.sanitizeFileName("script.sh")).toThrow(/not permitted/);
      expect(() => StorageService.sanitizeFileName("index.php")).toThrow(/not permitted/);
      expect(() => StorageService.sanitizeFileName("vector.svg")).toThrow(/not permitted/);
      expect(() => StorageService.sanitizeFileName("page.html")).toThrow(/not permitted/);
    });

    it("should infer extension from fallback MIME type if extension is missing", () => {
      const result = StorageService.sanitizeFileName("my_invoice_file", "application/pdf");
      expect(result.cleanFileName).toBe("my_invoice_file.pdf");
      expect(result.extension).toBe(".pdf");
    });
  });

  describe("Magic Bytes & File Signature Validation", () => {
    it("should accept valid PDF headers", () => {
      const pdfBuf = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
      const mime = StorageService.verifyMagicBytes(pdfBuf, ".pdf");
      expect(mime).toBe("application/pdf");
    });

    it("should accept valid PNG headers", () => {
      const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
      const mime = StorageService.verifyMagicBytes(pngBuf, ".png");
      expect(mime).toBe("image/png");
    });

    it("should accept valid JPEG headers", () => {
      const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
      const mime = StorageService.verifyMagicBytes(jpegBuf, ".jpg");
      expect(mime).toBe("image/jpeg");
    });

    it("should accept valid WebP headers", () => {
      const webpBuf = Buffer.concat([
        Buffer.from("RIFF"),
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
        Buffer.from("WEBP"),
      ]);
      const mime = StorageService.verifyMagicBytes(webpBuf, ".webp");
      expect(mime).toBe("image/webp");
    });

    it("should accept valid Word .docx headers", () => {
      const docxBuf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
      const mime = StorageService.verifyMagicBytes(docxBuf, ".docx");
      expect(mime).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    });

    it("should reject Windows PE executables disguised as PDF", () => {
      const exeDisguised = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
      expect(() => StorageService.verifyMagicBytes(exeDisguised, ".pdf")).toThrow(
        /forbidden executable signature \(Windows Executable/
      );
    });

    it("should reject Linux ELF binaries disguised as images", () => {
      const elfDisguised = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01]);
      expect(() => StorageService.verifyMagicBytes(elfDisguised, ".png")).toThrow(
        /forbidden executable signature \(Linux ELF Binary\)/
      );
    });

    it("should reject shell scripts with shebang disguised as text", () => {
      const shellScript = Buffer.from("#!/bin/bash\nrm -rf /");
      expect(() => StorageService.verifyMagicBytes(shellScript, ".txt")).toThrow(
        /forbidden executable signature \(Executable Script/
      );
    });

    it("should reject fake PDF containing random text", () => {
      const fakePdf = Buffer.from("Hello world this is not a PDF");
      expect(() => StorageService.verifyMagicBytes(fakePdf, ".pdf")).toThrow(
        /missing the %PDF signature/
      );
    });

    it("should reject text files containing HTML script tags (Stored XSS defense)", () => {
      const xssText = Buffer.from("Hello world\n<script>alert(document.cookie)</script>");
      expect(() => StorageService.verifyMagicBytes(xssText, ".txt")).toThrow(
        /disallowed script or executable markup/
      );
    });

    it("should reject text files containing PHP tags", () => {
      const phpText = Buffer.from("<?php echo system($_GET['cmd']); ?>");
      expect(() => StorageService.verifyMagicBytes(phpText, ".txt")).toThrow(
        /disallowed script or executable markup/
      );
    });

    it("should reject text files containing SVG tags", () => {
      const svgText = Buffer.from("<svg onload='alert(1)'></svg>");
      expect(() => StorageService.verifyMagicBytes(svgText, ".txt")).toThrow(
        /disallowed script or executable markup/
      );
    });

    it("should reject text files with null bytes", () => {
      const nullByteText = Buffer.from("Valid text\0with hidden payload");
      expect(() => StorageService.verifyMagicBytes(nullByteText, ".txt")).toThrow(
        /Binary null bytes detected/
      );
    });
  });

  describe("Storage Path Traversal Shield", () => {
    it("should block relative paths attempting to escape storage root", () => {
      expect(() => StorageService.resolveStoragePath("../../../etc/passwd")).toThrow(
        /Path traversal detected/
      );
      expect(() => StorageService.resolveStoragePath("..\\..\\windows\\win.ini")).toThrow(
        /Path traversal detected/
      );
      expect(() => StorageService.resolveStoragePath("contracts/../../../etc/shadow")).toThrow(
        /Path traversal detected/
      );
    });

    it("should safely allow paths strictly inside storage root", () => {
      const resolved = StorageService.resolveStoragePath("invoices/17277000_Invoice_101.pdf");
      expect(resolved).toContain("invoices");
      expect(resolved).toContain("17277000_Invoice_101.pdf");
    });
  });

  describe("File Size & Empty File Verification", () => {
    it("should reject empty (0 bytes) file buffer", () => {
      expect(() =>
        StorageService.validateAndSanitize(Buffer.alloc(0), "empty.pdf")
      ).toThrow(/empty/);
    });

    it("should reject file exceeding 25MB limit", () => {
      const hugeBuffer = Buffer.alloc(26 * 1024 * 1024);
      expect(() =>
        StorageService.validateAndSanitize(hugeBuffer, "large.pdf")
      ).toThrow(/exceeds 25MB limit/);
    });
  });
});
