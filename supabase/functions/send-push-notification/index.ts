import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    const expectedToken = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    if (!authHeader || authHeader !== expectedToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { notification_id } = await req.json()
    if (!notification_id) {
      return new Response(JSON.stringify({ error: 'Missing notification_id' }), { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Read VAPID config from app_config table (no environment variables needed)
    const { data: configRows, error: configErr } = await supabase
      .from('app_config')
      .select('key, value')

    if (configErr || !configRows) {
      return new Response(JSON.stringify({ error: 'Failed to read app_config' }), { status: 500 })
    }

    const cfg: Record<string, string> = {}
    for (const row of configRows) {
      cfg[row.key] = row.value
    }

    const vapidPublicKey = cfg['vapid_public_key']
    const vapidPrivateKey = cfg['vapid_private_key']
    const vapidEmail = cfg['vapid_email'] ?? 'admin@example.com'

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured in app_config table' }), { status: 500 })
    }

    webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublicKey, vapidPrivateKey)

    const { data: notification, error: notifErr } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notification_id)
      .single()

    if (notifErr || !notification) {
      return new Response(JSON.stringify({ error: 'Notification not found' }), { status: 404 })
    }

    const { data: subscriptions, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', notification.user_id)

    if (subErr || !subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'No subscriptions' }), { status: 200 })
    }

    const payload = JSON.stringify({
      title: notification.title,
      message: notification.message,
      type: notification.type,
    })

    let sent = 0
    const errors: string[] = []

    for (const sub of subscriptions as PushSubscription[]) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }, payload, { TTL: 86400 })

        sent++
      } catch (err) {
        if (err && typeof err === 'object' && 'statusCode' in err) {
          const wpErr = err as { statusCode: number }
          if (wpErr.statusCode === 410 || wpErr.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
            continue
          }
        }
        errors.push(err instanceof Error ? err.message : String(err))
      }
    }

    return new Response(JSON.stringify({ sent, errors }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500 })
  }
})
