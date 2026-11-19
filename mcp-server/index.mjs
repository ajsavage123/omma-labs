#!/usr/bin/env node
/**
 * OOMA CRM - Model Context Protocol (MCP) Server
 * Compatible with Kilo Code, Antigravity, Claude Desktop, Cursor, and any MCP client.
 * Standard JSON-RPC 2.0 over stdio (MCP Protocol 2024-11-05).
 * 
 * Version 2.0.0 — Second Boss & Team Chat Edition
 * Supports full CRM admin role, sales rep task delegation, multi-rep interaction logging,
 * team chat communication, and proactive workspace attention monitoring.
 */

import readline from 'node:readline';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load fallback .env if environment variables are not already passed
function loadEnvFallback() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvFallback();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://uswknwkxdzkrkaimwqvf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzd2tud2t4ZHprcmthaW13cXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjcyMTUsImV4cCI6MjA4ODY0MzIxNX0.4wj3FC4lgQ_0er8z8xSsIuVXO9VPoexyFQoCSYl67dE';
const USER_EMAIL = process.env.CRM_USER_EMAIL || 'atlas@oomalabs.com';
const USER_PASSWORD = process.env.CRM_USER_PASSWORD || '123456789';
const WORKSPACE_ID = process.env.CRM_WORKSPACE_ID || 'aefde15d-1658-4652-8ce5-1b294af6f55f';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Cache active user session if user email/password is provided
let authenticatedUserId = null;
let activeWorkspaceId = WORKSPACE_ID;

// BUG FIX 1 (Race Condition): Store auth promise so tool calls await it before executing
let authReady = null;

async function initAuth() {
  if (USER_EMAIL && USER_PASSWORD) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: USER_EMAIL,
        password: USER_PASSWORD
      });
      if (!error && data?.user) {
        authenticatedUserId = data.user.id;
        // Fetch workspace_id from users table if not set
        if (!activeWorkspaceId) {
          const { data: uData } = await supabase
            .from('users')
            .select('workspace_id')
            .eq('id', authenticatedUserId)
            .single();
          if (uData?.workspace_id) {
            activeWorkspaceId = uData.workspace_id;
          }
        }
      } else if (error) {
        console.error('[MCP Auth Error]:', error.message);
      }
    } catch (err) {
      console.error('[MCP Auth Warning]:', err.message);
    }
  }
}

// BUG FIX 2 (Session Loss): Ensure valid session before executing RLS-gated queries
async function ensureAuth() {
  if (authReady) await authReady;
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session && USER_EMAIL && USER_PASSWORD) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: USER_EMAIL,
      password: USER_PASSWORD
    });
    if (!error && data?.user) {
      authenticatedUserId = data.user.id;
    }
  }
}

// Start auth immediately
authReady = initAuth();
await authReady;

// ---------------------------------------------------------------------------
// HELPER FUNCTIONS FOR USER RESOLUTION & BROADCASTING
// ---------------------------------------------------------------------------

/**
 * Resolves a sales rep / team member name or UUID to a full user record
 */
async function resolveUser(identifier) {
  if (!identifier) return null;
  const trimmed = String(identifier).trim();
  
  // Direct UUID check
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    const { data } = await supabase
      .from('users')
      .select('id, username, full_name, designation, role')
      .eq('id', trimmed)
      .single();
    if (data) return data;
  }

  // Name or username ilike search
  let query = supabase
    .from('users')
    .select('id, username, full_name, designation, role')
    .or(`full_name.ilike.%${trimmed}%,username.ilike.%${trimmed}%`);
  
  if (activeWorkspaceId) {
    query = query.eq('workspace_id', activeWorkspaceId);
  }

  const { data: matchedUsers } = await query.limit(1);
  return matchedUsers?.[0] || null;
}

/**
 * Resolves a sales rep name or UUID directly to a user ID string
 */
async function resolveUserId(identifier) {
  const u = await resolveUser(identifier);
  return u ? u.id : null;
}

/**
 * Broadcasts a chat message over Supabase Realtime channel so active browser tabs update immediately
 */
async function broadcastChatMessage(payload) {
  try {
    const channel = supabase.channel(`workspace_chat_${activeWorkspaceId}`);
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'broadcast_chat_message',
      payload
    });
  } catch (err) {
    // Non-fatal if broadcast fails
  }
}

