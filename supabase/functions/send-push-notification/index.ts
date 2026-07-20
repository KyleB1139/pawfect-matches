import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotificationType = "match" | "super_like" | "message";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:jlw74130@gmail.com";

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys not configured");
    }
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: { user }, error: userError } = await admin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, targetProfileId } = (await req.json()) as {
      type: NotificationType;
      targetProfileId: string;
    };

    if (!["match", "super_like", "message"].includes(type) || !targetProfileId) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Caller's profile
    const { data: caller } = await admin
      .from("profiles")
      .select("id, name, dog_name")
      .eq("user_id", user.id)
      .single();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Caller profile not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Target's profile
    const { data: target } = await admin
      .from("profiles")
      .select("id, user_id")
      .eq("id", targetProfileId)
      .single();
    if (!target) {
      return new Response(JSON.stringify({ error: "Target not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the claimed relationship actually exists in the database.
    let authorized = false;
    if (type === "match") {
      const { data } = await admin.rpc("are_profiles_matched", {
        _p1: caller.id,
        _p2: target.id,
      });
      authorized = data === true;
    } else if (type === "super_like") {
      const { data } = await admin
        .from("super_likes")
        .select("id")
        .eq("user_id", caller.id)
        .eq("liked_profile_id", target.id)
        .maybeSingle();
      authorized = !!data;
    } else if (type === "message") {
      const { data } = await admin
        .from("conversations")
        .select("id")
        .or(
          `and(participant_1_id.eq.${caller.id},participant_2_id.eq.${target.id}),and(participant_1_id.eq.${target.id},participant_2_id.eq.${caller.id})`
        )
        .maybeSingle();
      authorized = !!data;
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-built content only — clients cannot inject notification text.
    const callerName = caller.dog_name || caller.name || "Someone";
    const content: Record<NotificationType, { title: string; body: string; url: string }> = {
      match: {
        title: "It's a match! 🎉",
        body: `You and ${callerName} liked each other!`,
        url: "/matches",
      },
      super_like: {
        title: "⭐ You got a Super Like!",
        body: `${callerName} super liked you! Check them out!`,
        url: "/discover",
      },
      message: {
        title: `New message from ${callerName}`,
        body: "You have a new message",
        url: "/messages",
      },
    };
    const { title, body, url } = content[type];

    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", target.user_id);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: "/favicon.ico",
      data: { url },
    });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 86400 }
        );
        sent++;
      } catch (pushError: unknown) {
        const statusCode = (pushError as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Push failed:", statusCode, pushError);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("send-push-notification error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
