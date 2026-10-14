#!/usr/bin/env node
/**
 * OOMA CRM — Real-Time Agent Alert Watcher (Option 2)
 * 
 * Subscribes to Supabase Realtime WebSocket for incoming chat messages.
 * When a sales rep sends a message or mentions @atlas:
 *  1. Pops up a Windows Desktop notification & plays an audio chime.
 *  2. Logs the alert cleanly to the console.
 *  3. Persists pending messages to .alerts/unread_messages.json in both
 *     omma-labs and D:\Oomalabs Agents\Agents\Agent-1.
 * 
 * Completely FREE-TIER safe:
 * - Uses exactly 1 WebSocket connection (out of 200).
 * - Zero polling queries, zero database compute load.
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic resolver for @supabase/supabase-js so it works both in omma-labs and D:\Oomalabs Agents\Agents\Agent-1
let createClient;
try {
  const mod = await import('@supabase/supabase-js');
  createClient = mod.createClient;
} catch {
  const fallbackUrls = [
    'file:///c:/Users/AJAYKUMAR/.gemini/antigravity-ide/scratch/omma-labs/node_modules/@supabase/supabase-js/dist/index.mjs'
  ];
  for (const u of fallbackUrls) {
    try {
      const mod = await import(u);
      if (mod?.createClient) {
        createClient = mod.createClient;
        break;
      }
    } catch {}
  }
}

// Helper to load .env
function loadEnv() {
  const envPaths = [
    path.resolve(__dirname, '../.env'),
    'c:/Users/AJAYKUMAR/.gemini/antigravity-ide/scratch/omma-labs/.env'
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const k = trimmed.slice(0, idx).trim();
          const v = trimmed.slice(idx + 1).trim();
          if (!process.env[k]) process.env[k] = v;
        }
      }
      break;
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://uswknwkxdzkrkaimwqvf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzd2tud2t4ZHprcmthaW13cXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjcyMTUsImV4cCI6MjA4ODY0MzIxNX0.4wj3FC4lgQ_0er8z8xSsIuVXO9VPoexyFQoCSYl67dE';
const USER_EMAIL = process.env.CRM_USER_EMAIL || 'atlas@oomalabs.com';
const USER_PASSWORD = process.env.CRM_USER_PASSWORD || '123456789';
const WORKSPACE_ID = process.env.CRM_WORKSPACE_ID || 'aefde15d-1658-4652-8ce5-1b294af6f55f';

// Paths to alert files
const ALERT_PATHS = [
  path.resolve(__dirname, '../.alerts/unread_messages.json'),
  'D:\\Oomalabs Agents\\Agents\\Agent-1\\.alerts\\unread_messages.json'
];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

let atlasUserId = null;
const userCache = new Map();

/**
 * Trigger Windows Toast Notification & Beep
 */
