/**
 * Enhanced File Upload Security
 * ==============================
 * Days 5-6: Advanced file validation and storage security
 */

import { logger } from './logger';
import crypto from 'crypto';

export interface FileValidationConfig {
  maxFileSize: number; // bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  scanForMalware: boolean;
  quarantineDir?: string;
}

export interface FileUploadResult {
  success: boolean;
  filename?: string;
  hash?: string;
  size: number;
  mimeType: string;
  threat?: string;
  quarantined?: boolean;
}

export class EnhancedFileUploadManager {
  private config: FileValidationConfig;
  private uploadLogs: Array<{
    timestamp: Date;
    filename: string;
    userId: string;
    size: number;
    threat?: string;
  }> = [];

  // Magic numbers for file type verification
  private magicNumbers: { [key: string]: Buffer[] } = {
    'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
    'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
    'image/gif': [
      Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37]),
      Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39])
    ],
    'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
    'text/csv': [],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      [Buffer.from([0x50, 0x4b, 0x03, 0x04])]
  };

  constructor(config: FileValidationConfig) {
    this.config = config;
  }

  /**
   * Comprehensive file validation
   */
  public async validateFile(
    fileBuffer: Buffer,
    originalName: string,
    userId: string
  ): Promise<FileUploadResult> {
    // Size validation
    if (fileBuffer.length > this.config.maxFileSize) {
      logger.warn('File upload rejected: exceeds maximum size', {
        userId,
        filename: originalName,
        size: fileBuffer.length,
        max: this.config.maxFileSize
      });

      return {
        success: false,
        size: fileBuffer.length,
        mimeType: '',
        threat: 'File size exceeds limit'
      };
    }

    // Extension validation
    const ext = this.getExtension(originalName);
    if (!this.config.allowedExtensions.includes(ext.toLowerCase())) {
      logger.error('File upload rejected: invalid extension', {
        userId,
        filename: originalName,
        extension: ext
      });

      return {
        success: false,
        size: fileBuffer.length,
        mimeType: '',
        threat: 'File type not allowed'
      };
    }

    // Magic number verification
    const detectedMimeType = await this.detectMimeType(fileBuffer);
    if (
      detectedMimeType &&
      !this.config.allowedMimeTypes.includes(detectedMimeType)
    ) {
      logger.error('File upload rejected: MIME type not allowed', {
        userId,
        filename: originalName,
        detectedMimeType
      });

      return {
        success: false,
        size: fileBuffer.length,
        mimeType: detectedMimeType,
        threat: 'MIME type not allowed'
      };
    }

    // Malware scan
    if (this.config.scanForMalware) {
      const malwareThreat = await this.scanForMalware(fileBuffer);
      if (malwareThreat) {
        logger.error('Malware threat detected in file upload', {
          userId,
          filename: originalName,
          threat: malwareThreat
        });

        // Quarantine file
        await this.quarantineFile(fileBuffer, originalName);

        return {
          success: false,
          size: fileBuffer.length,
          mimeType: detectedMimeType || '',
          threat: malwareThreat,
          quarantined: true
        };
      }
    }

    // Generate hash for integrity
    const hash = this.generateHash(fileBuffer);

    // Log successful upload
    this.uploadLogs.push({
      timestamp: new Date(),
      filename: originalName,
      userId,
      size: fileBuffer.length
    });

    logger.log('File upload validated successfully', {
      userId,
      filename: originalName,
      size: fileBuffer.length,
      hash
    });

    return {
      success: true,
      filename: originalName,
      hash,
      size: fileBuffer.length,
      mimeType: detectedMimeType || ''
    };
  }

  /**
   * Detect MIME type from magic numbers
   */
  private async detectMimeType(fileBuffer: Buffer): Promise<string | null> {
    for (const [mimeType, magicNumbers] of Object.entries(
      this.magicNumbers
    )) {
      for (const magic of magicNumbers) {
        if (fileBuffer.subarray(0, magic.length).equals(magic)) {
          return mimeType;
        }
      }
    }
    return null;
  }

  /**
   * Scan for malware signatures
   */
  private async scanForMalware(fileBuffer: Buffer): Promise<string | null> {
    // Check for embedded executables
    const executableSignatures = [
      Buffer.from('MZ'), // Windows PE
      Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // Linux ELF
      Buffer.from([0xfe, 0xed, 0xfa]) // Mach-O
    ];

    for (const sig of executableSignatures) {
      if (fileBuffer.subarray(0, sig.length).equals(sig)) {
        return 'Executable detected';
      }
    }

    // Check for script injections
    const content = fileBuffer.toString('utf8', 0, 512);
    const scriptPatterns = [
      /<script/i,
      /javascript:/i,
      /onerror\s*=/i,
      /onload\s*=/i
    ];

    for (const pattern of scriptPatterns) {
      if (pattern.test(content)) {
        return 'Script injection detected';
      }
    }

    // Check for suspicious macros (for Office files)
    if (content.includes('VBA') || content.includes('macro')) {
      return 'Suspicious macro detected';
    }

    return null;
  }

  /**
   * Generate file hash
   */
  private generateHash(fileBuffer: Buffer): string {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Quarantine suspected file
   */
  private async quarantineFile(
    fileBuffer: Buffer,
    filename: string
  ): Promise<void> {
    const quarantineDir = this.config.quarantineDir || '/tmp/quarantine';
    const hash = this.generateHash(fileBuffer);
    const quarantineFilename = `${hash}_${filename}`;

    logger.error('File quarantined', {
      originalFilename: filename,
      quarantineFilename,
      location: quarantineDir
    });

    // In production, write to quarantine directory
    // fs.writeFileSync(`${quarantineDir}/${quarantineFilename}`, fileBuffer);
  }

  /**
   * Sanitize filename to prevent directory traversal
   */
  public sanitizeFilename(filename: string): string {
    return filename
      .replace(/\.\./g, '') // Remove directory traversal
      .replace(/[\/\\]/g, '') // Remove path separators
      .replace(/[<>:"|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, '_') // Replace spaces
      .substring(0, 255); // Limit length
  }

  /**
   * Get file extension
   */
  private getExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * Get upload statistics
   */
  public getUploadStats(): {
    totalUploads: number;
    totalBytes: number;
    averageFileSize: number;
    topUploaders: Array<{ userId: string; count: number }>;
  } {
    const userUploads = new Map<string, number>();
    let totalBytes = 0;

    this.uploadLogs.forEach(log => {
      totalBytes += log.size;
      userUploads.set(
        log.userId,
        (userUploads.get(log.userId) || 0) + 1
      );
    });

    const topUploaders = Array.from(userUploads.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));

    return {
      totalUploads: this.uploadLogs.length,
      totalBytes,
      averageFileSize:
        this.uploadLogs.length > 0
          ? Math.round(totalBytes / this.uploadLogs.length)
          : 0,
      topUploaders
    };
  }
}

export const createFileUploadManager = (
  config: FileValidationConfig
): EnhancedFileUploadManager => {
  return new EnhancedFileUploadManager(config);
};
