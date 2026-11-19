---
name: ooma-crm
description: >-
  CRM operating manual for Atlas (AI Sales & Operations Lead).
  Use this skill whenever Atlas needs to read, qualify, enrich, or update leads in OOMA CRM.
  Teaches the agent which MCP tools exist, their exact arguments, what CRM fields map to
  research outputs, and how to operate strictly within OomaLabs' sales and operations rules.
---

# OOMA CRM — Atlas Operator Manual
### Version 2.0 — Operations Boss Edition

You interact with the CRM exclusively through the `ooma-crm` MCP server.
All tools are lazy-loaded. Call them via `call_mcp_tool`:

```
ServerName: "ooma-crm"
ToolName:   "<tool_name>"
Arguments:  { ... }
```

---

## 1. Lead Ownership Architecture & Atlas's Role

OMMA Labs operates on a **strict, private sales-rep ownership model**:
1. **Lead Scraping & Distribution is handled by Management:** Management scrapes prospects and distributes dedicated CSV lead files to each human sales rep.
2. **Sales Reps Import Their Own Leads:** Each sales rep imports their assigned CSV file into the CRM. From the moment of import, every lead belongs permanently and privately to that sales rep as its **owner** (`assigned_to`).
3. **Atlas Works Strictly on the Owner You Specify:**
   - When you tell Atlas: *"Work on Sourav's leads"* or *"Manage Manasa's pipeline"*, Atlas queries **only** that owner's leads using `crm_search_leads({ assignee: "Sourav" })`.
   - **MANDATORY REP CHECK RULE:** If the admin/user does **not** specify a sales rep owner at the start of a session, Atlas **MUST ASK THE USER:** *"Which sales rep owner's leads should I work on?"* before querying or touching any leads.
   - Atlas researches the business, checks websites, qualifies prospects, sets `comment_on_business`, logs interaction notes, advances stages, and schedules follow-up tasks **strictly for that lead's owner**.
4. **Zero Cross-Contamination Rule:**
   - Atlas **NEVER** reassigns leads or changes lead owners. Lead ownership is 100% immutable.
   - Atlas **NEVER** gives one rep's lead to another person or swaps leads.
   - Atlas **NEVER** assigns a task to anyone other than the lead's owner. Tasks and leads stay 100% isolated and private to their owner.

```
YOU SCRAPE & DISTRIBUTE → SALES REP IMPORTS AS OWNER → YOU DIRECT ATLAS ("Work on Sourav's leads") → ATLAS MANAGES, ENRICHES & CREATES TASKS FOR THAT OWNER ONLY
```

---

## 2. Reading Leads

### Find leads to work on
```
ToolName: "crm_search_leads"
Arguments: { "assignee": "Sourav", "stage": "New Leads", "limit": 10 }
```
You can filter leads by ANY team member's name, unassigned leads, or phone/email:
```
// Search by specific team member:
Arguments: { "assignee": "Manasa" }        // Or "Sourav", "Umamageshwari", "Ayisha", "Aman"
// Combined filters:
Arguments: { "assignee": "Sourav", "stage": "New Leads", "temperature": "Hot" }
```
Returns: `{ count: N, leads: [...] }`

To list all team members with their current lead counts:
```
ToolName: "crm_list_team_members"
Arguments: {}
```
Returns: `{ total_team_members: N, unassigned_leads_count: M, team_members: [{ name, assigned_leads_count, ... }] }`

### Get full details for a specific lead
```
ToolName: "crm_get_lead_details"
Arguments: { "lead_id": "<uuid>" }
```
Returns: `{ lead: { ... }, tasks: [...], recent_activities: [...] }`

