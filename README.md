# MCP Server Memo

![TypeScript](https://img.shields.io/badge/language-TypeScript-blue)
![License](https://img.shields.io/github/license/doggybee/mcp-server-memo)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![MCP SDK](https://img.shields.io/badge/MCP_SDK-1.9.0-orange)
[![smithery badge](https://smithery.ai/badge/@doggybee/mcp-server-memo)](https://smithery.ai/server/@doggybee/mcp-server-memo)

A lightweight MCP (Model Context Protocol) server for managing rich session summaries and memos for LLMs like Claude. This server provides persistent storage using the local filesystem, with support for session history version tracking, and offers tools for storing, retrieving, and listing summaries.

### Installing via Smithery

To install mcp-server-memo for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@doggybee/mcp-server-memo):

```bash
npx -y @smithery/cli install @doggybee/mcp-server-memo --client claude
```