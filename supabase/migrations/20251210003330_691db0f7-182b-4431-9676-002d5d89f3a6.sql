-- Add gender and interested_in columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN gender text,
ADD COLUMN interested_in text[] DEFAULT '{}'::text[];

-- Add a check constraint for valid gender values
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_gender_check 
CHECK (gender IS NULL OR gender IN ('man', 'woman', 'other'));