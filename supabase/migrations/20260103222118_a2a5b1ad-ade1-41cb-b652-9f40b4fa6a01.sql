-- Add relationship goals and lifestyle preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS looking_for text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS lifestyle text[] DEFAULT '{}';

-- Add comments for clarity
COMMENT ON COLUMN public.profiles.looking_for IS 'Relationship goals: long-term, casual, friendship, etc.';
COMMENT ON COLUMN public.profiles.lifestyle IS 'Lifestyle preferences: active, homebody, social, etc.';