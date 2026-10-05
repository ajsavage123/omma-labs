# 🤖 OOMA CRM — Model Context Protocol (MCP) Server

> **Purpose:** Allows AI Agents (Kilo Code, Antigravity, Claude, Cursor) to directly **read, edit, search, log interactions, and advance deals** in OOMA CRM.  
> **Protocol:** Standard JSON-RPC 2.0 over stdio (MCP Protocol `2024-11-05`).  
> **Server File:** `mcp-server/index.mjs`  

---

## ⚡ Does Kilo Code Support Custom MCP Tools?

**YES! 100% Native Support.**

Kilo Code (the VS Code AI Agent extension) supports custom Model Context Protocol (MCP) tools out of the box. It uses standard MCP over stdio to dynamically discover and execute tools.

---

## 🚀 How to Connect this MCP Server to Kilo Code

You have two easy ways to connect:

### Method 1: Automatic Detection (Recommended)
We have already placed a [`kilo.jsonc`](../kilo.jsonc) file in your workspace root.
1. In VS Code with the **Kilo Code** extension open:
2. Open the project folder (`omma-labs`).
3. Click the **MCP** tab (or open **Settings ➔ MCP** in Kilo Code).
4. You will see **`ooma-crm`** listed under active servers with **11 available tools**!

---

### Method 2: Manual Setup via Kilo Code Settings
If you want to configure it globally in Kilo Code:
1. Open Kilo Code in VS Code.
2. Click the ⚙️ **Settings icon** ➔ select **MCP Servers**.
3. Click **Add Server** or edit your settings JSON:
4. Paste the following configuration:

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
        "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzd2tud2t4ZHprcmthaW13cXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjcyMTUsImV4cCI6MjA4ODY0MzIxNX0.4wj3FC4lgQ_0er8z8xSsIuVXO9VPoexyFQoCSYl67dE"
      }
    }
  }
}
```

*(Optional: If your Supabase requires an authenticated user session to view private leads, you can add `"CRM_USER_EMAIL": "your@email.com"` and `"CRM_USER_PASSWORD": "yourpassword"` to the `env` object above).*

---

## 🛠️ Complete List of 11 Available Agent Tools

| Tool Name | Action | What the Agent Can Do |
| :--- | :--- | :--- |
| `crm_search_leads` | 📖 Read | Search leads by company name, contact person, phone, email, or stage. |
| `crm_get_lead_details` | 📖 Read | Retrieve full profile, notes, scheduled tasks, and past activities for a lead. |
| `crm_list_pipeline` | 📖 Read | Get live counts and total deal value (₹) across all 7 pipeline stages. |
| `crm_get_tasks` | 📖 Read | List pending, today's, or overdue follow-up tasks. |
| `crm_create_lead` | ✍️ Edit | Ingest a new prospect into the CRM (name, contact, phone, email, value, temperature). |
| `crm_update_lead` | ✍️ Edit | Edit deal value, closing confidence %, phone, email, notes, or temperature. |
| `crm_update_lead_stage` | ⚡ Advance | Move a lead between stages (`New Leads` ➔ `Contacted` ➔ `Interested` ➔ `Proposal Sent` ➔ `Negotiation` ➔ `Won`). |
| `crm_create_task` | 📅 Schedule | Schedule a follow-up call, meeting, or task with exact date and time (`due_time`). |
| `crm_complete_task` | ✅ Finish | Mark a follow-up task as completed. |
| `crm_log_interaction` | 💬 Log | Record a call, WhatsApp chat, email, or meeting with sentiment and agreed next steps. |
| `crm_find_duplicates` | 🔍 Clean | Detect duplicate records sharing the same phone number or email address. |

---

## 💬 Example Prompts You Can Give Your Kilo Code Agent

Now you can chat with your Kilo Code agent like an executive sales assistant:

* **Checking Priorities:**
  > *"Kilo, check OOMA CRM and tell me which leads are in the 'Proposal Sent' stage and what tasks are overdue."*

* **Logging Calls & Advancing Deals:**
  > *"I just had a call with Mr. Vikram from TechCorp. He wants our mobile app development proposal for ₹4,50,000. Move his lead to 'Proposal Sent', log sentiment as 'Very Interested', and schedule a follow-up task for this Friday at 3:00 PM."*

* **Lead Ingestion:**
  > *"Add a new lead: Company 'Zenith Health', Contact 'Dr. Sneha', Phone '9876501234', Service 'Hospital Management Web App', Estimated Value ₹3,00,000, Temperature 'Hot'."*

* **Deduplication:**
  > *"Check our CRM for duplicate leads and report what you find."*
