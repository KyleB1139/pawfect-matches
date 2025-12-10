-- Add age range preference columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN min_age_preference integer,
ADD COLUMN max_age_preference integer;