import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration with defaults
export const config = {
  // Directory for storing summaries (default: ./summaries/ relative to project root)
  summariesDir: process.env.MCP_SUMMARY_DIR || path.join(__dirname, '..', 'summaries'),
  
  // Server info
  serverName: 'mcp-server-memo',
  serverVersion: '1.0.0',
};