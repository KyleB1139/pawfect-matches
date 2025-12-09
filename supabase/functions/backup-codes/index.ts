import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a random 8-character alphanumeric code
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding confusing chars like 0, O, 1, I
  let code = "";
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  for (let i = 0; i < 8; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

// Simple hash function using Web Crypto API
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to get their ID
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, code } = await req.json();
    console.log(`Processing backup codes action: ${action} for user: ${user.id}`);

    // Admin client for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "generate") {
      // Delete existing backup codes for this user
      await adminClient
        .from("backup_codes")
        .delete()
        .eq("user_id", user.id);

      // Generate 10 new backup codes
      const codes: string[] = [];
      const codeInserts: { user_id: string; code_hash: string }[] = [];

      for (let i = 0; i < 10; i++) {
        const plainCode = generateCode();
        codes.push(plainCode);
        const hashedCode = await hashCode(plainCode);
        codeInserts.push({
          user_id: user.id,
          code_hash: hashedCode,
        });
      }

      // Insert hashed codes
      const { error: insertError } = await adminClient
        .from("backup_codes")
        .insert(codeInserts);

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to generate backup codes" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Generated ${codes.length} backup codes for user ${user.id}`);

      return new Response(
        JSON.stringify({ codes }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      if (!code) {
        return new Response(
          JSON.stringify({ error: "Code is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const hashedCode = await hashCode(code.toUpperCase().replace(/\s/g, ""));

      // Find unused backup code
      const { data: backupCode, error: findError } = await adminClient
        .from("backup_codes")
        .select("id")
        .eq("user_id", user.id)
        .eq("code_hash", hashedCode)
        .is("used_at", null)
        .single();

      if (findError || !backupCode) {
        console.log("Invalid backup code attempt for user:", user.id);
        return new Response(
          JSON.stringify({ valid: false, error: "Invalid or already used backup code" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark code as used
      await adminClient
        .from("backup_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", backupCode.id);

      // Unenroll all MFA factors for the user
      const { data: factorsData } = await adminClient.auth.admin.mfa.listFactors({
        userId: user.id,
      });

      if (factorsData?.factors) {
        for (const factor of factorsData.factors) {
          if (factor.factor_type === "totp") {
            await adminClient.auth.admin.mfa.deleteFactor({
              userId: user.id,
              id: factor.id,
            });
          }
        }
      }

      console.log(`Backup code used to disable 2FA for user ${user.id}`);

      return new Response(
        JSON.stringify({ valid: true, message: "2FA has been disabled using backup code" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "status") {
      // Get count of unused backup codes
      const { count, error: countError } = await adminClient
        .from("backup_codes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("used_at", null);

      if (countError) {
        console.error("Count error:", countError);
        return new Response(
          JSON.stringify({ error: "Failed to get backup codes status" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ remainingCodes: count || 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Backup codes error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
