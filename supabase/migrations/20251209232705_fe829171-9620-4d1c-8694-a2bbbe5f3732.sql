-- Create super_likes table to track super likes with daily limits
CREATE TABLE public.super_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  liked_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, liked_profile_id)
);

-- Enable RLS
ALTER TABLE public.super_likes ENABLE ROW LEVEL SECURITY;

-- Users can view their own super likes
CREATE POLICY "Users can view their own super likes"
ON public.super_likes
FOR SELECT
USING (user_id = get_user_profile_id(auth.uid()));

-- Users can create super likes
CREATE POLICY "Users can create super likes"
ON public.super_likes
FOR INSERT
WITH CHECK (user_id = get_user_profile_id(auth.uid()));

-- Users can see super likes they received
CREATE POLICY "Users can see super likes received"
ON public.super_likes
FOR SELECT
USING (liked_profile_id = get_user_profile_id(auth.uid()));

-- Create function to count today's super likes for a user
CREATE OR REPLACE FUNCTION public.get_daily_super_like_count(_user_profile_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.super_likes
  WHERE user_id = _user_profile_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';
$$;