-- Create passes table to track left swipes
CREATE TABLE public.passes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  passed_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, passed_profile_id)
);

-- Enable RLS
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;

-- RLS policies for passes
CREATE POLICY "Users can view their own passes"
ON public.passes FOR SELECT
USING (user_id = get_user_profile_id(auth.uid()));

CREATE POLICY "Users can create passes"
ON public.passes FOR INSERT
WITH CHECK (user_id = get_user_profile_id(auth.uid()));

CREATE POLICY "Users can delete their own passes"
ON public.passes FOR DELETE
USING (user_id = get_user_profile_id(auth.uid()));