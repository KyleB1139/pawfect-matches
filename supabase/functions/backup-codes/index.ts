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

// Generate a random salt
function generateSalt(): Uint8Array {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return salt;
}

// Convert Uint8Array to base64 string
function uint8ArrayToBase64(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr));
}

// Convert base64 string to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

// Hash code with PBKDF2 and salt for secure storage
async function hashCodeWithSalt(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = generateSalt();
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(code),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  
  const hashArray = new Uint8Array(derivedBits);
  const saltBase64 = uint8ArrayToBase64(salt);
  const hashBase64 = uint8ArrayToBase64(hashArray);
  
  // Return salt:hash format
  return `${saltBase64}:${hashBase64}`;
}

// Verify a code against stored salted hash
async function verifyCode(code: string, storedHash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [saltBase64, hashBase64] = storedHash.split(":");
  
  if (!saltBase64 || !hashBase64) {
    return false;
  }
  
  const salt = base64ToUint8Array(saltBase64);
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(code),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  
  const computedHash = uint8ArrayToBase64(new Uint8Array(derivedBits));
  return computedHash === hashBase64;
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
        const hashedCode = await hashCodeWithSalt(plainCode);
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

      const normalizedCode = code.toUpperCase().replace(/\s/g, "");

      // Get all unused backup codes for this user
      const { data: backupCodes, error: findError } = await adminClient
        .from("backup_codes")
        .select("id, code_hash")
        .eq("user_id", user.id)
        .is("used_at", null);

      if (findError || !backupCodes || backupCodes.length === 0) {
        console.log("No backup codes found for user:", user.id);
        return new Response(
          JSON.stringify({ valid: false, error: "Invalid or already used backup code" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check each backup code
      let matchedCodeId: string | null = null;
      for (const bc of backupCodes) {
        const isValid = await verifyCode(normalizedCode, bc.code_hash);
        if (isValid) {
          matchedCodeId = bc.id;
          break;
        }
      }

      if (!matchedCodeId) {
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
        .eq("id", matchedCodeId);

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

    if (action === "recover") {
      // Recovery action - used during login when 2FA blocks access
      if (!code) {
        return new Response(
          JSON.stringify({ error: "Code is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const normalizedCode = code.toUpperCase().replace(/\s/g, "");

      // Get all unused backup codes for this user
      const { data: backupCodes, error: findError } = await adminClient
        .from("backup_codes")
        .select("id, code_hash")
        .eq("user_id", user.id)
        .is("used_at", null);

      if (findError || !backupCodes || backupCodes.length === 0) {
        console.log("No backup codes found for recovery for user:", user.id);
        return new Response(
          JSON.stringify({ valid: false, error: "Invalid or already used backup code" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check each backup code
      let matchedCodeId: string | null = null;
      for (const bc of backupCodes) {
        const isValid = await verifyCode(normalizedCode, bc.code_hash);
        if (isValid) {
          matchedCodeId = bc.id;
          break;
        }
      }

      if (!matchedCodeId) {
        console.log("Invalid backup code recovery attempt for user:", user.id);
        return new Response(
          JSON.stringify({ valid: false, error: "Invalid or already used backup code" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark code as used
      await adminClient
        .from("backup_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", matchedCodeId);

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

      console.log(`Backup code used to recover account and disable 2FA for user ${user.id}`);

      return new Response(
        JSON.stringify({ valid: true, message: "2FA has been disabled. You can now sign in normally." }),
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