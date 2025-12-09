-- Create blocks table
CREATE TABLE public.blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  blocked_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, blocked_profile_id)
);

-- Enable RLS
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- RLS policies for blocks
CREATE POLICY "Users can view their own blocks"
ON public.blocks FOR SELECT
USING (user_id = get_user_profile_id(auth.uid()));

CREATE POLICY "Users can create blocks"
ON public.blocks FOR INSERT
WITH CHECK (user_id = get_user_profile_id(auth.uid()));

CREATE POLICY "Users can delete their own blocks"
ON public.blocks FOR DELETE
USING (user_id = get_user_profile_id(auth.uid()));

-- Create unmatches table to track removed matches
CREATE TABLE public.unmatches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  unmatched_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, unmatched_profile_id)
);

-- Enable RLS
ALTER TABLE public.unmatches ENABLE ROW LEVEL SECURITY;

-- RLS policies for unmatches
CREATE POLICY "Users can view their own unmatches"
ON public.unmatches FOR SELECT
USING (user_id = get_user_profile_id(auth.uid()));

CREATE POLICY "Users can create unmatches"
ON public.unmatches FOR INSERT
WITH CHECK (user_id = get_user_profile_id(auth.uid()));

-- Update get_user_matches function to exclude blocked and unmatched users
CREATE OR REPLACE FUNCTION public.get_user_matches(_user_id uuid)
RETURNS TABLE(matched_user_id uuid, matched_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    l1.liked_profile_id as matched_user_id,
    GREATEST(l1.created_at, l2.created_at) as matched_at
  FROM public.likes l1
  INNER JOIN public.likes l2 
    ON l1.user_id = l2.liked_profile_id 
    AND l1.liked_profile_id = l2.user_id
  WHERE l1.user_id = _user_id
    -- Exclude users that current user has unmatched
    AND NOT EXISTS (
      SELECT 1 FROM public.unmatches u 
      WHERE u.user_id = _user_id AND u.unmatched_profile_id = l1.liked_profile_id
    )
    -- Exclude users that have unmatched current user
    AND NOT EXISTS (
      SELECT 1 FROM public.unmatches u 
      WHERE u.user_id = l1.liked_profile_id AND u.unmatched_profile_id = _user_id
    )
    -- Exclude users that current user has blocked
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b 
      WHERE b.user_id = _user_id AND b.blocked_profile_id = l1.liked_profile_id
    )
    -- Exclude users that have blocked current user
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b 
      WHERE b.user_id = l1.liked_profile_id AND b.blocked_profile_id = _user_id
    );
$$;

-- Create function to check if user is blocked (for use in other queries)
CREATE OR REPLACE FUNCTION public.is_blocked(_user_id uuid, _other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks 
    WHERE (user_id = _user_id AND blocked_profile_id = _other_user_id)
       OR (user_id = _other_user_id AND blocked_profile_id = _user_id)
  );
$$;