// ---------------------------------------------------------------------------
// COMPLETE 23 MCP TOOLS LIST
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: 'crm_search_leads',
    description: 'Search and filter leads in OOMA CRM by company name, contact person, phone, email, assigned person/sales rep, or pipeline stage.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term to match against company name, contact person, email, phone, or any team member name' },
        assignee: { type: 'string', description: 'Filter by ANY team member name (e.g. "Manasa", "Sourav", "Umamageshwari", "Ayisha", "Aman"), user UUID, or "unassigned" for unclaimed leads' },
        stage: { 
          type: 'string', 
          description: 'Filter by pipeline stage (e.g. "New Leads", "Contacted", "Interested", "Proposal Sent", "Negotiation", "Won (Converted)", "Not Interested")',
          enum: ['New Leads', 'Contacted', 'Not Interested', 'Interested', 'Proposal Sent', 'Negotiation', 'Won (Converted)', 'Onboarding', 'Completed', 'Lost']
        },
        temperature: { type: 'string', description: 'Filter by temperature: Hot, Warm, or Cold', enum: ['Hot', 'Warm', 'Cold'] },
        limit: { type: 'number', description: 'Maximum number of results to return (default 20)' }
      }
    }
  },
  {
    name: 'crm_get_lead_details',
    description: 'Get full details for a specific lead, including contact info, deal value, stage, notes, assigned rep, and recent activities.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID of the lead' }
      },
      required: ['lead_id']
    }
  },
  {
    name: 'crm_create_lead',
    description: 'Add a new prospect/lead to OOMA CRM. Can directly assign to any sales rep or leave unassigned.',
    inputSchema: {
      type: 'object',
      properties: {
        company_name: { type: 'string', description: 'Company / Organization name' },
        contact_person: { type: 'string', description: 'Primary contact or decision maker name' },
        phone: { type: 'string', description: 'Direct phone or WhatsApp number' },
        email: { type: 'string', description: 'Official business email' },
        stage: { type: 'string', description: 'Initial stage (default "New Leads")', default: 'New Leads' },
        estimated_value: { type: 'number', description: 'Estimated deal value in Indian Rupees (₹)', default: 0 },
        budget: { type: 'number', description: 'Client confirmed budget in Indian Rupees (₹)', default: 0 },
        confidence: { type: 'number', description: 'Closing confidence % (0 to 100)', default: 25 },
        service_interest: { type: 'string', description: 'Service or technology needed (e.g. Mobile App, Custom Web App, AI Automation)' },
        website: { type: 'string', description: 'Website URL' },
        address: { type: 'string', description: 'Office location or Google Maps link' },
        comment_on_business: { type: 'string', description: 'Business model insights, qualification rationale, or competitor findings' },
        temperature: { type: 'string', description: 'Hot, Warm, or Cold', enum: ['Hot', 'Warm', 'Cold'], default: 'Warm' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags array (e.g. ["Hot", "High Value", "Doctor"])' },
        assigned_to: { type: 'string', description: 'Sales rep name (e.g. "Manasa", "Sourav", "Umamageshwari") or user UUID to assign this lead to' },
        notes: { type: 'string', description: 'Initial notes or background context' }
      },
      required: ['company_name', 'contact_person']
    }
  },
  {
    name: 'crm_update_lead',
    description: 'Update fields on an existing lead. Supports all CRM fields: contact details, stage, deal value, budget, confidence, website, location, business comments, tags, rep re-assignment, and appending notes safely.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID of the lead to update' },
        company_name: { type: 'string' },
        contact_person: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        website: { type: 'string', description: 'Company website URL' },
        address: { type: 'string', description: 'Office location or Google Maps link' },
        stage: { 
          type: 'string', 
          description: 'Update pipeline stage directly in this call (e.g. "New Leads", "Contacted", "Interested", "Proposal Sent", "Negotiation", "Won (Converted)", "Not Interested")',
          enum: ['New Leads', 'Contacted', 'Not Interested', 'Interested', 'Proposal Sent', 'Negotiation', 'Won (Converted)', 'Onboarding', 'Completed', 'Lost']
        },
        estimated_value: { type: 'number' },
        budget: { type: 'number' },
        confidence: { type: 'number' },
        service_interest: { type: 'string' },
        temperature: { type: 'string', enum: ['Hot', 'Warm', 'Cold'] },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags array (e.g. ["Hot", "High Priority"])' },
        comment_on_business: { type: 'string', description: 'Business model insights, qualification rationale, or competitor analysis' },
        append_notes: { type: 'string', description: 'Safely prepends a new update to existing notes without overwriting past history' },
        notes: { type: 'string', description: 'Directly set the notes field' }
      },
      required: ['lead_id']
    }
  },
  {
    name: 'crm_update_lead_stage',
    description: 'Advance or change a lead\'s pipeline stage in the Kanban board.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID of the lead' },
        stage: { 
          type: 'string', 
          description: 'Target stage',
          enum: ['New Leads', 'Contacted', 'Not Interested', 'Interested', 'Proposal Sent', 'Negotiation', 'Won (Converted)', 'Onboarding', 'Completed', 'Lost']
        }
      },
      required: ['lead_id', 'stage']
    }
  },
  {
    name: 'crm_delete_lead',
    description: 'Delete a lead from OOMA CRM along with its attached tasks and activities (Admin/Boss action). Use with care.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID of the lead to delete' },
        reason: { type: 'string', description: 'Reason for deletion (e.g. "Duplicate entry", "Invalid test lead")' }
      },
      required: ['lead_id']
    }
  },
  {
    name: 'crm_list_pipeline',
    description: 'Get an executive summary of the sales pipeline: counts and total monetary value in each stage, optionally filtered by sales rep.',
    inputSchema: {
      type: 'object',
      properties: {
        assignee: { type: 'string', description: 'Filter pipeline summary by sales rep name (e.g. "Sourav", "Manasa", "Umamageshwari") or user UUID' },
        workspace_id: { type: 'string', description: 'Optional workspace ID filter' }
      }
    }
  },
  {
    name: 'crm_get_tasks',
    description: 'List CRM follow-up tasks. Can filter by status, specific sales rep assignee, today\'s, or overdue tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status: "Pending" or "Completed"', enum: ['Pending', 'Completed'], default: 'Pending' },
        assignee: { type: 'string', description: 'Filter tasks assigned to a specific sales rep name (e.g. "Sourav", "Manasa") or user UUID' },
        overdue_only: { type: 'boolean', description: 'If true, returns only tasks whose due date/time has passed' },
        today_only: { type: 'boolean', description: 'If true, returns tasks due today' },
        limit: { type: 'number', description: 'Max number of tasks to return (default 30)' }
      }
    }
  },
  {
    name: 'crm_create_task',
    description: 'Schedule a follow-up task. If linked to a lead (lead_id), the task is STRICTLY and automatically assigned to the lead owner (protecting lead privacy and ownership).',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title / description' },
        due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
        due_time: { type: 'string', description: 'Exact time in HH:MM:SS format (e.g. "14:30:00")', default: '10:00:00' },
        lead_id: { type: 'string', description: 'UUID of the associated lead (task will be automatically locked to the lead owner)' },
        assigned_to: { type: 'string', description: 'Optional sales rep name if creating a general task not tied to a lead' },
        activity_type: { type: 'string', description: 'Type: Call, Meeting, Email, or Task', enum: ['Call', 'Meeting', 'Email', 'Task'], default: 'Call' },
        priority: { type: 'string', description: 'Priority level: High, Medium, or Low', enum: ['High', 'Medium', 'Low'], default: 'Medium' }
      },
      required: ['title', 'due_date']
    }
  },
  {
    name: 'crm_update_task',
    description: 'Update or reschedule an existing CRM task (edit due date/time, priority, status). Cannot move tasks between sales reps — tasks belong strictly to their lead owner.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID of the task to update' },
        title: { type: 'string' },
        due_date: { type: 'string', description: 'New due date in YYYY-MM-DD format' },
        due_time: { type: 'string', description: 'New due time in HH:MM:SS format' },
        priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
        activity_type: { type: 'string', enum: ['Call', 'Meeting', 'Email', 'Task'] },
        status: { type: 'string', enum: ['Pending', 'Completed'] }
      },
      required: ['task_id']
    }
  },
  {
    name: 'crm_complete_task',
    description: 'Mark a task as completed in OOMA CRM.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID of the task to complete' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'crm_delete_task',
    description: 'Delete a task from OOMA CRM (Admin/Boss action).',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID of the task to delete' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'crm_log_interaction',
    description: 'Log a call, WhatsApp chat, email, or meeting note. Can be attributed to ANY sales rep (performed_by) on whose behalf the activity was conducted.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID of the lead' },
        interaction_type: { type: 'string', description: 'call, whatsapp, email, meeting, or note', enum: ['call', 'whatsapp', 'email', 'meeting', 'note'] },
        discussion_points: { type: 'string', description: 'Key points discussed with the client' },
        performed_by: { type: 'string', description: 'Sales rep name (e.g. "Sourav", "Manasa", "Aman") or user UUID who conducted this call/interaction' },
        sentiment: { 
          type: 'string', 
          description: 'Client reaction / sentiment. Use "Neutral" for internal research notes and first outreach before client responds.',
          enum: ['Very Interested', 'Interested', 'Hesitant', 'Not Interested', 'Neutral'],
          default: 'Neutral'
        },
        next_steps: { type: 'string', description: 'Agreed next steps or follow-up commitment' },
        additional_notes: { type: 'string', description: 'Any extra details, objections, or quotes' }
      },
      required: ['lead_id', 'interaction_type', 'discussion_points']
    }
  },
  {
    name: 'crm_find_duplicates',
    description: 'Find duplicate leads in the workspace sharing the same phone number, email address, or company name.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max number of duplicate groups to inspect (default 20)' }
      }
    }
  },
  {
    name: 'crm_list_team_members',
    description: 'List sales reps and team members in the CRM workspace with their user IDs, full names, usernames, designations, and assigned lead counts.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional search term to match against team member name or username' }
      }
    }
  },
  {
    name: 'crm_list_quotations',
    description: 'List saved commercial quotations in the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional search term to filter by project name or client name' },
        limit: { type: 'number', description: 'Maximum number of quotations to return (default 25)' }
      }
    }
  },
  {
    name: 'crm_get_quotation',
    description: 'Retrieve full details of a saved quotation by ID or project name.',
    inputSchema: {
      type: 'object',
      properties: {
        quotation_id: { type: 'string', description: 'UUID of the quotation to fetch' },
        project_name: { type: 'string', description: 'Optional project name search if quotation_id is unknown' }
      }
    }
  },
  {
    name: 'crm_create_quotation',
    description: 'Create and save a new professional quotation to the CRM database.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Project title, e.g. "E-Commerce Website - Na Chinni Kala Creations"' },
        client_name: { type: 'string', description: 'Client or company representative name' },
        client_contact: { type: 'string', description: 'Client email, phone, or company subtitle' },
        lead_id: { type: 'string', description: 'Optional CRM lead UUID to link with and advance stage to "Proposal Sent"' },
        services: { type: 'array', items: { type: 'string' } },
        currency: { type: 'string', enum: ['BOTH', 'INR', 'USD'] },
        discount: { type: 'string' },
        validity: { type: 'string' },
        include_gst: { type: 'boolean' },
        gst_rate: { type: 'string' },
        cost_items: { type: 'array', items: { type: 'object' } },
        scopes: { type: 'array', items: { type: 'object' } },
        phases: { type: 'array', items: { type: 'object' } },
        deliverables: { type: 'array', items: { type: 'string' } },
        payments: { type: 'array', items: { type: 'object' } },
        executive_summary_goal: { type: 'string' },
        exclusions: { type: 'array', items: { type: 'string' } },
        warranty: { type: 'string' },
        next_steps: { type: 'array', items: { type: 'string' } },
        created_by: { type: 'string', default: 'Atlas (AI Operations Boss)' }
      },
      required: ['project_name']
    }
  },
  {
    name: 'crm_update_quotation',
    description: 'Update an existing quotation in Supabase by quotation_id.',
    inputSchema: {
      type: 'object',
      properties: {
        quotation_id: { type: 'string', description: 'UUID of the quotation to update' },
        project_name: { type: 'string' },
        client_name: { type: 'string' },
        client_contact: { type: 'string' },
        currency: { type: 'string', enum: ['BOTH', 'INR', 'USD'] },
        discount: { type: 'string' },
        validity: { type: 'string' },
        cost_items: { type: 'array', items: { type: 'object' } },
        scopes: { type: 'array', items: { type: 'object' } },
        phases: { type: 'array', items: { type: 'object' } },
        deliverables: { type: 'array', items: { type: 'string' } },
        payments: { type: 'array', items: { type: 'object' } },
        next_steps: { type: 'array', items: { type: 'string' } }
      },
      required: ['quotation_id']
    }
  },
  {
    name: 'chat_get_messages',
    description: 'Read OMMA workspace team chat messages. Allows the AI agent to hear sales rep questions, review mentions (@Atlas, @agent), or catch up on team conversations.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of recent messages to return (default 30)' },
        mentions_only: { type: 'boolean', description: 'If true, returns only messages directed at or mentioning Atlas/Agent/Boss', default: false },
        parent_id: { type: 'string', description: 'Optional message UUID to retrieve replies in a specific thread' }
      }
    }
  },
  {
    name: 'chat_send_message',
    description: 'Post a message into the OMMA workspace team chat as Atlas (AI Operations Boss). Broadcasts in real-time so all sales reps see it in their chat widget immediately.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The text message to post to the team chat (supports markdown)' },
        parent_id: { type: 'string', description: 'Optional message UUID to reply directly to a specific thread or message' }
      },
      required: ['message']
    }
  },
  {
    name: 'workspace_get_attention_feed',
    description: 'Executive Radar: Scans OMMA workspace and CRM to return an attention checklist: unhandled chat mentions, overdue tasks across reps, unassigned leads, and stagnant deals.',
    inputSchema: {
      type: 'object',
      properties: {
        hours_back: { type: 'number', description: 'How many hours back to inspect for recent chat messages and alerts (default 24)', default: 24 }
      }
    }
  },
  {
    name: 'crm_get_server_info',
    description: 'Returns the active MCP server version (v2.0.0), connected workspace ID, role capabilities, and supported CRM features.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// ---------------------------------------------------------------------------
// TOOL EXECUTION DISPATCHER
// ---------------------------------------------------------------------------

async function executeTool(name, args) {
  try {
    switch (name) {
      case 'crm_get_server_info': {
        return {
          version: '2.0.0',
          edition: 'Operations Boss Edition',
          server_name: 'ooma-crm-mcp-server',
          role: 'Atlas (AI Operations Boss)',
          protocol_version: '2024-11-05',
          workspace_id: activeWorkspaceId,
          user_id: authenticatedUserId,
          features: [
            'Strict Private Sales Rep Lead Ownership',
            'Kanban Pipeline Stage Advancement',
            'Comment on Business (Golden Pill) Synchronization',
            '5 Structured Interaction Types (call, whatsapp, email, meeting, note)',
            'Zoho-Style Task Management & Rescheduling',
            'Modular Quotation Generator (OL-Q-2026-XXX)',
            'Workspace Team Chat with Real-Time Supabase Broadcast',
            'Executive Attention Radar Feed'
          ],
          total_tools_available: TOOLS.length
        };
      }

      case 'crm_search_leads': {
        let query = supabase.from('crm_leads').select('id, company_name, contact_person, phone, email, website, external_link, status, estimated_value, confidence, service_interest, custom_data, comment_on_business, created_at, assigned_to, assigned_user:assigned_to(id, full_name, username)', { count: 'exact' });
        if (args.stage) query = query.eq('status', args.stage);
        if (args.temperature) query = query.filter('custom_data->>temperature', 'ilike', `%${args.temperature}%`);
        if (args.assignee) {
          const a = args.assignee.trim();
          if (a.toLowerCase() === 'unassigned' || a.toLowerCase() === 'none') {
            query = query.is('assigned_to', null);
          } else {
            const matchedUserId = await resolveUserId(a);
            if (matchedUserId) {
              query = query.eq('assigned_to', matchedUserId);
            } else {
              return { total_matched: 0, count: 0, leads: [], message: `No team member found matching "${args.assignee}". Use crm_list_team_members to see available members.` };
            }
          }
        }
        if (args.query) {
          const q = args.query.trim();
          const matchedUserId = await resolveUserId(q);

          let orFilter = `company_name.ilike.%${q}%,contact_person.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`;
          if (matchedUserId) {
            orFilter += `,assigned_to.eq.${matchedUserId}`;
          }
          query = query.or(orFilter);
        }
        query = query.order('created_at', { ascending: false }).limit(args.limit || 20);
        const { data, count, error } = await query;
        if (error) throw error;
        const formattedLeads = (data || []).map(lead => {
          const customTags = lead.custom_data?.tags;
          const tagsList = Array.isArray(customTags)
            ? [...customTags]
            : (typeof customTags === 'string' ? [customTags] : []);
          if (lead.custom_data?.temperature && !tagsList.includes(lead.custom_data.temperature)) {
            tagsList.push(lead.custom_data.temperature);
          }
          return {
            ...lead,
            tags: tagsList
          };
        });
        return { total_matched: count !== null ? count : (data ? data.length : 0), count: formattedLeads.length, leads: formattedLeads };
      }

      case 'crm_get_lead_details': {
        const { data: lead, error: lErr } = await supabase
          .from('crm_leads')
          .select('*, assigned_user:assigned_to(id, full_name, username, designation)')
          .eq('id', args.lead_id)
          .single();
        if (lErr) throw lErr;

        if (lead) {
          const customTags = lead.custom_data?.tags;
          const tagsList = Array.isArray(customTags)
            ? [...customTags]
            : (typeof customTags === 'string' ? [customTags] : []);
          if (lead.custom_data?.temperature && !tagsList.includes(lead.custom_data.temperature)) {
            tagsList.push(lead.custom_data.temperature);
          }
          lead.tags = tagsList;
        }

        const { data: tasks } = await supabase
          .from('crm_tasks')
          .select('id, title, status, due_date, due_time, priority, activity_type, assigned_to, assigned_user:assigned_to(id, full_name, username)')
          .eq('lead_id', args.lead_id)
          .order('due_date', { ascending: false });

        const { data: activities } = await supabase
          .from('crm_activities')
          .select('id, activity_type, description, created_at, user_id, users:user_id(id, full_name, username)')
          .eq('lead_id', args.lead_id)
          .order('created_at', { ascending: false })
          .limit(15);

        return { lead, tasks: tasks || [], recent_activities: activities || [] };
      }

      case 'crm_create_lead': {
        const payload = {
          company_name: args.company_name.trim(),
          contact_person: args.contact_person.trim(),
          phone: args.phone?.trim() || null,
          email: args.email?.trim() || null,
          status: args.stage || 'New Leads',
          estimated_value: args.estimated_value || 0,
          budget: args.budget || 0,
          confidence: args.confidence || 25,
          service_interest: args.service_interest || 'Custom Software',
          website: args.website || null,
          external_link: args.address || null,
          comment_on_business: args.comment_on_business || null,
          notes: args.notes || '',
          custom_data: {
            source: 'MCP Agent',
            temperature: args.temperature || 'Warm',
            created_via: 'Atlas AI Boss / MCP'
          }
        };

        if (args.tags && Array.isArray(args.tags)) {
          payload.custom_data.tags = args.tags;
        }

        if (activeWorkspaceId) payload.workspace_id = activeWorkspaceId;
        
        if (args.assigned_to) {
          const repId = await resolveUserId(args.assigned_to);
          if (repId) payload.assigned_to = repId;
        } else if (authenticatedUserId) {
          payload.created_by = authenticatedUserId;
          payload.assigned_to = authenticatedUserId;
        }

        const { data, error } = await supabase
          .from('crm_leads')
          .insert([payload])
          .select('*, assigned_user:assigned_to(id, full_name, username)')
          .single();

        if (error && error.code !== '22P02') throw error;
        return { success: true, message: `Lead '${args.company_name}' created successfully`, lead: data || payload };
      }

      case 'crm_update_lead': {
        const updates = {};
        if (args.company_name !== undefined) updates.company_name = args.company_name;
        if (args.contact_person !== undefined) updates.contact_person = args.contact_person;
        if (args.phone !== undefined) updates.phone = args.phone;
        if (args.email !== undefined) updates.email = args.email;
        if (args.website !== undefined) updates.website = args.website;
        if (args.address !== undefined) updates.external_link = args.address;
        if (args.comment_on_business !== undefined) {
          updates.comment_on_business = args.comment_on_business;
          const { data: existingLead } = await supabase.from('crm_leads').select('custom_data').eq('id', args.lead_id).single();
          updates.custom_data = {
            ...(existingLead?.custom_data || {}),
            comment_on_business: args.comment_on_business
          };
        }
        if (args.estimated_value !== undefined) updates.estimated_value = args.estimated_value;
        if (args.budget !== undefined) updates.budget = args.budget;
        if (args.confidence !== undefined) updates.confidence = args.confidence;
        if (args.service_interest !== undefined) updates.service_interest = args.service_interest;
        if (args.stage !== undefined) updates.status = args.stage;
        
        if (args.temperature !== undefined) {
          const { data: existingLead } = await supabase.from('crm_leads').select('custom_data').eq('id', args.lead_id).single();
          const existingTags = Array.isArray(existingLead?.custom_data?.tags) ? existingLead.custom_data.tags : [];
          const updatedTags = !existingTags.includes(args.temperature)
            ? [...existingTags.filter(t => !['Hot', 'Warm', 'Cold'].includes(t)), args.temperature]
            : existingTags;
          updates.custom_data = {
            ...(existingLead?.custom_data || {}),
            ...(updates.custom_data || {}),
            temperature: args.temperature,
            tags: updatedTags
          };
        }

        if (args.tags !== undefined) {
          const tagsArr = Array.isArray(args.tags) ? args.tags : [String(args.tags)];
          const { data: existingLead } = await supabase.from('crm_leads').select('custom_data').eq('id', args.lead_id).single();
          updates.custom_data = {
            ...(existingLead?.custom_data || {}),
            ...(updates.custom_data || {}),
            tags: tagsArr
          };
        }

        // Smart note handling: append_notes avoids wiping existing conversation logs
        if (args.append_notes) {
          const { data: existingLead } = await supabase.from('crm_leads').select('notes').eq('id', args.lead_id).single();
          const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const noteHeader = `[NOTE] ${timestamp}\n${args.append_notes}`;
          updates.notes = existingLead?.notes ? `${noteHeader}\n\n---\n\n${existingLead.notes}` : noteHeader;
        } else if (args.notes !== undefined) {
          updates.notes = args.notes;
        }

        updates.last_activity_at = new Date().toISOString();

        const { data, error } = await supabase
          .from('crm_leads')
          .update(updates)
          .eq('id', args.lead_id)
          .select('*, assigned_user:assigned_to(id, full_name, username)')
          .single();

        if (error && error.code !== '22P02') throw error;
        return { success: true, message: 'Lead updated successfully', lead: data };
      }

      case 'crm_update_lead_stage': {
        const { data, error } = await supabase
          .from('crm_leads')
          .update({
            status: args.stage,
            last_activity_at: new Date().toISOString()
          })
          .eq('id', args.lead_id)
          .select('id, company_name, status')
          .single();

        if (error && error.code !== '22P02') throw error;
        return { success: true, message: `Moved lead to stage '${args.stage}'`, lead: data };
      }

      case 'crm_delete_lead': {
        // Cascade cleanup attached activities & tasks first
        await supabase.from('crm_activities').delete().eq('lead_id', args.lead_id).catch(() => {});
        await supabase.from('crm_tasks').delete().eq('lead_id', args.lead_id).catch(() => {});
        
        const { data, error } = await supabase
          .from('crm_leads')
          .delete()
          .eq('id', args.lead_id)
          .select('id, company_name')
          .single();

        if (error) throw error;
        return { success: true, message: `Lead '${data?.company_name || args.lead_id}' deleted successfully.`, deleted_lead: data };
      }

      case 'crm_list_pipeline': {
        let q = supabase.from('crm_leads').select('status, estimated_value, assigned_to');

        if (args.assignee) {
          const a = args.assignee.trim();
          if (a.toLowerCase() === 'unassigned' || a.toLowerCase() === 'none') {
            q = q.is('assigned_to', null);
          } else {
            const repId = await resolveUserId(a);
            if (repId) {
              q = q.eq('assigned_to', repId);
            } else {
              return { totalActiveDeals: 0, totalPipelineValue: 0, stage_breakdown: {}, message: `No team member found matching "${args.assignee}".` };
            }
          }
        }

        const { data: leads, error } = await q;
        if (error) throw error;

        const summary = {
          'New Leads': { count: 0, total_value: 0 },
          'Contacted': { count: 0, total_value: 0 },
          'Interested': { count: 0, total_value: 0 },
          'Proposal Sent': { count: 0, total_value: 0 },
          'Negotiation': { count: 0, total_value: 0 },
          'Won (Converted)': { count: 0, total_value: 0 },
          'Not Interested': { count: 0, total_value: 0 },
          'Lost': { count: 0, total_value: 0 }
        };

        let totalPipelineValue = 0;
        let totalActiveDeals = 0;

        for (const l of (leads || [])) {
          const stage = l.status || 'New Leads';
          if (!summary[stage]) summary[stage] = { count: 0, total_value: 0 };
          const val = Number(l.estimated_value) || 0;
          summary[stage].count += 1;
          summary[stage].total_value += val;

          if (!['Not Interested', 'Lost'].includes(stage)) {
            totalPipelineValue += val;
            totalActiveDeals += 1;
          }
        }

        return { totalActiveDeals, totalPipelineValue, stage_breakdown: summary };
      }

      case 'crm_get_tasks': {
        let query = supabase
          .from('crm_tasks')
          .select('id, title, status, due_date, due_time, priority, activity_type, lead_id, assigned_to, crm_leads(company_name, contact_person, phone)');

        if (args.status) query = query.eq('status', args.status);
        if (args.assignee) {
          const repId = await resolveUserId(args.assignee);
          if (repId) query = query.eq('assigned_to', repId);
        }

        const todayStr = new Date().toISOString().split('T')[0];
        if (args.today_only) {
          query = query.eq('due_date', todayStr);
        } else if (args.overdue_only) {
          query = query.eq('status', 'Pending').lt('due_date', todayStr);
        }

        query = query.order('due_date', { ascending: true }).limit(args.limit || 30);
        const { data, error } = await query;
        if (error) throw error;
        return { count: data.length, tasks: data };
      }

      case 'crm_create_task': {
        let assigneeId = authenticatedUserId;
        let assigneeName = 'Atlas';

        // STRICT LEAD OWNERSHIP ENFORCEMENT:
        // If linked to a lead, the task MUST belong to that lead's owner!
        if (args.lead_id) {
          const { data: lead } = await supabase
            .from('crm_leads')
            .select('id, company_name, assigned_to, assigned_user:assigned_to(id, full_name, username)')
            .eq('id', args.lead_id)
            .single();

          if (lead) {
            if (lead.assigned_to) {
              // Lead already has an owner — task is strictly locked to this lead owner!
              assigneeId = lead.assigned_to;
              assigneeName = lead.assigned_user?.full_name || lead.assigned_user?.username || 'Lead Owner';
            } else if (args.assigned_to) {
              // Lead was unassigned — assign both lead and task to this sales rep
              const rep = await resolveUser(args.assigned_to);
              if (rep) {
                assigneeId = rep.id;
                assigneeName = rep.full_name || rep.username;
                await supabase.from('crm_leads').update({ assigned_to: rep.id }).eq('id', args.lead_id);
              }
            }
          }
        } else if (args.assigned_to) {
          // General workspace task (not tied to a specific lead)
          const rep = await resolveUser(args.assigned_to);
          if (rep) {
            assigneeId = rep.id;
            assigneeName = rep.full_name || rep.username;
          }
        }

        const payload = {
          title: args.title.trim(),
          due_date: args.due_date,
          due_time: args.due_time || '10:00:00',
          activity_type: args.activity_type || 'Call',
          priority: args.priority || 'Medium',
          status: 'Pending',
          created_by: authenticatedUserId,
          assigned_to: assigneeId
        };

        if (args.lead_id) payload.lead_id = args.lead_id;
        if (activeWorkspaceId) payload.workspace_id = activeWorkspaceId;

        const { data, error } = await supabase
          .from('crm_tasks')
          .insert([payload])
          .select()
          .single();

        if (error && error.code !== '22P02') throw error;
        return { 
          success: true, 
          message: `Task '${args.title}' assigned to lead owner ${assigneeName} for ${args.due_date} at ${args.due_time || '10:00'}`, 
          task: { ...(data || payload), assigned_to_name: assigneeName } 
        };
      }

      case 'crm_update_task': {
        const updates = {};
        if (args.title !== undefined) updates.title = args.title.trim();
        if (args.due_date !== undefined) updates.due_date = args.due_date;
        if (args.due_time !== undefined) updates.due_time = args.due_time;
        if (args.priority !== undefined) updates.priority = args.priority;
        if (args.activity_type !== undefined) updates.activity_type = args.activity_type;
        if (args.status !== undefined) updates.status = args.status;
        
        // NOTE: Tasks cannot be swapped between sales reps (strictly belongs to lead owner)

        const { data, error } = await supabase
          .from('crm_tasks')
          .update(updates)
          .eq('id', args.task_id)
          .select()
          .single();

        if (error) throw error;
        return { success: true, message: 'Task updated successfully', task: data };
      }

      case 'crm_complete_task': {
        const { data, error } = await supabase
          .from('crm_tasks')
          .update({ status: 'Completed' })
          .eq('id', args.task_id)
          .select()
          .single();

        if (error && error.code !== '22P02') throw error;
        return { success: true, message: 'Task marked as completed', task: data };
      }

      case 'crm_delete_task': {
        const { data, error } = await supabase
          .from('crm_tasks')
          .delete()
          .eq('id', args.task_id)
          .select('id, title')
          .single();

        if (error) throw error;
        return { success: true, message: `Task '${data?.title || args.task_id}' deleted successfully.` };
      }

      case 'crm_log_interaction': {
        // Find lead owner so interaction is strictly attributed to the lead owner
        const { data: lead } = await supabase
          .from('crm_leads')
          .select('id, notes, status, assigned_to, assigned_user:assigned_to(id, full_name, username)')
          .eq('id', args.lead_id)
          .single();

        let repId = lead?.assigned_to || authenticatedUserId;
        let repName = lead?.assigned_user?.full_name || lead?.assigned_user?.username || 'Atlas';

        // If explicitly requested by caller and lead is unassigned
        if (!lead?.assigned_to && args.performed_by) {
          const rep = await resolveUser(args.performed_by);
          if (rep) {
            repId = rep.id;
            repName = rep.full_name || rep.username;
          }
        }

        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const typeIcons = {
          call: '📞',
          email: '📧',
          meeting: '🤝',
          whatsapp: '💬',
          note: '📝'
        };
        const icon = typeIcons[args.interaction_type.toLowerCase()] || '📝';
        const defaultSentiment = args.interaction_type === 'note' ? 'Neutral' : 'Neutral';
        const formattedNote = `${icon} ${args.interaction_type.toUpperCase()} INTERACTION LOG (${repName} • ${dateStr})\n` +
          `• Discussion Points: ${args.discussion_points}\n` +
          `• Client Sentiment: ${args.sentiment || defaultSentiment}\n` +
          `• Agreed Next Steps: ${args.next_steps || 'None'}` +
          (args.additional_notes ? `\n• Additional Details: ${args.additional_notes}` : '');

        // 1. Insert into crm_activities attributed to the lead owner
        const actPayload = {
          lead_id: args.lead_id,
          activity_type: args.interaction_type,
          description: formattedNote,
          user_id: repId,
          created_by: repId
        };
        if (activeWorkspaceId) actPayload.workspace_id = activeWorkspaceId;

        const { error: actError } = await supabase.from('crm_activities').insert([actPayload]);
        if (actError && actError.code !== '22P02') throw actError;

        // 2. Prepend note into crm_leads.notes
        const updatedNotes = lead?.notes ? `${formattedNote}\n\n---\n\n${lead.notes}` : formattedNote;
        const updates = {
          notes: updatedNotes,
          last_activity_at: new Date().toISOString()
        };
        
        // Auto-progress from 'New Leads' to 'Contacted' only on actual outreach (not on internal notes)
        if (args.interaction_type !== 'note' && lead?.status === 'New Leads') {
          updates.status = 'Contacted';
        }

        await supabase.from('crm_leads').update(updates).eq('id', args.lead_id);

        return { 
          success: true, 
          message: `Logged ${args.interaction_type} interaction under ${repName} with sentiment '${args.sentiment || 'Interested'}'`, 
          formattedNote 
        };
      }

      case 'crm_find_duplicates': {
        const { data: leads, error } = await supabase
          .from('crm_leads')
          .select('id, company_name, contact_person, phone, email, status, created_at')
          .limit(200);
        if (error) throw error;

        const phoneMap = new Map();
        const emailMap = new Map();
        const duplicates = [];

        for (const l of (leads || [])) {
          if (l.phone) {
            const cleanPhone = l.phone.replace(/\D/g, '').slice(-10);
            if (cleanPhone.length >= 10) {
              if (phoneMap.has(cleanPhone)) {
                duplicates.push({ matchType: 'phone', matchedValue: cleanPhone, leadA: phoneMap.get(cleanPhone), leadB: l });
              } else {
                phoneMap.set(cleanPhone, l);
              }
            }
          }
          if (l.email) {
            const cleanEmail = l.email.trim().toLowerCase();
            if (emailMap.has(cleanEmail)) {
              duplicates.push({ matchType: 'email', matchedValue: cleanEmail, leadA: emailMap.get(cleanEmail), leadB: l });
            } else {
              emailMap.set(cleanEmail, l);
            }
          }
        }

        return { duplicatesCount: duplicates.length, duplicatePairs: duplicates.slice(0, args.limit || 20) };
      }

      case 'crm_list_team_members': {
        let q = supabase
          .from('users')
          .select('id, full_name, username, role, designation');
        if (activeWorkspaceId) q = q.eq('workspace_id', activeWorkspaceId);
        if (args.query) {
          const s = args.query.trim();
          q = q.or(`full_name.ilike.%${s}%,username.ilike.%${s}%`);
        }
        const { data: users, error } = await q;
        if (error) throw error;

        // Fetch lead counts for each member
        const { data: leadRows } = await supabase
          .from('crm_leads')
          .select('assigned_to');

        const countMap = {};
        let unassignedCount = 0;
        (leadRows || []).forEach(l => {
          if (l.assigned_to) {
            countMap[l.assigned_to] = (countMap[l.assigned_to] || 0) + 1;
          } else {
            unassignedCount++;
          }
        });

        // Fetch pending task counts
        const { data: taskRows } = await supabase
          .from('crm_tasks')
          .select('assigned_to')
          .eq('status', 'Pending');

        const taskCountMap = {};
        (taskRows || []).forEach(t => {
          if (t.assigned_to) {
            taskCountMap[t.assigned_to] = (taskCountMap[t.assigned_to] || 0) + 1;
          }
        });

        const teamWithCounts = (users || []).map(u => ({
          id: u.id,
          name: u.full_name || u.username,
          username: u.username,
          full_name: u.full_name,
          role: u.role,
          designation: u.designation,
          assigned_leads_count: countMap[u.id] || 0,
          pending_tasks_count: taskCountMap[u.id] || 0
        }));

        return {
          total_team_members: teamWithCounts.length,
          unassigned_leads_count: unassignedCount,
          team_members: teamWithCounts
        };
      }

      case 'chat_get_messages': {
        let query = supabase
          .from('chat_messages')
          .select('id, message, user_id, created_at, parent_id, is_edited, users:user_id(id, username, full_name, designation, role)')
          .eq('workspace_id', activeWorkspaceId)
          .order('created_at', { ascending: false })
          .limit(args.limit || 30);

        if (args.parent_id) {
          query = query.eq('parent_id', args.parent_id);
        }

        const { data, error } = await query;
        if (error) throw error;

        let messages = (data || []).reverse().map(m => ({
          id: m.id,
          sender_id: m.user_id,
          sender_name: m.users?.full_name || m.users?.username || 'Teammate',
          sender_role: m.users?.designation || m.users?.role || 'Team Member',
          message: m.message,
          created_at: m.created_at,
          parent_id: m.parent_id
        }));

        if (args.mentions_only) {
          const mentionRegex = /@(atlas|agent|boss|ai)/i;
          messages = messages.filter(m => mentionRegex.test(m.message));
        }

        return {
          workspace_id: activeWorkspaceId,
          total_retrieved: messages.length,
          messages
        };
      }

      case 'chat_send_message': {
        const payload = {
          user_id: authenticatedUserId,
          workspace_id: activeWorkspaceId,
          message: args.message.trim(),
          parent_id: args.parent_id || null
        };

        const { data, error } = await supabase
          .from('chat_messages')
          .insert([payload])
          .select('*, users:user_id(id, username, full_name, designation)')
          .single();

        if (error) throw error;

        // Broadcast to Realtime WebSocket channel for instant UI sync
        await broadcastChatMessage(data);

        return {
          success: true,
          message_id: data.id,
          sender: data.users?.full_name || data.users?.username || 'Atlas (AI Operations Boss)',
          sent_at: data.created_at,
          text: data.message
        };
      }

      case 'workspace_get_attention_feed': {
        const hours = args.hours_back || 24;
        const sinceDate = new Date(Date.now() - hours * 3600 * 1000).toISOString();
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Unhandled Mentions or Questions in Chat
        const { data: recentChats } = await supabase
          .from('chat_messages')
          .select('id, message, created_at, user_id, users:user_id(username, full_name)')
          .eq('workspace_id', activeWorkspaceId)
          .gte('created_at', sinceDate)
          .order('created_at', { ascending: false })
          .limit(20);

        const mentionRegex = /@(atlas|agent|boss|ai)/i;
        const mentions = (recentChats || [])
          .filter(c => c.user_id !== authenticatedUserId && (mentionRegex.test(c.message) || c.message.includes('?')))
          .map(c => ({
            id: c.id,
            from: c.users?.full_name || c.users?.username || 'Teammate',
            message: c.message,
            time: c.created_at
          }));

        // 2. Overdue Tasks across all reps
        const { data: rawOverdue } = await supabase
          .from('crm_tasks')
          .select('id, title, due_date, due_time, priority, assigned_to, crm_leads(company_name, phone)')
          .eq('status', 'Pending')
          .lt('due_date', todayStr)
          .order('due_date', { ascending: true })
          .limit(20);

        // Fetch team members map to resolve assigned_to names
        const { data: teamUsers } = await supabase.from('users').select('id, full_name, username');
        const userMap = new Map((teamUsers || []).map(u => [u.id, u.full_name || u.username]));

        const overdueTasks = (rawOverdue || []).map(t => ({
          ...t,
          assigned_rep_name: userMap.get(t.assigned_to) || 'Unassigned'
        }));

        // 3. Unassigned Leads needing allocation
        const { data: unassignedLeads } = await supabase
          .from('crm_leads')
          .select('id, company_name, contact_person, phone, email, created_at')
          .is('assigned_to', null)
          .order('created_at', { ascending: false })
          .limit(15);

        // 4. Stagnant Leads (Contacted > 3 days ago with no new notes)
        const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000).toISOString();
        const { data: stagnantLeads } = await supabase
          .from('crm_leads')
          .select('id, company_name, status, last_activity_at, assigned_user:assigned_to(username, full_name)')
          .in('status', ['New Leads', 'Contacted'])
          .lt('last_activity_at', threeDaysAgo)
          .order('last_activity_at', { ascending: true })
          .limit(10);

        const actionItems = [];
        if (mentions.length > 0) {
          actionItems.push(`💬 ${mentions.length} team member(s) mentioned Atlas or asked questions in workspace chat. Reply using chat_send_message.`);
        }
        if (unassignedLeads?.length > 0) {
          actionItems.push(`📥 ${unassignedLeads.length} new lead(s) are unassigned. Triage and delegate to sales reps using crm_reassign_leads_bulk.`);
        }
        if (overdueTasks?.length > 0) {
          actionItems.push(`⚠️ ${overdueTasks.length} task(s) are overdue. Follow up with assigned reps or reschedule.`);
        }
        if (stagnantLeads?.length > 0) {
          actionItems.push(`⏳ ${stagnantLeads.length} lead(s) have been stagnant for >3 days. Assign follow-up calls or log fresh interaction notes.`);
        }

        return {
          executive_summary: {
            workspace_id: activeWorkspaceId,
            scan_period_hours: hours,
            unread_mentions_count: mentions.length,
            overdue_tasks_count: (overdueTasks || []).length,
            unassigned_leads_count: (unassignedLeads || []).length,
            stagnant_leads_count: (stagnantLeads || []).length
          },
          action_items: actionItems,
          team_chat_mentions: mentions,
          overdue_tasks: overdueTasks || [],
          unassigned_leads: unassignedLeads || [],
          stagnant_leads: stagnantLeads || []
        };
      }

      case 'crm_list_quotations': {
        let query = supabase.from('quotations').select('id, project_name, created_at, form_data').order('created_at', { ascending: false });
        if (args.limit) query = query.limit(args.limit);
        else query = query.limit(25);

        const { data, error } = await query;
        if (error) throw error;

        let results = (data || []).map(q => {
          const d = q.form_data || {};
          const meta = d.metaFields || [];
          const clientName = meta.find(m => m.label?.toLowerCase().includes('prepared for'))?.value || d.clientName || 'N/A';
          const quoteNum = meta.find(m => m.label?.toLowerCase().includes('quotation #'))?.value || 'N/A';
          const items = d.costItems || [];
          const currency = d.currency || 'BOTH';
          const createdBy = d.createdBy || d.savedBy || 'Web User';
          const isAgent = d.source === 'ai_agent_mcp' || String(createdBy).toLowerCase().includes('agent') || String(createdBy).toLowerCase().includes('atlas');

          return {
            id: q.id,
            project_name: q.project_name || 'Untitled Quotation',
            client_name: clientName,
            quotation_number: quoteNum,
            currency,
            items_count: items.length,
            created_at: q.created_at,
            created_by: createdBy,
            source: d.source || 'web',
            is_ai_agent: isAgent,
            lead_id: d.leadId || null
          };
        });

        if (args.query) {
          const qStr = args.query.toLowerCase();
          results = results.filter(r => 
            r.project_name.toLowerCase().includes(qStr) || 
            r.client_name.toLowerCase().includes(qStr) ||
            r.quotation_number.toLowerCase().includes(qStr)
          );
        }

        return {
          total_quotations: results.length,
          quotations: results
        };
      }

      case 'crm_get_quotation': {
        if (!args.quotation_id && !args.project_name) {
          throw new Error('Either quotation_id or project_name must be provided.');
        }

        let query = supabase.from('quotations').select('*');
        if (args.quotation_id) {
          query = query.eq('id', args.quotation_id);
        } else {
          query = query.ilike('project_name', `%${args.project_name}%`);
        }

        const { data, error } = await query.limit(1).single();
        if (error) throw error;
        if (!data) return { found: false, message: 'No quotation found with given criteria.' };

        return {
          found: true,
          id: data.id,
          project_name: data.project_name,
          created_at: data.created_at,
          form_data: data.form_data
        };
      }

      case 'crm_create_quotation': {
        let clientName = args.client_name;
        let clientContact = args.client_contact;

        if (args.lead_id) {
          const { data: lead } = await supabase.from('crm_leads').select('company_name, contact_person, phone, email').eq('id', args.lead_id).single();
          if (lead) {
            if (!clientName) clientName = lead.contact_person || lead.company_name;
            if (!clientContact) clientContact = [lead.email, lead.phone].filter(Boolean).join(' | ');
          }
        }

        clientName = clientName || 'Valued Client';
        clientContact = clientContact || '';

        const quoteYear = new Date().getFullYear();
        const randId = String(Math.floor(Math.random() * 900) + 100);
        const quoteNum = `OL-Q-${quoteYear}-${randId}`;
        const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const validity = args.validity || '14';

        const metaFields = [
          { label: 'Prepared For', value: clientName, subValue: clientContact },
          { label: 'Quotation #', value: quoteNum },
          { label: 'Date', value: dateStr, subValue: `Valid for ${validity} days` }
        ];

        const defaultScopes = [
          { title: 'Frontend Development', desc: 'Modern responsive interface with mobile optimization, custom theme, and brand typography.' },
          { title: 'Backend API & Database', desc: 'Secure APIs, schema design, and production integration.' }
        ];

        const defaultPhases = [
          { name: 'Discovery & Design', days: '5 Days', tasks: 'Requirements confirmation, wireframes, and creative sign-off' },
          { name: 'Core Build', days: '14 Days', tasks: 'Component engineering, database setup, and system integration' },
          { name: 'Testing & Launch', days: '5 Days', tasks: 'QA verification, client acceptance testing, and production go-live' }
        ];

        const defaultPayments = [
          { pct: '50%', label: 'Deposit', trigger: 'Upon proposal approval to reserve schedule' },
          { pct: '25%', label: 'Milestone', trigger: 'Upon functional beta preview walkthrough' },
          { pct: '25%', label: 'Final', trigger: 'Prior to DNS go-live and source handover' }
        ];

        const formData = {
          projectName: args.project_name,
          metaFields: metaFields,
          costItems: args.cost_items && args.cost_items.length > 0 ? args.cost_items : [
            { label: args.project_name, amount: '45,000', qty: '1', unitPriceINR: '45000', unitPriceUSD: '550' }
          ],
          selectedServices: args.services || ['Web Application'],
          customServices: [],
          companyName: 'OomaLabs',
          companyAddress: 'Gachibowli, Hyderabad, Telangana, India',
          companyContact: 'oomalabs@gmail.com | 9381167058 | www.oomalabs.com',
          signatureName: 'OomaLabs Team',
          signatureTitle: 'Authorized Signature',
          currency: args.currency || 'BOTH',
          includeGST: args.include_gst ?? false,
          gstRate: args.gst_rate || '18',
          discount: args.discount || '15',
          validity: validity,
          payments: args.payments && args.payments.length > 0 ? args.payments : defaultPayments,
          scopes: args.scopes && args.scopes.length > 0 ? args.scopes : defaultScopes,
          phases: args.phases && args.phases.length > 0 ? args.phases : defaultPhases,
          deliverables: args.deliverables && args.deliverables.length > 0 ? args.deliverables : [
            'Fully responsive production web application / digital asset',
            'Mobile-first performance tested interfaces',
            'Full documentation, admin access, and 30-day post-launch warranty'
          ],
          terms: [
            'Revisions outside the specified scope may incur additional charges at standard hourly rates.',
            'Client delays in providing required assets may extend the final delivery deadline.',
            'Source files and intellectual property transfer upon final payment completion.',
            'All prices are quoted in USD and INR with independent tier pricing.'
          ],
          executiveSummaryGoal: args.executive_summary_goal || 'generate leads, build digital presence, and streamline operations',
          exclusions: args.exclusions && args.exclusions.length > 0 ? args.exclusions : [
            'Content writing or copywriting services (unless specified).',
            'Purchasing of third-party software licenses or stock photography.',
            'Data migration from legacy systems (unless expressly stated above).'
          ],
          warranty: args.warranty || '30-day post-launch warranty for fixing reproducible bugs within the original scope. New features post-launch are billed separately.',
          nextSteps: args.next_steps && args.next_steps.length > 0 ? args.next_steps : [
            'Review and approve this quotation by signing the acceptance block.',
            'Process the initial deposit to secure project scheduling.',
            'Schedule kickoff workshop with the team to commence discovery.'
          ],
          leadId: args.lead_id || null,
          createdBy: args.created_by || 'Atlas (AI Operations Boss)',
          source: 'ai_agent_mcp',
          createdAt: new Date().toISOString()
        };

        const { data: inserted, error: insErr } = await supabase.from('quotations').insert([{
          project_name: args.project_name,
          form_data: formData,
          created_at: new Date().toISOString()
        }]).select();

        if (insErr) throw insErr;
        const newQuotation = inserted?.[0];

        // If lead_id is provided, automatically log activity note & advance stage
        if (args.lead_id && newQuotation) {
          const actNote = `📋 QUOTATION GENERATED (${quoteNum})\n` +
            `Project: ${args.project_name}\n` +
            `Client: ${clientName}\n` +
            `Validity: ${validity} Days\n` +
            `Created by: ${formData.createdBy}\n` +
            `View in App: /quotation`;

          const actPayload = {
            lead_id: args.lead_id,
            activity_type: 'note',
            description: actNote
          };
          if (activeWorkspaceId) actPayload.workspace_id = activeWorkspaceId;
          if (authenticatedUserId) {
            actPayload.user_id = authenticatedUserId;
            actPayload.created_by = authenticatedUserId;
          }
          await supabase.from('crm_activities').insert([actPayload]).catch(() => {});

          await supabase.from('crm_leads').update({
            status: 'Proposal Sent',
            last_activity_at: new Date().toISOString()
          }).eq('id', args.lead_id).catch(() => {});
        }

        return {
          success: true,
          message: `Quotation "${args.project_name}" created successfully and saved to Supabase!`,
          quotation_id: newQuotation?.id,
          quotation_number: quoteNum,
          project_name: args.project_name,
          created_by: formData.createdBy,
          app_url: '/quotation',
          view_instruction: 'This quotation is now saved in Supabase and will immediately appear in the user\'s Quotation Generator history.'
        };
      }

      case 'crm_update_quotation': {
        const { data: existing, error: getErr } = await supabase.from('quotations').select('*').eq('id', args.quotation_id).single();
        if (getErr || !existing) throw new Error(`Quotation not found with ID ${args.quotation_id}`);

        const currentFormData = existing.form_data || {};
        const updatedFormData = { ...currentFormData };

        if (args.project_name) updatedFormData.projectName = args.project_name;
        if (args.client_name || args.client_contact) {
          const meta = updatedFormData.metaFields || [];
          updatedFormData.metaFields = meta.map(m => {
            if (m.label?.toLowerCase().includes('prepared for')) {
              return {
                ...m,
                value: args.client_name || m.value,
                subValue: args.client_contact !== undefined ? args.client_contact : m.subValue
              };
            }
            return m;
          });
        }
        if (args.currency) updatedFormData.currency = args.currency;
        if (args.discount) updatedFormData.discount = args.discount;
        if (args.validity) updatedFormData.validity = args.validity;
        if (args.cost_items) updatedFormData.costItems = args.cost_items;
        if (args.scopes) updatedFormData.scopes = args.scopes;
        if (args.phases) updatedFormData.phases = args.phases;
        if (args.deliverables) updatedFormData.deliverables = args.deliverables;
        if (args.payments) updatedFormData.payments = args.payments;
        if (args.next_steps) updatedFormData.nextSteps = args.next_steps;

        updatedFormData.updatedAt = new Date().toISOString();
        updatedFormData.lastUpdatedBy = 'Atlas (AI Operations Boss)';

        const { data: updated, error: updErr } = await supabase
          .from('quotations')
          .update({
            project_name: args.project_name || existing.project_name,
            form_data: updatedFormData
          })
          .eq('id', args.quotation_id)
          .select();

        if (updErr) throw updErr;

        return {
          success: true,
          message: `Quotation "${args.quotation_id}" updated successfully!`,
          quotation_id: args.quotation_id,
          project_name: args.project_name || existing.project_name
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return { error: true, message: err.message || String(err) };
  }
}

// ---------------------------------------------------------------------------
// JSON-RPC 2.0 STDIO TRANSPORT HANDLER
// ---------------------------------------------------------------------------

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function sendResponse(id, result, error = null) {
  const response = { jsonrpc: '2.0', id };
  if (error) {
    response.error = error;
  } else {
    response.result = result;
  }
  process.stdout.write(JSON.stringify(response) + '\n');
}

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request;
  try {
    request = JSON.parse(trimmed);
  } catch (err) {
    return sendResponse(null, null, { code: -32700, message: 'Parse error: invalid JSON' });
  }

  const { id, method, params } = request;

  try {
    switch (method) {
      case 'initialize': {
        sendResponse(id, {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'ooma-crm-mcp-server',
            version: '2.0.0',
            startedAt: new Date().toISOString()
          }
        });
        break;
      }

      case 'notifications/initialized': {
        break;
      }

      case 'ping': {
        sendResponse(id, {});
        break;
      }

      case 'tools/list': {
        sendResponse(id, { tools: TOOLS });
        break;
      }

      case 'tools/call': {
        const { name, arguments: toolArgs } = params || {};
        if (!name) {
          sendResponse(id, null, { code: -32602, message: 'Missing tool name' });
          return;
        }

        // Await auth before EVERY tool execution to guarantee RLS session
        await ensureAuth();

        const result = await executeTool(name, toolArgs || {});
        sendResponse(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        });
        break;
      }

      default: {
        if (id !== undefined && id !== null) {
          sendResponse(id, null, { code: -32601, message: `Method not found: ${method}` });
        }
        break;
      }
    }
  } catch (handlerErr) {
    if (id !== undefined && id !== null) {
      sendResponse(id, null, { code: -32603, message: handlerErr.message || 'Internal error' });
    }
  }
});

// Process signal handling
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
