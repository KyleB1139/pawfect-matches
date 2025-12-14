-- Create profile_photos table for multiple photos per user
CREATE TABLE public.profile_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all profile photos"
ON public.profile_photos
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own photos"
ON public.profile_photos
FOR INSERT
WITH CHECK (profile_id = get_user_profile_id(auth.uid()));

CREATE POLICY "Users can update their own photos"
ON public.profile_photos
FOR UPDATE
USING (profile_id = get_user_profile_id(auth.uid()));

CREATE POLICY "Users can delete their own photos"
ON public.profile_photos
FOR DELETE
USING (profile_id = get_user_profile_id(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_profile_photos_profile_id ON public.profile_photos(profile_id);
CREATE INDEX idx_profile_photos_order ON public.profile_photos(profile_id, display_order);

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile photos
CREATE POLICY "Profile photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can upload their own profile photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);