import path from "path";
import fs from "fs";
import sanitizeFilename from "sanitize-filename";
import { execSync } from "child_process";
import { logger } from "../../utils/winstonLogger";

const UPLOAD_DIR = path.resolve(__dirname, "../uploads");

/**
 * Build a safe, absolute path under our uploads dir.
 */
export function resolveUpload(filename: string): string {
  const cleanName = sanitizeFilename(filename);
  return path.join(UPLOAD_DIR, cleanName);
}

/**
 * Run ClamAV on a file. Returns true if clean; if infected it deletes the file and returns false.
 */
export async function scanOrDelete(filePath: string): Promise<boolean> {
  if (!fs.existsSync(filePath)) {
    throw new Error("File does not exist");
  }
  try {
    const result = execSync(`clamscan ${filePath}`, { stdio: "pipe" }).toString();
    const clean = !/FOUND/.test(result);
    if (!clean) {
      fs.unlinkSync(filePath);
      logger.warn(`Infected file deleted: ${filePath}`);
    }
    return clean;
  } catch (err) {
    logger.error(`Virus scan error for ${filePath}: ${(err as Error).message}`);
    // On scanner error, be conservative and delete
    fs.unlinkSync(filePath);
    return false;
  }
}

/**
 * Delete (unlink) a file by its sanitized name.
 */
export async function deleteUpload(filename: string): Promise<void> {
  const filePath = resolveUpload(filename);
  if (!fs.existsSync(filePath)) {
    throw new Error("File not found");
  }
  fs.unlinkSync(filePath);
  logger.info(`File deleted: ${filePath}`);
}

/**
 * Build a public URL for a given uploaded filename.
 */
export function urlFor(req: { protocol: string; get(header: string): string | undefined }, filename: string): string {
  const host = `${req.protocol}://${req.get("host")}`;
  const clean = sanitizeFilename(filename);
  return `${host}/uploads/${clean}`;
}
