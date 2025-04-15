import fs from 'fs/promises';
import path from 'path';
import { config } from './config.js';
import { SummaryData, SummaryFileInfo } from './types.js';

// Find all files for a given sessionId
export async function findAllFilesBySessionId(sessionId: string): Promise<SummaryFileInfo[]> {
  try {
    const files = await fs.readdir(config.summariesDir);
    // Get all files matching this sessionId
    const suffix = `_${sessionId}.json`;
    const matchingFiles = files.filter(file => file.endsWith(suffix));
    
    // Convert filenames to file infos
    const filenameRegex = /^(.+)_(.+)\.json$/;
    const fileInfos = matchingFiles
      .map(file => {
        const match = filenameRegex.exec(file);
        if (match) {
          const [_, timestamp, sessionId] = match;
          return {
            path: path.join(config.summariesDir, file),
            timestamp,
            sessionId,
            loaded: false
          };
        }
        return null;
      })
      .filter((info): info is SummaryFileInfo => info !== null);
    
    // Sort by timestamp (newest first)
    fileInfos.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    return fileInfos;
  } catch (error) {
    process.stderr.write(`Error finding files for sessionId ${sessionId}: ${error}\n`);
    throw new Error(`Failed to find files for sessionId ${sessionId}: ${error}`);
  }
}

// Ensure the summaries directory exists
export async function ensureSummariesDir(): Promise<void> {
  try {
    await fs.mkdir(config.summariesDir, { recursive: true });
  } catch (error) {
    process.stderr.write(`Error creating summaries directory: ${error}\n`);
    throw new Error(`Failed to create summaries directory: ${error}`);
  }
}

// Generate a filename using the specified format: {timestamp}_{sessionId}.json
export function generateFilename(sessionId: string, timestamp: string): string {
  return `${timestamp}_${sessionId}.json`;
}

// Generate a timestamp in the required format: YYYYMMDDTHHMMSSZ
export function generateTimestamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/g, '');
}

// Find the latest file by sessionId
export async function findFileBySessionId(sessionId: string): Promise<string | null> {
  try {
    const files = await fs.readdir(config.summariesDir);
    // Get all files matching this sessionId
    const suffix = `_${sessionId}.json`;
    const matchingFiles = files.filter(file => file.endsWith(suffix));
    
    if (matchingFiles.length === 0) {
      return null;
    }
    
    // Sort by timestamp (newest first)
    matchingFiles.sort((a, b) => b.localeCompare(a));
    
    // Return the newest file
    return path.join(config.summariesDir, matchingFiles[0]);
  } catch (error) {
    process.stderr.write(`Error finding file for sessionId ${sessionId}: ${error}\n`);
    throw new Error(`Failed to find file for sessionId ${sessionId}: ${error}`);
  }
}

// Write summary data to a file
export async function writeSummaryFile(filePath: string, data: SummaryData): Promise<void> {
  try {
    // Use a more compact JSON representation by default
    const jsonData = JSON.stringify(data);
    await fs.writeFile(filePath, jsonData, 'utf8');
  } catch (error) {
    process.stderr.write(`Error writing file ${filePath}: ${error}\n`);
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
}

// Read summary data from a file
export async function readSummaryFile(filePath: string): Promise<SummaryData> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data) as SummaryData;
  } catch (error) {
    process.stderr.write(`Error reading file ${filePath}: ${error}\n`);
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
}

// Delete a file
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    process.stderr.write(`Error deleting file ${filePath}: ${error}\n`);
    throw new Error(`Failed to delete file ${filePath}: ${error}`);
  }
}

// Get all summary files with basic information
export async function getSummaryFiles(): Promise<SummaryFileInfo[]> {
  try {
    const files = await fs.readdir(config.summariesDir);
    
    // Filter for JSON files and extract information from filenames
    // Use a more efficient regex match with a compiled regex
    const filenameRegex = /^(.+)_(.+)\.json$/;
    
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        // Parse filename: {timestamp}_{sessionId}.json
        const match = filenameRegex.exec(file);
        
        if (match) {
          const [_, timestamp, sessionId] = match;
          return {
            path: path.join(config.summariesDir, file),
            timestamp,
            sessionId,
            loaded: false
          };
        }
        
        // Skip files that don't match the expected pattern
        return null;
      })
      .filter((file): file is SummaryFileInfo => file !== null);
  } catch (error) {
    process.stderr.write(`Error listing summary files: ${error}\n`);
    throw new Error(`Failed to list summary files: ${error}`);
  }
}

// Load summary data for a list of file infos - optimized with concurrency control
export async function loadSummaryData(fileInfos: SummaryFileInfo[]): Promise<SummaryFileInfo[]> {
  // Process files in batches of 10 to avoid overwhelming the file system
  const BATCH_SIZE = 10;
  const result: SummaryFileInfo[] = [];
  
  for (let i = 0; i < fileInfos.length; i += BATCH_SIZE) {
    const batch = fileInfos.slice(i, i + BATCH_SIZE);
    const processBatch = await Promise.all(
      batch.map(async (fileInfo) => {
        try {
          const data = await readSummaryFile(fileInfo.path);
          return {
            ...fileInfo,
            loaded: true,
            data
          };
        } catch (error) {
          process.stderr.write(`Error loading data for ${fileInfo.path}: ${error}\n`);
          // Return the original file info without data
          return fileInfo;
        }
      })
    );
    result.push(...processBatch);
  }
  
  return result;
}