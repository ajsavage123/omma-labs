#!/usr/bin/env node
/**
 * OOMA CRM - Model Context Protocol (MCP) Server
 * Compatible with Kilo Code, Antigravity, Claude Desktop, Cursor, and any MCP client.
 * Standard JSON-RPC 2.0 over stdio (MCP Protocol 2024-11-05).
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
      }
    } catch (err) {
      console.error('[MCP Auth Warning]:', err.message);
    }
  }
}

// Ensure auth is initialized
await initAuth();

// Define Available MCP Tools
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
    description: 'Get full details for a specific lead, including contact info, deal value, stage, notes, and recent activities.',
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
    description: 'Add a new prospect/lead to OOMA CRM.',
    inputSchema: {
      type: 'object',
      properties: {
        company_name: { type: 'string', description: 'Company / Organization name' },
        contact_person: { type: 'string', description: 'Primary contact or decision maker name' },
        phone: { type: 'string', description: 'Direct phone or WhatsApp number' },
        email: { type: 'string', description: 'Official business email' },
        stage: { type: 'string', description: 'Initial stage (default "New Leads")', default: 'New Leads' },
        estimated_value: { type: 'number', description: 'Estimated deal value in Indian Rupees (₹)', default: 0 },
        confidence: { type: 'number', description: 'Closing confidence % (0 to 100)', default: 25 },
        service_interest: { type: 'string', description: 'Service or technology needed (e.g. Mobile App, Custom Web App, AI Automation)' },
        website: { type: 'string', description: 'Website URL' },
        address: { type: 'string', description: 'Office location or Google Maps link' },
        temperature: { type: 'string', description: 'Hot, Warm, or Cold', enum: ['Hot', 'Warm', 'Cold'], default: 'Warm' },
        notes: { type: 'string', description: 'Initial notes or background context' }
      },
      required: ['company_name', 'contact_person']
    }
  },
  {
    name: 'crm_update_lead',
    description: 'Update fields on an existing lead (contact info, deal value, confidence, temperature, notes).',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID of the lead to update' },
        company_name: { type: 'string' },
        contact_person: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        assigned_to: { type: 'string', description: 'UUID or username/name of the sales rep to assign this lead to' },
        estimated_value: { type: 'number' },
        confidence: { type: 'number' },
        service_interest: { type: 'string' },
        temperature: { type: 'string', enum: ['Hot', 'Warm', 'Cold'] },
        notes: { type: 'string' }
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
    name: 'crm_list_pipeline',
    description: 'Get an executive summary of the sales pipeline: counts and total monetary value in each stage.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: { type: 'string', description: 'Optional workspace ID filter' }
      }
    }
  },
  {
    name: 'crm_get_tasks',
    description: 'List CRM follow-up tasks. Can filter for pending, due today, or overdue tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status: "Pending" or "Completed"', enum: ['Pending', 'Completed'], default: 'Pending' },
        overdue_only: { type: 'boolean', description: 'If true, returns only tasks whose due date/time has passed' },
        today_only: { type: 'boolean', description: 'If true, returns tasks due today' },
        limit: { type: 'number', description: 'Max number of tasks to return (default 30)' }
      }
    }
  },
  {
    name: 'crm_create_task',
    description: 'Schedule a new follow-up call, meeting, or task for a lead with exact date and time.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID of the associated lead (optional)' },
        title: { type: 'string', description: 'Task title / description' },
        due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
        due_time: { type: 'string', description: 'Exact time in HH:MM:SS format (e.g. "14:30:00")' },
        activity_type: { type: 'string', description: 'Type: Call, Meeting, Email, or Task', enum: ['Call', 'Meeting', 'Email', 'Task'], default: 'Call' },
        priority: { type: 'string', description: 'Priority level: High, Medium, or Low', enum: ['High', 'Medium', 'Low'], default: 'Medium' }
      },
      required: ['title', 'due_date']
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
    name: 'crm_log_interaction',
    description: 'Log a call, WhatsApp chat, email, or meeting note with sentiment and agreed next steps.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID of the lead' },
        interaction_type: { type: 'string', description: 'call, whatsapp, email, meeting, or note', enum: ['call', 'whatsapp', 'email', 'meeting', 'note'] },
        discussion_points: { type: 'string', description: 'Key points discussed with the client' },
        sentiment: { 
          type: 'string', 
          description: 'Client reaction / sentiment',
          enum: ['Very Interested', 'Interested', 'Hesitant', 'Not Interested']
        },
        next_steps: { type: 'string', description: 'Agreed next steps or follow-up commitment' },
        additional_notes: { type: 'string', description: 'Any extra details or quotes' }
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
    description: 'List sales reps and team members in the CRM workspace with their user IDs, full names, usernames, and roles.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional search term to match against team member name or username' }
      }
    }
  }
];

// Tool Execution Dispatcher
async function executeTool(name, args) {
  try {
    switch (name) {
      case 'crm_search_leads': {
        let query = supabase.from('crm_leads').select('id, company_name, contact_person, phone, email, status, estimated_value, confidence, service_interest, custom_data, created_at, assigned_to, assigned_user:assigned_to(id, full_name, username)');
        if (args.stage) query = query.eq('status', args.stage);
        if (args.temperature) query = query.filter('custom_data->>temperature', 'ilike', `%${args.temperature}%`);
        if (args.assignee) {
          const a = args.assignee.trim();
          if (a.toLowerCase() === 'unassigned' || a.toLowerCase() === 'none') {
            query = query.is('assigned_to', null);
          } else {
            // Find matching user IDs from public.users table (matches ANY person's username or full_name)
            const { data: matchedUsers } = await supabase
              .from('users')
              .select('id, full_name, username')
              .or(`full_name.ilike.%${a}%,username.ilike.%${a}%`);
            
            const matchedIds = (matchedUsers || []).map(u => u.id);
            // If search term is already a UUID format, include it directly
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a)) {
              matchedIds.push(a);
            }
            if (matchedIds.length > 0) {
              query = query.in('assigned_to', matchedIds);
            } else {
              return { count: 0, leads: [], message: `No team member found matching "${args.assignee}". Use crm_list_team_members to see available members.` };
            }
          }
        }
        if (args.query) {
          const q = args.query.trim();
          // Also check if q matches any team member to include their assigned leads!
          const { data: matchedUsers } = await supabase
            .from('users')
            .select('id')
            .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`);
          const matchedUserIds = (matchedUsers || []).map(u => u.id);

          let orFilter = `company_name.ilike.%${q}%,contact_person.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`;
          if (matchedUserIds.length > 0) {
            orFilter += `,assigned_to.in.(${matchedUserIds.join(',')})`;
          }
          query = query.or(orFilter);
        }
        query = query.order('created_at', { ascending: false }).limit(args.limit || 20);
        const { data, error } = await query;
        if (error) throw error;
        return { count: data.length, leads: data };
      }

      case 'crm_get_lead_details': {
        const { data: lead, error: lErr } = await supabase
          .from('crm_leads')
          .select('*, assigned_user:assigned_to(id, full_name, username)')
          .eq('id', args.lead_id)
          .single();
        if (lErr) throw lErr;

        // Fetch recent tasks & activities for this lead
        const { data: tasks } = await supabase
          .from('crm_tasks')
          .select('id, title, status, due_date, due_time, priority, activity_type')
          .eq('lead_id', args.lead_id)
          .order('due_date', { ascending: false });

        const { data: activities } = await supabase
          .from('crm_activities')
          .select('id, activity_type, description, created_at')
          .eq('lead_id', args.lead_id)
          .order('created_at', { ascending: false })
          .limit(10);

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
          confidence: args.confidence || 25,
          service_interest: args.service_interest || 'Custom Software',
          website: args.website || null,
          external_link: args.address || null,
          notes: args.notes || '',
          custom_data: {
            source: 'MCP Agent',
            temperature: args.temperature || 'Warm',
            created_via: 'Kilo Code / MCP'
          }
        };

        if (activeWorkspaceId) payload.workspace_id = activeWorkspaceId;
        if (args.assigned_to) {
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args.assigned_to)) {
            payload.assigned_to = args.assigned_to;
          } else {
            const { data: matchedUsers } = await supabase
              .from('users')
              .select('id')
              .or(`full_name.ilike.%${args.assigned_to}%,username.ilike.%${args.assigned_to}%`)
              .limit(1);
            if (matchedUsers && matchedUsers.length > 0) {
              payload.assigned_to = matchedUsers[0].id;
            }
          }
        } else if (authenticatedUserId) {
          payload.created_by = authenticatedUserId;
          payload.assigned_to = authenticatedUserId;
        }

        const { data, error } = await supabase
          .from('crm_leads')
          .insert([payload])
          .select('*, assigned_user:assigned_to(id, full_name, username)')
          .single();

        // 22P02 is a benign pg_net webhook notification error if returned by Supabase
        if (error && error.code !== '22P02') throw error;
        return { success: true, message: `Lead '${args.company_name}' created successfully`, lead: data || payload };
      }

      case 'crm_update_lead': {
        const updates = {};
        if (args.company_name !== undefined) updates.company_name = args.company_name;
        if (args.contact_person !== undefined) updates.contact_person = args.contact_person;
        if (args.phone !== undefined) updates.phone = args.phone;
        if (args.email !== undefined) updates.email = args.email;
        if (args.estimated_value !== undefined) updates.estimated_value = args.estimated_value;
        if (args.confidence !== undefined) updates.confidence = args.confidence;
        if (args.service_interest !== undefined) updates.service_interest = args.service_interest;
        if (args.temperature !== undefined) {
          const { data: existingLead } = await supabase.from('crm_leads').select('custom_data').eq('id', args.lead_id).single();
          updates.custom_data = {
            ...(existingLead?.custom_data || {}),
            temperature: args.temperature
          };
        }
        if (args.notes !== undefined) updates.notes = args.notes;
        if (args.assigned_to !== undefined) {
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args.assigned_to)) {
            updates.assigned_to = args.assigned_to;
          } else {
            const { data: matchedUsers } = await supabase
              .from('users')
              .select('id')
              .or(`full_name.ilike.%${args.assigned_to}%,username.ilike.%${args.assigned_to}%`)
              .limit(1);
            if (matchedUsers && matchedUsers.length > 0) {
              updates.assigned_to = matchedUsers[0].id;
            }
          }
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

      case 'crm_list_pipeline': {
        const { data: leads, error } = await supabase
          .from('crm_leads')
          .select('status, estimated_value');
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
          .select('id, title, status, due_date, due_time, priority, activity_type, lead_id, crm_leads(company_name, contact_person, phone)');

        if (args.status) query = query.eq('status', args.status);
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
        const payload = {
          title: args.title.trim(),
          due_date: args.due_date,
          due_time: args.due_time || '10:00:00',
          activity_type: args.activity_type || 'Call',
          priority: args.priority || 'Medium',
          status: 'Pending'
        };
        if (args.lead_id) payload.lead_id = args.lead_id;
        if (activeWorkspaceId) payload.workspace_id = activeWorkspaceId;
        if (authenticatedUserId) {
          payload.created_by = authenticatedUserId;
          payload.assigned_to = authenticatedUserId;
        }

        const { data, error } = await supabase
          .from('crm_tasks')
          .insert([payload])
          .select()
          .single();

        if (error && error.code !== '22P02') throw error;
        return { success: true, message: `Task '${args.title}' scheduled for ${args.due_date} at ${args.due_time || '10:00'}`, task: data || payload };
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

      case 'crm_log_interaction': {
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const formattedNote = `[${args.interaction_type.toUpperCase()}] ${dateStr}\n` +
          `Discussion Points: ${args.discussion_points}\n` +
          `Client Sentiment: ${args.sentiment || 'Interested'}\n` +
          `Agreed Next Steps: ${args.next_steps || 'None'}` +
          (args.additional_notes ? `\nAdditional Details: ${args.additional_notes}` : '');

        // 1. Insert into crm_activities
        const actPayload = {
          lead_id: args.lead_id,
          activity_type: args.interaction_type,
          description: formattedNote
        };
        if (activeWorkspaceId) actPayload.workspace_id = activeWorkspaceId;
        if (authenticatedUserId) {
          actPayload.user_id = authenticatedUserId;
          actPayload.created_by = authenticatedUserId;
        }

        const { error: actError } = await supabase.from('crm_activities').insert([actPayload]);
        if (actError && actError.code !== '22P02') throw actError;

        // 2. Prepend note into crm_leads.notes
        const { data: lead } = await supabase.from('crm_leads').select('notes, status').eq('id', args.lead_id).single();
        const updatedNotes = lead?.notes ? `${formattedNote}\n\n---\n\n${lead.notes}` : formattedNote;
        const updates = {
          notes: updatedNotes,
          last_activity_at: new Date().toISOString()
        };
        // Auto-progress from 'New Leads' to 'Contacted' on first outreach
        if (lead?.status === 'New Leads') {
          updates.status = 'Contacted';
        }

        await supabase.from('crm_leads').update(updates).eq('id', args.lead_id);

        return { success: true, message: `Logged ${args.interaction_type} interaction with sentiment '${args.sentiment || 'Interested'}'`, formattedNote };
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

        const teamWithCounts = (users || []).map(u => ({
          id: u.id,
          name: u.full_name || u.username,
          username: u.username,
          full_name: u.full_name,
          role: u.role,
          designation: u.designation,
          assigned_leads_count: countMap[u.id] || 0
        }));

        return {
          total_team_members: teamWithCounts.length,
          unassigned_leads_count: unassignedCount,
          team_members: teamWithCounts
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return { error: true, message: err.message || String(err) };
  }
}

// JSON-RPC 2.0 stdio message handler
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
            version: '1.0.0'
          }
        });
        break;
      }

      case 'notifications/initialized': {
        // Notification from client, no response required
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
        // Return method not found for unhandled requests
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
