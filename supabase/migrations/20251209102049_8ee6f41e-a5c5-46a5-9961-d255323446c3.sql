-- Add last_seen column to profiles table
ALTER TABLE public.profiles ADD COLUMN last_seen timestamp with time zone DEFAULT now();

-- Create index for faster queries
CREATE INDEX idx_profiles_last_seen ON public.profiles(last_seen);