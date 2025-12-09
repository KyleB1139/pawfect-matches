-- Drop existing policies on likes table
DROP POLICY IF EXISTS "Users can create their own likes" ON public.likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;
DROP POLICY IF EXISTS "Users can view their own likes" ON public.likes;

-- Create corrected policies that use profile id lookup
CREATE POLICY "Users can create their own likes" 
ON public.likes 
FOR INSERT 
WITH CHECK (user_id = get_user_profile_id(auth.uid()));

CREATE POLICY "Users can delete their own likes" 
ON public.likes 
FOR DELETE 
USING (user_id = get_user_profile_id(auth.uid()));

CREATE POLICY "Users can view their own likes" 
ON public.likes 
FOR SELECT 
USING (user_id = get_user_profile_id(auth.uid()));

-- Also allow users to see if they've been liked (for match detection)
CREATE POLICY "Users can see likes on their profile" 
ON public.likes 
FOR SELECT 
USING (liked_profile_id = get_user_profile_id(auth.uid()));