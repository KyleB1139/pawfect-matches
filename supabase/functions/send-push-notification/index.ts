import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify their identity
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { title, body, icon, url, userId }: PushPayload = await req.json();
    console.log(`User ${user.id} sending push notification to user: ${userId}`);

    // Create admin client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the caller's profile ID
    const { data: callerProfile, error: callerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (callerError || !callerProfile) {
      console.error('Error fetching caller profile:', callerError);
      return new Response(
        JSON.stringify({ error: 'Caller profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the target user's profile to find their user_id
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('id, user_id')
      .eq('id', userId)
      .single();

    if (targetError || !targetProfile) {
      console.error('Error fetching target profile:', targetError);
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorization check: Verify the caller has a valid relationship with the target
    // They must either:
    // 1. Have a mutual match (both liked each other)
    // 2. Have liked/super-liked the target (for match notifications)
    // 3. Have an active conversation

    const { data: hasMatch } = await supabase
      .rpc('get_user_matches', { _user_id: callerProfile.id });

    const isMatched = hasMatch?.some((match: { matched_user_id: string }) => 
      match.matched_user_id === userId
    );

    const { data: hasLiked } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', callerProfile.id)
      .eq('liked_profile_id', userId)
      .maybeSingle();

    const { data: hasSuperLiked } = await supabase
      .from('super_likes')
      .select('id')
      .eq('user_id', callerProfile.id)
      .eq('liked_profile_id', userId)
      .maybeSingle();

    const { data: hasConversation } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant_1_id.eq.${callerProfile.id},participant_2_id.eq.${userId}),and(participant_1_id.eq.${userId},participant_2_id.eq.${callerProfile.id})`)
      .maybeSingle();

    const hasValidRelationship = isMatched || hasLiked || hasSuperLiked || hasConversation;

    if (!hasValidRelationship) {
      console.log(`User ${user.id} not authorized to send notifications to ${userId}`);
      return new Response(
        JSON.stringify({ error: 'Not authorized to send notification to this user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user's push subscriptions using their user_id (auth id)
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', targetProfile.user_id);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found for user');
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: icon || '/favicon.ico',
      data: { url: url || '/' },
    });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        // Simple POST to push endpoint - browsers handle the encryption
        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400',
          },
          body: notificationPayload,
        });

        if (response.ok || response.status === 201) {
          sent++;
          console.log('Push notification sent successfully');
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired or invalid, remove it
          console.log('Removing expired subscription');
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        } else {
          console.error('Push failed:', response.status, await response.text());
        }
      } catch (pushError) {
        console.error('Error sending to subscription:', pushError);
      }
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in send-push-notification:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});