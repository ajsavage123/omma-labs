# 🤖 OOMA CRM — Model Context Protocol (MCP) Server
### Version 2.0.0 — Operations Boss & Workspace Edition

> **Protocol:** Standard JSON-RPC 2.0 over stdio (MCP Protocol `2024-11-05`).  
> **Server Executable:** `mcp-server/index.mjs`  
> **Workspace Config:** `kilo.jsonc`

---

## 🚀 The Configuration to Install / Connect

To install or connect this MCP server to **Kilo Code**, **Claude Desktop**, **Antigravity**, or **Cursor**, use this configuration:

```json
{
  "mcpServers": {
    "ooma-crm": {
      "command": "node",
      "args": [
        "c:/Users/AJAYKUMAR/.gemini/antigravity-ide/scratch/omma-labs/mcp-server/index.mjs"
      ],
      "env": {
        "SUPABASE_URL": "https://uswknwkxdzkrkaimwqvf.supabase.co",
        "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzd2tud2t4ZHprcmthaW13cXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjcyMTUsImV4cCI6MjA4ODY0MzIxNX0.4wj3FC4lgQ_0er8z8xSsIuVXO9VPoexyFQoCSYl67dE",
        "CRM_USER_EMAIL": "atlas@oomalabs.com",
        "CRM_USER_PASSWORD": "123456789",
        "CRM_WORKSPACE_ID": "aefde15d-1658-4652-8ce5-1b294af6f55f"
      }
    }
  }
}
```

---

## ⚡ How to Install in Your AI Client:

### Option 1: In Kilo Code
1. Open Kilo Code in VS Code.
2. Click the ⚙️ **Settings icon** ➔ select **MCP Servers**.
3. It will automatically detect [`kilo.jsonc`](../kilo.jsonc), OR you can click **Add Server** and paste the JSON block above.

### Option 2: In Claude Desktop / Antigravity / Cursor
1. Open your MCP configuration file (e.g. `claude_desktop_config.json`).
2. Add the `"ooma-crm"` block from above into `"mcpServers"`.
3. Restart your AI client.

---

## 🛠️ Complete Tools Available in v2.0.0:

| Tool Name | Action | Description |
| :--- | :--- | :--- |
| `crm_get_server_info` | ℹ️ Info | Returns MCP version (`2.0.0`), workspace ID, and active features. |
| `crm_search_leads` | 📖 Read | Search leads filtered by sales rep owner (`assignee: "Sourav"`), stage, etc. |
| `crm_get_lead_details` | 📖 Read | Read complete lead profile, notes, scheduled tasks, and activities. |
| `crm_update_lead` | ✍️ Edit | Set golden `comment_on_business` pill, temperature (`Hot`/`Warm`/`Cold`), and contact info. |
| `crm_update_lead_stage` | ⚡ Advance | Advance pipeline stages (`New Leads` ➔ `Contacted` ➔ `Interested`). |
| `crm_log_interaction` | 💬 Log | Log 5 interaction types (`call`, `whatsapp`, `email`, `meeting`, `note`) with sentiment (`Neutral` default). |
| `crm_get_tasks` | 📅 Tasks | List pending, today's, or overdue tasks for sales reps. |
| `crm_create_task` | 📅 Tasks | Schedule Zoho-style tasks strictly locked to the lead's owner. |
| `crm_update_task` | 📅 Tasks | Reschedule dates, adjust priority, or update notes. |
| `crm_complete_task` | ✅ Tasks | Mark tasks completed. |
| `crm_delete_task` | 🗑️ Tasks | Delete finished or obsolete tasks. |
| `chat_get_messages` | 💬 Chat | Read team chat messages and filter `@Atlas` mentions. |
| `chat_send_message` | 💬 Chat | Post replies live to team chat (use `parent_id` for in-thread replies). |
| `workspace_get_attention_feed`| 📡 Radar | Scan unhandled chat questions, overdue tasks, and stagnant deals. |
| `crm_create_quotation` | 💼 Quotes | Generate formal draft quotations linked to leads. |
| `crm_list_quotations` | 💼 Quotes | Search and list saved quotations. |
| `crm_get_quotation` | 💼 Quotes | Read full line items and payment terms of a quotation. |
| `crm_update_quotation` | 💼 Quotes | Edit existing quotation details. |
| `crm_list_team_members` | 👥 Team | List sales reps with user IDs and assigned lead counts. |
| `crm_find_duplicates` | 🔍 Audit | Detect duplicate leads by phone, email, or company name. |
| `crm_list_pipeline` | 📊 Metrics | View total deals and pipeline revenue by stage. |