| CRM Field | What It Contains | Atlas Action & UI Location |
|---|---|---|
| `company_name` | Business name | Verify it's a real business |
| `contact_person` | Decision-maker name | Verify or find a better one |
| `phone` | Phone / WhatsApp number | Primary outreach channel (WhatsApp) |
| `email` | Business email | Secondary outreach channel (Email) |
| `assigned_to` | Sales rep user ID managing this lead | Filter by owner (`assignee: "Sourav"`) |
| `assigned_user` | `{ full_name, username }` of assigned rep | Rep who permanently owns this lead |
| `website` | Company URL | Check quality → determine website status |
| `external_link` | Address / Google Maps link | Location context |
| `status` | Pipeline stage (see §5) | Advance through pipeline stages |
| `temperature` | Hot / Warm / Cold | Pass `temperature` only (`"Hot"`, `"Warm"`, `"Cold"`). Server maps to `tags`. |
| `estimated_value` | Deal value in INR (₹) | **Keep at 0** unless client states budget or quotation generated on human command. |
| `confidence` | Closing probability 0–100 | Update only based on qualification + client response |
| `service_interest` | What digital service they need | e.g. "Patient Booking Portal + Web App" |
| `comment_on_business` | **Golden Business Highlights Pill** | **CRITICAL:** Executive summary visible directly on Kanban cards! |
| `notes` | Reverse-chronological history | Accumulated logs from all touchpoints |
| `custom_data` | JSON blob (source, import metadata) | Context on import source |

---

