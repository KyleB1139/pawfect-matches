-- Create profile_boosts table
CREATE TABLE public.profile_boosts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_boosts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own boosts"
ON public.profile_boosts FOR SELECT
USING (user_id = get_user_profile_id(auth.uid()));

CREATE POLICY "Users can create their own boosts"
ON public.profile_boosts FOR INSERT
WITH CHECK (user_id = get_user_profile_id(auth.uid()));

-- Function to check if a profile is currently boosted
CREATE OR REPLACE FUNCTION public.is_profile_boosted(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profile_boosts
    WHERE user_id = _profile_id
      AND starts_at <= now()
      AND ends_at > now()
  );
$$;

-- Regular index for efficient boost queries
CREATE INDEX idx_profile_boosts_lookup ON public.profile_boosts (user_id, starts_at, ends_at);