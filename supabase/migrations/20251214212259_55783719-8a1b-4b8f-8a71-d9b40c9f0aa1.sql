-- Add birthdate field for age verification
ALTER TABLE public.profiles 
ADD COLUMN birthdate date DEFAULT NULL,
ADD COLUMN age_verified_at timestamp with time zone DEFAULT NULL;