// Types for our summary data
export interface SummaryData {
  // Client provided unique session ID
  sessionId: string;
  
  // The complete session summary/chronicle text
  summary: string;
  
  // Optional user-defined title for the session
  title?: string;
  
  // Optional tags for categorization
  tags?: string[];
  
  // ISO 8601 timestamp of when this summary was last updated
  lastUpdated: string;
}

// Type for file info used in listing
export interface SummaryFileInfo {
  // Full path to the file
  path: string;
  
  // Filename components
  timestamp: string;
  sessionId: string;
  
  // Whether the file has been loaded into memory
  loaded: boolean;
  
  // The data, if loaded
  data?: SummaryData;
}

// Type for session history entry
export interface SessionHistoryEntry {
  // Timestamp from filename
  timestamp: string;
  
  // ISO 8601 timestamp of when this version was created
  lastUpdated: string;
  
  // Title at this point in time
  title: string | null;
  
  // Tags at this point in time
  tags: string[];
  
  // Length of the summary
  summaryLength: number;
  
  // The actual summary text
  summary: string;
}

// Response type for getSessionHistory
export interface SessionHistoryResponse {
  success: boolean;
  sessionId: string;
  versionCount: number;
  history: SessionHistoryEntry[];
  error?: string;
}