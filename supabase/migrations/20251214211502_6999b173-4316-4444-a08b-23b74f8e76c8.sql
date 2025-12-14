-- Add terms acceptance tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN terms_accepted_at timestamp with time zone DEFAULT NULL;

-- Add index for quick lookups
CREATE INDEX idx_profiles_terms_accepted ON public.profiles(terms_accepted_at) WHERE terms_accepted_at IS NULL;