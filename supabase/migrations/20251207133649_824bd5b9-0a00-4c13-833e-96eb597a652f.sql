-- Create a table for storing likes/swipes
CREATE TABLE public.likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  liked_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, liked_profile_id)
);

-- Enable Row Level Security
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Users can view their own likes
CREATE POLICY "Users can view their own likes"
ON public.likes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own likes
CREATE POLICY "Users can create their own likes"
ON public.likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes
CREATE POLICY "Users can delete their own likes"
ON public.likes
FOR DELETE
USING (auth.uid() = user_id);

-- Create a view for mutual matches (both users liked each other)
CREATE OR REPLACE VIEW public.matches AS
SELECT 
  l1.user_id as user_id,
  l1.liked_profile_id as matched_user_id,
  GREATEST(l1.created_at, l2.created_at) as matched_at
FROM public.likes l1
INNER JOIN public.likes l2 
  ON l1.user_id = l2.liked_profile_id 
  AND l1.liked_profile_id = l2.user_id
WHERE l1.user_id < l1.liked_profile_id OR l1.user_id > l1.liked_profile_id;