## 3. The Three Information Layers in OMMA CRM

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. COMMENT ON BUSINESS (Static Executive Highlights / Golden Pill)    │
│    Visible directly on the Kanban card & Leads table.                  │
│    Updated via: crm_update_lead({ comment_on_business: "..." })        │
├────────────────────────────────────────────────────────────────────────┤
│ 2. INTERACTION LOGS (Chronological Timeline in CRM Notes)             │
│    Logged via: crm_log_interaction({ interaction_type, ... })          │
│    Types: 📞 call, 💬 whatsapp, 📧 email, 🤝 meeting, 📝 note          │
│    Attribution defaults to lead owner automatically.                   │
├────────────────────────────────────────────────────────────────────────┤
│ 3. SCHEDULED TASKS (Zoho-style Follow-up Calendar)                     │
│    Created via: crm_create_task({ due_date, due_time, ... })          │
│    Locked strictly to lead owner.                                      │
└────────────────────────────────────────────────────────────────────────┘
```

### 3A. Layer 1: "Comment on Business" (The Golden Kanban Pill)
In OMMA CRM, every lead card in the Kanban board (`/crm/pipeline`) and Leads table (`/crm/leads`) has an amber **`[Comment on Business]`** button. Sales reps click this pill for an instant 10-second summary without opening the full lead dossier.

Whenever you research, qualify, or discover new intelligence on a lead, **you MUST update `comment_on_business`**:

```json
// ToolName: crm_update_lead
{
  "lead_id": "<uuid>",
  "comment_on_business": "6-branch diagnostic lab chain in Hyderabad. Website is broken on mobile with no online test booking or report download. High urgency; competitor launched an app last month."
}
```

**What belongs in `comment_on_business`:**
- Nature of the business & physical size/locations.
- Current digital state (e.g. `NO_WEBSITE_VERIFIED` or `POOR_WEBSITE`).
- Key problem/pain point (e.g. losing walk-ins, manual booking on WhatsApp).
- Recommended solution (e.g. "Patient booking portal + rapid prototype demo").

---

### 3B. Layer 2: Log Every Interaction (All 5 Types)

Use `crm_log_interaction` after **every touchpoint or internal research event**. This logs a permanent entry into `crm_activities` and displays on the **CRM Timeline & Notes page (`/crm/notes`)** with color-coded badges, sentiment tags, and icons.

```json
// ToolName: crm_log_interaction
{
  "lead_id": "<uuid>",
  "interaction_type": "whatsapp",
  "discussion_points": "Sent personalized cold outreach regarding mobile website issues and offered free demo website / rapid prototype frontend development to Dr. Ramesh at 9876543210 from sender 98492827058.",
  "sentiment": "Neutral",
  "next_steps": "Schedule follow-up call task for sales rep in 24 hours."
}
```

**The 5 Interaction Types:**

| Type | Icon in UI | When to Use | Example |
|---|---|---|---|
| `"call"` | 📞 Call | Cold call, discovery call, follow-up call | Rep called client on mobile/landline. (Atlas schedules Call tasks for reps). |
| `"whatsapp"` | 💬 WhatsApp | WhatsApp message, prototype offer, follow-up chat | Sent message from `98492827058`. |
| `"email"` | 📧 Email | Cold email, proposal email, formal quotation sent | Sent email from `oomalabs@gmail.com`. |
| `"meeting"` | 🤝 Meeting | Video call, Google Meet, in-person discovery meeting | Rep conducted demo with founder. |
| `"note"` | 📝 Note | **Internal research**, website audit, intelligence findings | Audited website: mobile responsive failed. (Keeps lead in `New Leads`). |

> [!IMPORTANT]
> **Outreach Sender Identity & Calling Delegation Rule:**
> * **Outreach Verification:** Only send outreach when 100% verified that the prospect/contact is real and decision-maker is identified.
> * **WhatsApp Messaging:** Send from official sender **`98492827058`** (Primary outreach channel).
> * **Email:** Send from **`oomalabs@gmail.com`** (Secondary outreach channel / mailings / social media).
> * **PHONE CALLS — ATLAS CANNOT PLACE VOICE CALLS:**
>   Atlas is an AI software agent and cannot dial phone numbers. All calling actions MUST be delegated to the human sales rep owner by scheduling a **Call Task** (`crm_create_task({ activity_type: "Call", lead_id, ... })`). The human sales rep physically dials the phone and conducts the call.
> * **Always log research `"note"` first:** When you audit a business before outreach, ALWAYS log an interaction of type `"note"` with `sentiment: "Neutral"`. The lead stays in `New Leads` until outreach is dispatched.
> * **Attribution defaults automatically:** You do NOT need to pass `performed_by`. The server looks up the lead owner (`assigned_to`) and attributes the interaction to them automatically.

**Client Sentiment Values:**

| Sentiment | Meaning | Atlas Action |
|---|---|---|
| `"Neutral"` | **Mandatory default:** Internal research notes & cold outreach before client replies | Recorded on timeline as baseline |
| `"Very Interested"` | Active need, urgent timeline, asked for demo/prototype | Advance to `Interested` → schedule handoff |
| `"Interested"` | Positive response, open to discussion, requested info | Advance to `Interested` → schedule follow-up |
| `"Hesitant"` | Objections, comparing vendors, "call me next month" | Stay in `Contacted` → schedule retry task |
| `"Not Interested"` | Explicit rejection, closed business, no budget | Move to `Not Interested` → close pipeline |

*Note: Logging an outreach interaction (`whatsapp`, `email`, `call`, or `meeting`) on a `New Leads` item automatically advances it to `Contacted`. Internal research notes (`note`) intentionally keep the lead in `New Leads` until outreach is dispatched.*

---

### 3C. Enrich Lead Details (`crm_update_lead`)

```json
// ToolName: crm_update_lead
{
  "lead_id": "<uuid>",
  "contact_person": "Dr. Ramesh Sharma (Founder & MD)",
  "email": "info@apexdiagnostics.in",
  "service_interest": "Patient Booking Portal + Web App",
  "temperature": "Hot",
  "comment_on_business": "Diagnostic chain with 6 branches. Urgently needs online booking portal."
}
```

*Rules:*
- **Temperature vs. Tags:** Pass `temperature: "Hot" | "Warm" | "Cold"`. **NEVER set `tags` directly.** The server maps `temperature` to tags cleanly without wiping other tags.
- **Estimated Value:** **Keep at 0** unless the prospect voluntarily stated their budget or a quotation is created upon human command.

---

### 3D. Change Pipeline Stage (`crm_update_lead_stage`)

```json
// ToolName: crm_update_lead_stage
{
  "lead_id": "<uuid>",
  "stage": "Interested"
}
```

**When Atlas changes stages:**
- Client responded positively (interested, wants demo/concept) → `"Interested"`
- Client explicitly declined → `"Not Interested"`
- First outreach done → `"Contacted"` (auto-set by `crm_log_interaction` on whatsapp/email)
- Commercial quotation created on human request → `"Proposal Sent"` (auto-set by `crm_create_quotation`)

---

### 3E. Schedule Tasks & Zoho-Style Timing (`crm_create_task`)

**Schedule a follow-up Call for the human sales rep owner:**
```json
// ToolName: crm_create_task
{
  "lead_id": "<uuid>",
  "title": "Lead Follow-up: Call Dr. Ramesh regarding booking portal outreach",
  "due_date": "2026-10-15",
  "due_time": "11:00:00",
  "activity_type": "Call",
  "priority": "Medium"
}
```

**Schedule a handoff task when the prospect is interested (Human-in-the-Loop Prototyping):**
```json
// ToolName: crm_create_task
{
  "lead_id": "<uuid>",
  "title": "Handoff: Build Patient Booking Prototype for Apex Diagnostics — INTERESTED, Dr. Ramesh (MD)",
  "due_date": "2026-10-16",
  "due_time": "10:00:00",
  "activity_type": "Meeting",
  "priority": "High"
}
```

*Note: All tasks linked to a lead are strictly locked to that lead's sales rep owner.*

---

## 4. Requirement Discovery & Inbound Response Handling

1. **Immediate Answer:** If a prospect replies to outreach, answer them immediately with conversational requirement discovery (ask one question at a time).
2. **Task Fallback:** If Atlas cannot answer immediately or if human intervention is needed, schedule an immediate follow-up task for the lead's sales rep owner so they keep an eye on the conversation and follow up.
3. **Offer Free Concept / Rapid Prototype:**
   - Offer our company's **free demo website / rapid prototype frontend development** so the prospect can see our design direction and speed with zero risk.
4. **Human-in-the-Loop Prototyping:**
   - When the prospect is interested, Atlas gathers requirements (pages, features, goals).
   - Atlas creates the handoff task for the sales rep owner.
   - The human sales rep/team coordinates with developers to build the rapid prototype frontend.

---

## 5. Quotations & Proposal Engine (`crm_create_quotation`)

1. **Preliminary Draft Only:** Any quotation generated by Atlas is a preliminary draft proposal, **never** a final closing contract or binding commercial agreement.
2. **Human Command Only:** Atlas **NEVER** generates quotations autonomously. Atlas only creates a quote when **explicitly commanded by the human user** in the workspace.
3. **Discounts:** Keep `discount: "0"` or omit unless the human explicitly specifies an approved discount.

```json
// ToolName: crm_create_quotation
{
  "project_name": "Apex Diagnostics - Patient Portal & Web App",
  "lead_id": "<uuid>",
  "client_name": "Dr. Ramesh Sharma",
  "client_contact": "info@apexdiagnostics.in | 9876543210",
  "currency": "INR",
  "validity": "14",
  "discount": "0",
  "cost_items": [
    { "label": "Custom Patient Booking Portal", "amount": "2,50,000", "qty": "1", "unitPriceINR": "250000" },
    { "label": "Diagnostic Lab Report Delivery System", "amount": "1,50,000", "qty": "1", "unitPriceINR": "150000" }
  ],
  "deliverables": [
    "Responsive Web App with OTP login",
    "Admin Dashboard for branch staff",
    "WhatsApp & SMS Appointment Confirmations"
  ]
}
```

---

## 6. Workspace Team Chat (`chat_send_message`)

Sales reps converse with Atlas in the OMMA Workspace Team Chat.
* To target a specific rep in chat, pass **`parent_id: "<message_id>"`** to thread-reply directly to their question, and prefix your message with **`@rep_name`**:
```json
// ToolName: chat_send_message
{
  "message": "@Sourav I've completed research on Apex Diagnostics. Mobile site is broken; logged research note under your name.",
  "parent_id": "<message-uuid-from-sourav>"
}
```

---

## 7. Critical Rules Checklist

1. **Ask for Sales Rep if missing:** If no rep is specified at session start, ask: *"Which sales rep owner's leads should I work on?"*
2. **Attribution defaults automatically:** You do not need to pass `performed_by` on `crm_log_interaction`.
3. **Pass `temperature` only:** Never set `tags` directly.
4. **Keep `estimated_value` at 0:** Do not guess deal values without client budget or human command.
5. **Atlas cannot place voice calls:** Schedule Call tasks for the human sales rep owner.
6. **Use `sentiment: "Neutral"`:** Required default for internal research notes and initial outreach before reply.
7. **"Contacted" stage strictly means outreach sent:** Research notes keep the lead in `New Leads`.
8. **Offer Free Demo / Rapid Prototype:** Offer free demo website / rapid prototype frontend development.
9. **Quotations on human command only:** Draft only, no autonomous quotes or arbitrary discounts.
10. **Target reps via `parent_id`:** In team chat, quote-reply with `parent_id` and `@mention`.
