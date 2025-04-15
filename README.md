# MCP Server Memo

![TypeScript](https://img.shields.io/badge/language-TypeScript-blue)
![License](https://img.shields.io/github/license/doggybee/mcp-server-memo)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![MCP SDK](https://img.shields.io/badge/MCP_SDK-1.9.0-orange)

A lightweight MCP (Model Context Protocol) server for managing rich session summaries and memos for LLMs like Claude. This server provides persistent storage using the local filesystem, with support for session history version tracking, and offers tools for storing, retrieving, and listing summaries.

## Overview

MCP Server Memo is designed as a memory assistant for LLMs, allowing them to store and retrieve detailed session records through the MCP tool interface. The server:

- **Preserves History** - All historical versions of a session (same sessionId) are preserved, not just the latest version
- **Time-Ordered** - Multiple versions of sessions are organized chronologically, making it easy to track conversation development
- **Local Storage** - Uses the local filesystem without requiring an external database
- **MCP Compliant** - Follows the Model Context Protocol specification to provide tool interfaces
- **Performance Optimized** - Optimized for file I/O and concurrent operations
- **Minimal Dependencies** - Clean design that's easy to maintain and extend

## Installation

```bash
# Clone the repository
git clone https://github.com/doggybee/mcp-server-memo.git
cd mcp-server-memo

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

The server uses the following configuration options:

- `MCP_SUMMARY_DIR`: Directory for storing summaries (default: `./summaries/`)

You can set these options via environment variables:

```bash
export MCP_SUMMARY_DIR="/path/to/summaries"
```

## Running the Server

```bash
# Standard startup
npm start

# Development mode (with auto-reload)
npm run dev

# Start with logging to file
npm run start:log
```

## MCP Tools

The server provides the following MCP tools:

### 1. upsertSummary

Creates a new version of a session summary without deleting previous versions.

**Parameters:**
- `sessionId` (string, required): Unique identifier for the conversation session. **It is the client application's responsibility to generate this ID.** It should be generated once at the beginning of a new logical conversation session. **Recommendation:** Use a standard **UUID (Version 4)** library available in your programming language to ensure uniqueness. The client must then reuse the *same* generated ID for all subsequent `upsertSummary` calls pertaining to that specific session.
- `summary` (string, required): The detailed content of the session chronicle/log. Each call will create a new version in the session history rather than overwriting previous versions.
- `title` (string, optional): A short, descriptive title for the session.
- `tags` (string[], optional): Keywords or tags to categorize the session.

**Behavior:**
- Creates a new file with a new timestamp
- Preserves all previous versions
- Returns the timestamp of the new version

### 2. getSummaryTool

Retrieves the latest version of a specific session summary.

**Parameters:**
- `sessionId` (string, required): The unique ID of the session summary to retrieve.
- `maxLength` (number, optional): If provided, truncate the retrieved summary text to this maximum length.

**Returns:**
- The latest session summary object (in JSON format)

### 3. listSummariesTool

Lists available summaries (only the latest version of each session), with support for filtering, sorting, and pagination.

**Parameters:**
- `tag` (string, optional): Filter sessions by a specific tag.
- `limit` (number, optional): Limit results.
- `offset` (number, optional): Offset for pagination.
- `sortBy` (string, optional): Sort field ('lastUpdated' or 'title'). Default: 'lastUpdated'.
- `order` (string, optional): Sort order ('asc' or 'desc'). Default: 'desc'.

**Returns:**
- List of summary metadata objects (in JSON format), with only the latest version per session

### 4. updateMetadata

Updates only the metadata (title and/or tags) of the latest version of a session without changing the summary content or timestamp.

**Parameters:**
- `sessionId` (string, required): The unique ID of the session whose metadata to update.
- `title` (string, optional): New title. If omitted, title remains unchanged.
- `tags` (string[], optional): New tags array. If omitted, tags remain unchanged.

**Note:** At least one of `title` or `tags` must be provided.

**Behavior:**
- Does not update the timestamp in the filename or the `lastUpdated` field
- Only modifies the specified metadata fields
- Does not affect the summary content

### 5. appendSummary

Appends content to a session summary, creating a new version that includes previous content plus new content.

**Parameters:**
- `sessionId` (string, required): Unique identifier for the conversation session.
- `content` (string, required): The content to append to the session. This will be added to the existing content and saved as a new version.
- `title` (string, optional): Optional title for the session.
- `tags` (string[], optional): Optional tags for categorizing the session.

**Behavior:**
- Reads the existing latest summary (if any)
- Adds two newlines between content and appends the new content
- Creates a new file with a new timestamp
- Preserves all previous versions

### 6. listAllSummariesTool

Lists all available summaries with basic information (only the latest version of each session).

**Parameters:**
- None

**Returns:**
- List of all available summaries with basic information (in JSON format)

### 7. getSessionHistory

Retrieves all historical versions of a specific session, ordered from newest to oldest.

**Parameters:**
- `sessionId` (string, required): The unique ID of the session to retrieve history for.

**Returns:**
- List of all versions with their full content (in JSON format)

## Client Workflow Example

Here's an example of how a client application might interact with this server:

```javascript
import { v4 as uuidv4 } from 'uuid';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Initialize client
const transport = new StdioClientTransport({
  command: 'node',
  args: ['dist/index.js'],
  cwd: process.cwd()
});

const client = new Client({
  name: 'example-client',
  version: '1.0.0'
});

await client.connect(transport);

// Function to generate new session ID (done once per logical session)
function createNewSession() {
  return uuidv4();
}

// Function to append to an existing session
async function appendToSession(sessionId, newContent) {
  return client.callTool({
    name: "appendSummary",
    arguments: {
      sessionId,
      content: newContent,
      title: "Example Session",
      tags: ["example", "demo"]
    }
  });
}

// Function to get session history
async function getSessionHistory(sessionId) {
  const response = await client.callTool({
    name: "getSessionHistory",
    arguments: { sessionId }
  });
  
  const result = JSON.parse(response.content[0].text);
  if (result.success) {
    return result.history;
  }
  
  throw new Error(result.error || "Failed to get session history");
}

// Usage example
const sessionId = createNewSession();

// Add initial content
await appendToSession(sessionId, "Initial conversation data");

// Add more content later in the conversation
await appendToSession(sessionId, "Second part of the conversation");
await appendToSession(sessionId, "Final part of the conversation");

// Get the full history
const history = await getSessionHistory(sessionId);
console.log(`Session ${sessionId} has ${history.length} versions`);
```

## Project Structure

```
mcp-server-memo/
├── dist/                 # Compiled JavaScript output
├── src/                  # TypeScript source code
│   ├── config.ts         # Server configuration
│   ├── index.ts          # Main entry point
│   ├── storage.ts        # File storage utilities
│   ├── tools.ts          # MCP tool implementations
│   └── types.ts          # TypeScript type definitions
├── summaries/            # Directory for storing session data
│   └── .gitkeep          # Ensures directory is included in git
├── package.json          # Project metadata and dependencies
├── tsconfig.json         # TypeScript configuration
└── LICENSE               # MIT License file
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
