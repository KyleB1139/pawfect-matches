-- Create function to get IDs of users who blocked the current user
CREATE OR REPLACE FUNCTION public.get_blocked_by_ids(_user_id uuid)
RETURNS TABLE(blocker_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT user_id as blocker_id
  FROM public.blocks
  WHERE blocked_profile_id = _user_id;
$$;