-- Create a table to track when users last viewed the Liked You page
CREATE TABLE public.like_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  last_viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.like_views ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own like views"
ON public.like_views
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own like views"
ON public.like_views
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own like views"
ON public.like_views
FOR UPDATE
USING (auth.uid() = user_id);