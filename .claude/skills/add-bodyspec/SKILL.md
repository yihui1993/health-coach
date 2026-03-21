---
name: add-bodyspec
description: Guide to set up BodySpec MCP so Claude can automatically sync DEXA scan results from BodySpec into the health database.
allowed-tools: Bash
---

# Set Up BodySpec MCP

BodySpec MCP allows Claude to automatically fetch your DEXA scan results from BodySpec's API, enabling `/sync-bodyspec` to import data without any manual exports.

## Step 1 — Create or log in to your BodySpec account

If you don't have an account yet:
> Visit **https://app.bodyspec.com/** to book your first DEXA scan and create an account.
>
> DEXA scans measure body fat %, lean mass, bone density, and visceral fat with high accuracy — far more precise than scale weight or bioimpedance.

## Step 2 — Get API access

Tell the user:
> Log in to **https://app.bodyspec.com/**
>
> Look for an API or developer settings section, or a "Connect to Claude" option. Generate an API key or token for MCP access.
>
> If you're unsure where to find this, look for "Integrations", "API Access", or "Settings" in your account.

## Step 3 — Add the BodySpec MCP to Claude Code

Tell the user to run in a terminal:
```
claude mcp add claude_ai_Bodyspec
```

Follow the prompts to enter your BodySpec API credentials (token or key).

## Step 4 — Restart and verify

Tell the user:
> Restart Claude Code so the MCP server loads, then run `/sync-bodyspec` to test.
>
> If it works, you'll see your scan history imported into the health database.
>
> If you see "tool not found", the MCP server is not connected — re-check Step 3.

## Notes
- BodySpec MCP is optional. Body metrics can also be entered manually via `/setup`.
- The tool name used internally is `mcp__claude_ai_Bodyspec__list_scan_results`.
- Run `/sync-bodyspec` after each new DEXA scan to keep the database current.
- DEXA scans are recommended every 3–6 months for tracking body composition progress.
