// @ts-ignore
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// @ts-ignore
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from 'zod';
import { config } from './config.js';
import {
  upsertSummary,
  getSummary,
  listSummaries,
  updateMetadata,
  listAllSummaries,
  appendSummary,
  getSessionHistory
} from './tools.js';

// Redirect console.log to stderr so logs don't interfere with JSON communication
const originalConsoleLog = console.log;
console.log = function() {
  // Forward all arguments to stderr
  process.stderr.write('[LOG] ' + Array.from(arguments).join(' ') + '\n');
};

// Similarly redirect console.error to stderr
const originalConsoleError = console.error;
console.error = function() {
  process.stderr.write('[ERROR] ' + Array.from(arguments).join(' ') + '\n');
};

async function main() {
  try {
    // Ensure the summaries directory exists
    await import('./storage.js').then(mod => mod.ensureSummariesDir());
    
    // Use stderr instead of stdout for logging
    process.stderr.write(`Starting MCP Server Memo with summaries directory: ${config.summariesDir}\n`);
    
    // Create an MCP server with full capabilities
    const server = new McpServer({
      name: config.serverName,
      version: config.serverVersion
    });
    
    // Register tools
    
    // Core tools - using JSON Schema format instead of Zod
    server.tool(
      "upsertSummary",
      "Create or update a detailed session summary with metadata",
      {
        sessionId: z.string().min(1).describe("**Mandatory.** A unique identifier for the conversation session."),
        summary: z.string().describe("**Mandatory.** The detailed content of the session chronicle/log."), 
        title: z.string().optional().describe("A short, descriptive title for the session."),
        tags: z.array(z.string()).optional().describe("Keywords or tags to categorize the session.")
      },
      upsertSummary
    );
    
    server.tool(
      "getSummaryTool",
      "Retrieves a specific summary by sessionId or lists all available summaries if no ID is provided.",
      {
        sessionId: z.string().min(1).describe("The unique ID of the session summary to retrieve."),
        maxLength: z.number().int().positive().optional().describe("If provided, truncate the retrieved summary text to this maximum length.")
      },
      getSummary
    );
    
    // For tools with no params, we use empty objects
    server.tool(
      "listSummariesTool",
      "Lists available summaries with support for filtering, sorting, and pagination.",
      {
        tag: z.string().optional().describe("Filter sessions by a specific tag."),
        limit: z.number().int().positive().optional().describe("Limit results."),
        offset: z.number().int().nonnegative().optional().describe("Offset for pagination."),
        sortBy: z.enum(['lastUpdated', 'title']).optional().describe("Sort field."),
        order: z.enum(['asc', 'desc']).optional().describe("Sort order.")
      },
      (args, extra) => {
        // Convert the args to the format expected by listSummaries
        const params = args as any;
        return listSummaries(params, extra);
      }
    );
    
    server.tool(
      "updateMetadata",
      "Updates only the metadata (title and/or tags) without changing the summary content or timestamp.",
      {
        sessionId: z.string().min(1).describe("**Mandatory.** The unique ID of the session whose metadata to update."),
        title: z.string().optional().describe("New title. If omitted, title remains unchanged."),
        tags: z.array(z.string()).optional().describe("New tags array. If omitted, tags remain unchanged.")
      },
      updateMetadata
    );
    
    server.tool(
      "listAllSummariesTool",
      "Simple tool to list all available summaries.",
      {},
      listAllSummaries
    );
    
    server.tool(
      "appendSummary",
      "Simple reliable tool to append content to a session summary. Creates a new version that includes previous content plus new content.",
      {
        sessionId: z.string().min(1).describe("Unique identifier for the conversation session."),
        content: z.string().describe("The content to append to the session. This will be added to the existing content and saved as a new version."),
        title: z.string().optional().describe("Optional title for the session."),
        tags: z.array(z.string()).optional().describe("Optional tags for categorizing the session.")
      },
      appendSummary
    );
    
    // Add the new session history tool
    server.tool(
      "getSessionHistory",
      "Retrieves all historical versions of a session in chronological order.",
      {
        sessionId: z.string().min(1).describe("The unique ID of the session to retrieve history for.")
      },
      getSessionHistory
    );
    
    // Add a dummy prompt to ensure prompts/list works
    server.prompt(
      "empty-prompt",
      "This is a placeholder prompt that doesn't do anything.",
      {},
      (extra) => {
        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: "This is a placeholder prompt."
            }
          }]
        };
      }
    );
    
    // Add a dummy resource to ensure resources/list works
    server.resource(
      "empty-resource",
      "memo://info",
      async (uri, extra) => {
        return {
          contents: [{
            uri: uri.href,
            text: "This is a placeholder resource for MCP Server Memo."
          }]
        };
      }
    );

    // Start receiving messages on stdin and sending messages on stdout
    const transport = new StdioServerTransport();
    
    process.stderr.write('Connecting server to stdio transport...\n');
    await server.connect(transport);
    
    process.stderr.write('Server running, waiting for messages...\n');
  } catch (error) {
    process.stderr.write(`Error starting server: ${error}\n`);
    process.exit(1);
  }
}

// Start the server
main();