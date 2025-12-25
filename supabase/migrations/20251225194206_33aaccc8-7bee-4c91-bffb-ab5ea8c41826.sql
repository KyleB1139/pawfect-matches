-- Fix profile_photos to require authentication for viewing
DROP POLICY IF EXISTS "Users can view all profile photos" ON public.profile_photos;
CREATE POLICY "Authenticated users can view profile photos" 
  ON public.profile_photos 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Update storage policies for profile-photos bucket to require authentication
DROP POLICY IF EXISTS "Profile photos are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated users can view profile photos" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'profile-photos' AND auth.uid() IS NOT NULL);

-- Update avatars storage policy to require authentication
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated users can view avatars" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- Update dog-photos storage policy to require authentication
DROP POLICY IF EXISTS "Dog photos are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated users can view dog photos" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'dog-photos' AND auth.uid() IS NOT NULL);