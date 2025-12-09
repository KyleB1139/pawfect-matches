-- Create table to track when users last viewed their matches
CREATE TABLE public.match_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  last_viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.match_views ENABLE ROW LEVEL SECURITY;

-- Users can view their own match view record
CREATE POLICY "Users can view their own match views"
ON public.match_views
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own match view record
CREATE POLICY "Users can insert their own match views"
ON public.match_views
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own match view record
CREATE POLICY "Users can update their own match views"
ON public.match_views
FOR UPDATE
USING (auth.uid() = user_id);