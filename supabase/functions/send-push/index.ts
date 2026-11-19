// supabase/functions/send-push/index.ts
// Setup instructions:
// 1. Install web-push: `npm install web-push` (if testing locally, though Deno can import from esm.sh)
// 2. Generate VAPID keys: `npx web-push generate-vapid-keys`
// 3. Set secrets in Supabase:
//    supabase secrets set VAPID_PUBLIC_KEY="your_public_key"
//    supabase secrets set VAPID_PRIVATE_KEY="your_private_key"

// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.4'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@oomalabs.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

serve(async (req: any) => {
  try {
    // 1. SECURITY FIX: Validate Webhook Secret to prevent unauthorized triggers
    const secret = req.headers.get('webhook-secret');
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET');
    if (!expectedSecret || secret !== expectedSecret) {
      return new Response("Unauthorized request", { status: 401 });
    }

    const payload = await req.json()
    
    // The payload comes from a Database Webhook
    // e.g., on insert to `chat_messages` or `notifications` table
    const record = payload.record

    if (!record) {
      return new Response("No record found", { status: 400 })
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    let targetUserIds: string[] = [];
    let pushPayloadStr = "";

    // Determine if this is a chat message or a CRM notification
    if (record.category) {
      // It's a Notification (CRM Activity)
      if (!record.user_id) return new Response("No target user", { status: 200 });
      targetUserIds = [record.user_id];
      pushPayloadStr = JSON.stringify({
        title: record.title || 'New Notification',
        body: record.body || 'You have a new update in Ooma Workspace.',
        url: record.target_url || '/crm'
      });
    } else if (record.message) {
      // It's a Chat Message
      const senderId = record.user_id;
      
      // Fetch sender name
      let senderName = 'Teammate';
      const { data: senderData } = await supabase
        .from('users')
        .select('full_name, username')
        .eq('id', senderId)
        .single();
        
      if (senderData) {
        senderName = senderData.full_name || senderData.username || 'Teammate';
      }
      
      // 2. PRIVACY FIX: Restrict notification blast to users ONLY in this specific workspace!
      const { data: workspaceUsers } = await supabase
        .from('users')
        .select('id')
        .eq('workspace_id', record.workspace_id);
        
      if (!workspaceUsers || workspaceUsers.length === 0) {
        return new Response("No workspace users found", { status: 200 });
      }
      
      const workspaceUserIds = workspaceUsers.map((u: any) => u.id);

      // Get ALL users who have push subscriptions EXCEPT the sender, strictly within this workspace
      const { data: allSubs } = await supabase
        .from('user_push_subscriptions')
        .select('user_id')
        .in('user_id', workspaceUserIds)
        .neq('user_id', senderId);
        
      if (allSubs) {
        // Extract unique user IDs
        targetUserIds = Array.from(new Set<string>(allSubs.map((s: any) => s.user_id as string)));
      }
      
      pushPayloadStr = JSON.stringify({
        title: `💬 New Message from ${senderName}`,
        body: record.message,
        url: '/?open_chat=true'
      });
    } else {
      return new Response("Unknown record format", { status: 200 });
    }

    if (targetUserIds.length === 0) {
      return new Response("No target users found", { status: 200 })
    }

    // Fetch subscriptions for all target users
    const { data: subscriptions, error } = await supabase
      .from('user_push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds)

    if (error || !subscriptions || subscriptions.length === 0) {
      return new Response("No subscriptions found", { status: 200 })
    }

    // Send push to all registered devices for this user
    const sendPromises = subscriptions.map(async (sub: any) => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh_key, auth: sub.auth_key }
        }, pushPayloadStr);
      } catch (err: any) {
        console.error(`Error sending push to endpoint ${sub.endpoint}:`, err);
        // If the subscription is expired or invalid (status 410 or 404), delete it from the database
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('user_push_subscriptions').delete().eq('id', sub.id);
        }
      }
    });

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, message: "Push sent!" }), { headers: { "Content-Type": "application/json" } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
