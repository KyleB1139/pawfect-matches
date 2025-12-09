-- Create backup_codes table for 2FA recovery
CREATE TABLE public.backup_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backup_codes ENABLE ROW LEVEL SECURITY;

-- Users can only view their own backup codes
CREATE POLICY "Users can view their own backup codes"
ON public.backup_codes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can delete their own backup codes (for regeneration)
CREATE POLICY "Users can delete their own backup codes"
ON public.backup_codes
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_backup_codes_user_id ON public.backup_codes(user_id);