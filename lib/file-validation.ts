/**
 * File upload security utilities
 * Validates and sanitizes file uploads
 */

export interface FileValidationConfig {
  maxSize: number; // bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

const DEFAULT_FILE_CONFIG: FileValidationConfig = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ],
  allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
};

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  config: FileValidationConfig = DEFAULT_FILE_CONFIG
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > config.maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${config.maxSize / 1024 / 1024}MB`,
    };
  }

  // Check MIME type
  if (!config.allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  // Check file extension
  const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
  if (!config.allowedExtensions.includes(fileExt)) {
    return {
      valid: false,
      error: `File extension ${fileExt} is not allowed`,
    };
  }

  // The content itself is checked server-side by matchesFileSignature
  return { valid: true };
}

// Leading bytes (file signature) for each allowed MIME type
const MAGIC_BYTES: Record<string, number[]> = {
  "application/pdf": [0x25, 0x50, 0x44, 0x46], // %PDF
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF
};

/**
 * Check that the file content starts with the signature of its declared type,
 * so a renamed HTML or executable can't pass as an image or PDF.
 */
export async function matchesFileSignature(file: Blob): Promise<boolean> {
  const signature = MAGIC_BYTES[file.type];
  if (!signature) return false;

  const head = new Uint8Array(
    await file.slice(0, signature.length).arrayBuffer()
  );
  return signature.every((byte, i) => head[i] === byte);
}

/**
 * get safe filename
 */
export function getSafeFilename(filename: string): string {
  // Remove path components
  let safe = filename.split("/").pop()?.split("\\").pop() || "file";

  // Remove special characters, keep only alphanumeric, dots, and hyphens
  safe = safe.replace(/[^a-zA-Z0-9.\-_]/g, "_");

  // Limit length
  const maxLength = 255;
  if (safe.length > maxLength) {
    const ext = safe.substring(safe.lastIndexOf("."));
    safe = safe.substring(0, maxLength - ext.length) + ext;
  }

  // Prevent directory traversal
  if (safe.includes("..") || safe.startsWith(".")) {
    safe = "file_" + Date.now();
  }

  return safe;
}

/**
 * Create unique filename with timestamp
 */
export function createUniqueFilename(originalFilename: string): string {
  const safe = getSafeFilename(originalFilename);
  const ext = safe.substring(safe.lastIndexOf("."));
  const nameWithoutExt = safe.substring(0, safe.lastIndexOf("."));
  
  return `${nameWithoutExt}_${Date.now()}${ext}`;
}

/**
 * Get file configuration for specific file type
 */
export function getFileConfigForType(
  type: "identification" | "document" | "image"
): FileValidationConfig {
  switch (type) {
    case "identification":
      return {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
        allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png"],
      };
    case "document":
      return {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        allowedExtensions: [".pdf", ".doc", ".docx"],
      };
    case "image":
      return {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
        allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
      };
    default:
      return DEFAULT_FILE_CONFIG;
  }
}

/**
 * Validate multiple files
 */
export function validateFiles(
  files: File[],
  config?: FileValidationConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const file of files) {
    const result = validateFile(file, config);
    if (!result.valid && result.error) {
      errors.push(`${file.name}: ${result.error}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if file is of a specific type
 */
export function isFileType(
  file: File,
  type: "identification" | "document" | "image"
): boolean {
  const config = getFileConfigForType(type);
  return validateFile(file, config).valid;
}