function notifyWindows(title, body) {
  const safeTitle = (title || 'OOMA CRM').replace(/["'`$]/g, '');
  const safeBody = (body || '').replace(/["'`$]/g, '');

  const psScript = `
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
    $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
    $textNodes = $template.GetElementsByTagName("text")
    $textNodes.Item(0).AppendChild($template.CreateTextNode("${safeTitle}")) > $null
    $textNodes.Item(1).AppendChild($template.CreateTextNode("${safeBody}")) > $null
    $toast = [Windows.UI.Notifications.ToastNotification]::new($template)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("OOMA CRM Atlas").Show($toast)
    [System.Console]::Beep(1000, 250)
  `;

  exec(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`, (err) => {
    if (err) {
      // Audio beep fallback
      exec(`powershell -NoProfile -Command "[System.Console]::Beep(1000, 250)"`);
    }
  });
}

/**
 * Persist unread alerts to JSON files
 */
function recordAlert(alertItem) {
  for (const filePath of ALERT_PATHS) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      let current = [];
      if (fs.existsSync(filePath)) {
        try {
          current = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
          if (!Array.isArray(current)) current = [];
        } catch {
          current = [];
        }
      }

      // Add to front, keep last 50
      current.unshift(alertItem);
      if (current.length > 50) current = current.slice(0, 50);

      fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf8');
    } catch (e) {
      // Ignore if D: drive is temporarily unavailable
    }
  }
}

/**
 * Resolve sender name
 */
async function resolveSender(userId) {
  if (!userId) return 'Unknown Teammate';
  if (userCache.has(userId)) return userCache.get(userId);

  try {
    const { data } = await supabase
      .from('users')
      .select('full_name, username')
      .eq('id', userId)
      .single();

    const name = data?.full_name || data?.username || 'Teammate';
    userCache.set(userId, name);
    return name;
  } catch {
    return 'Teammate';
  }
}

async function startWatcher() {
  console.log('\n=============================================================');
  console.log('🤖 OOMA CRM — Real-Time Agent Alert Watcher (Option 2)');
  console.log('=============================================================');
  console.log(`📡 Connecting to Supabase: ${SUPABASE_URL}`);
  console.log(`🏢 Workspace: ${WORKSPACE_ID}`);

  // Authenticate as Atlas
  try {
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: USER_EMAIL,
      password: USER_PASSWORD
    });

    if (authErr) {
      console.warn('⚠️ Auth Warning:', authErr.message);
    } else if (authData?.user) {
      atlasUserId = authData.user.id;
      console.log(`🔑 Authenticated as Atlas (ID: ${atlasUserId})`);
    }
  } catch (err) {
    console.warn('⚠️ Auth Warning:', err.message);
  }

  // Preload team member names
  try {
    const { data: team } = await supabase.from('users').select('id, full_name, username');
    (team || []).forEach(u => userCache.set(u.id, u.full_name || u.username));
    console.log(`👥 Pre-cached ${userCache.size} team members.`);
  } catch {}

  // Initialize empty alert files if not existing
  for (const p of ALERT_PATHS) {
    try {
      const d = path.dirname(p);
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      if (!fs.existsSync(p)) fs.writeFileSync(p, '[]', 'utf8');
    } catch {}
  }

  console.log('\n🎧 Listening for sales rep messages in real-time...');
  console.log('🔔 Alerts enabled: Windows Toast + Sound Chime + .alerts/unread_messages.json');
  console.log('⚡ Press Ctrl+C to stop.\n');

  // Supabase Realtime channel
  const channel = supabase.channel(`crm-alert-watcher-${Date.now()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
      const msg = payload.new;
      if (!msg) return;

      // Filter out messages from Atlas itself to avoid self-alerts
      if (atlasUserId && msg.user_id === atlasUserId) return;

      const senderName = await resolveSender(msg.user_id);
      const isMention = /@(atlas|agent|boss|ai)/i.test(msg.message || '');
      const isQuestion = (msg.message || '').includes('?');

      const timestamp = new Date().toLocaleTimeString();
      const preview = (msg.message || '').length > 70 
        ? (msg.message || '').slice(0, 67) + '...' 
        : (msg.message || '');

      console.log(`-------------------------------------------------------------`);
      console.log(`[${timestamp}] 💬 NEW MESSAGE from ${senderName}${isMention ? ' (@ATLAS MENTION)' : ''}:`);
      console.log(`"${msg.message}"`);

      // 1. Windows Notification
      const title = isMention 
        ? `🔔 @Atlas Mention from ${senderName}` 
        : `💬 CRM Chat: ${senderName}`;
      notifyWindows(title, preview || 'New message in team chat');

      // 2. Persist to Alert File for Agent
      const alertItem = {
        id: msg.id,
        sender_id: msg.user_id,
        sender_name: senderName,
        message: msg.message,
        is_mention: isMention,
        is_question: isQuestion,
        parent_id: msg.parent_id || null,
        created_at: msg.created_at || new Date().toISOString(),
        received_at: new Date().toISOString()
      };
      recordAlert(alertItem);
      console.log(`📝 Logged to .alerts/unread_messages.json (Ready for Agent-1)`);
    })
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime WebSocket connection active (1 connection used).');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Channel error:', err);
      } else if (status === 'CLOSED') {
        console.log('ℹ️ Channel closed.');
      }
    });

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('\n🛑 Stopping alert watcher...');
    await supabase.removeChannel(channel);
    process.exit(0);
  });
}

startWatcher().catch(console.error);
