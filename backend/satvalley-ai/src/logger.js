import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(__dirname, '../../ai-history.log');

/**
 * Logs AI activity to a file with timestamps.
 * @param {'SUCCESS' | 'ERROR'} status 
 * @param {string} activity 
 * @param {string} details 
 */
export function logAiActivity(status, activity, details) {
    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
    const logEntry = `[${timestamp}] [${status}] Activity: ${activity} | Details: ${details}\n`;

    try {
        fs.appendFileSync(LOG_FILE, logEntry);
    } catch (error) {
        console.error('Failed to write to AI log file:', error);
    }
}
