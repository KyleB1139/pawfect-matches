-- Drop the security definer view
DROP VIEW IF EXISTS public.matches;

-- Create a security definer function to get matches instead
CREATE OR REPLACE FUNCTION public.get_user_matches(_user_id uuid)
RETURNS TABLE (
  matched_user_id uuid,
  matched_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    l1.liked_profile_id as matched_user_id,
    GREATEST(l1.created_at, l2.created_at) as matched_at
  FROM public.likes l1
  INNER JOIN public.likes l2 
    ON l1.user_id = l2.liked_profile_id 
    AND l1.liked_profile_id = l2.user_id
  WHERE l1.user_id = _user_id;
$$;