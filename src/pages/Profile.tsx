import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { Dog, Camera, Save, Settings, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const dogBreeds = [
  "Labrador Retriever", "German Shepherd", "Golden Retriever", "French Bulldog",
  "Bulldog", "Poodle", "Beagle", "Rottweiler", "Husky", "Corgi", "Boxer",
  "Dachshund", "Great Dane", "Shih Tzu", "Chihuahua", "Mixed Breed", "Other"
];

const friendlyOptions = ["Small dogs", "Large dogs", "Cats", "Children", "Everyone"];

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [dogPhotoFile, setDogPhotoFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [dogPhotoPreview, setDogPhotoPreview] = useState<string | null>(null);
  
  const [profile, setProfile] = useState({
    name: "",
    age: "",
    bio: "",
    location: "",
    avatar_url: "",
    dog_name: "",
    dog_breed: "",
    dog_age: "",
    dog_friendly: true,
    dog_friendly_with: [] as string[],
    dog_photo_url: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (data) {
      setProfile({
        name: data.name || "",
        age: data.age?.toString() || "",
        bio: data.bio || "",
        location: data.location || "",
        avatar_url: data.avatar_url || "",
        dog_name: data.dog_name || "",
        dog_breed: data.dog_breed || "",
        dog_age: data.dog_age?.toString() || "",
        dog_friendly: data.dog_friendly ?? true,
        dog_friendly_with: data.dog_friendly_with || [],
        dog_photo_url: data.dog_photo_url || "",
      });
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleDogPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDogPhotoFile(file);
      setDogPhotoPreview(URL.createObjectURL(file));
    }
  };

  const toggleFriendlyWith = (option: string) => {
    setProfile(prev => ({
      ...prev,
      dog_friendly_with: prev.dog_friendly_with.includes(option)
        ? prev.dog_friendly_with.filter(o => o !== option)
        : [...prev.dog_friendly_with, option]
    }));
  };

  const uploadFile = async (file: File, bucket: string) => {
    if (!user) return null;
    
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { upsert: true });
    
    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }
    
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      let avatarUrl = profile.avatar_url;
      let dogPhotoUrl = profile.dog_photo_url;
      
      if (avatarFile) {
        const url = await uploadFile(avatarFile, "avatars");
        if (url) avatarUrl = url;
      }
      
      if (dogPhotoFile) {
        const url = await uploadFile(dogPhotoFile, "dog-photos");
        if (url) dogPhotoUrl = url;
      }
      
      const { error } = await supabase
        .from("profiles")
        .update({
          name: profile.name,
          age: profile.age ? parseInt(profile.age) : null,
          bio: profile.bio,
          location: profile.location,
          avatar_url: avatarUrl,
          dog_name: profile.dog_name,
          dog_breed: profile.dog_breed,
          dog_age: profile.dog_age ? parseInt(profile.dog_age) : null,
          dog_friendly: profile.dog_friendly,
          dog_friendly_with: profile.dog_friendly_with,
          dog_photo_url: dogPhotoUrl,
        })
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      toast({
        title: "Profile saved! 🐕",
        description: "Your profile has been updated.",
      });
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Error saving profile",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    navigate("/settings");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Dog className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-gradient">My Profile</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Profile Form */}
      <main className="max-w-md mx-auto px-4 py-6 space-y-8">
        {/* Profile Photo Section */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold">Your Photo</h2>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-muted">
              {(avatarPreview || profile.avatar_url) ? (
                <img 
                  src={avatarPreview || profile.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="avatar" className="cursor-pointer">
                <div className="flex items-center gap-2 text-primary hover:underline">
                  <Camera className="w-4 h-4" />
                  Upload photo
                </div>
              </Label>
              <Input 
                id="avatar" 
                type="file" 
                accept="image/*" 
                className="hidden"
                onChange={handleAvatarChange}
              />
              <p className="text-sm text-muted-foreground mt-1">Show off you and your pup!</p>
            </div>
          </div>
        </section>

        {/* Basic Info */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold">About You</h2>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={profile.age}
                  onChange={(e) => setProfile(p => ({ ...p, age: e.target.value }))}
                  placeholder="25"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={profile.location}
                  onChange={(e) => setProfile(p => ({ ...p, location: e.target.value }))}
                  placeholder="City"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                placeholder="Tell others about yourself and why you love dogs..."
                rows={3}
              />
            </div>
          </div>
        </section>

        {/* Dog Info */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold">Your Dog 🐕</h2>
          
          {/* Dog Photo */}
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted">
              {(dogPhotoPreview || profile.dog_photo_url) ? (
                <img 
                  src={dogPhotoPreview || profile.dog_photo_url} 
                  alt="Dog" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Dog className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="dogPhoto" className="cursor-pointer">
                <div className="flex items-center gap-2 text-primary hover:underline">
                  <Camera className="w-4 h-4" />
                  Upload dog photo
                </div>
              </Label>
              <Input 
                id="dogPhoto" 
                type="file" 
                accept="image/*" 
                className="hidden"
                onChange={handleDogPhotoChange}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dogName">Dog's Name</Label>
                <Input
                  id="dogName"
                  value={profile.dog_name}
                  onChange={(e) => setProfile(p => ({ ...p, dog_name: e.target.value }))}
                  placeholder="Max"
                />
              </div>
              <div>
                <Label htmlFor="dogAge">Dog's Age</Label>
                <Input
                  id="dogAge"
                  type="number"
                  value={profile.dog_age}
                  onChange={(e) => setProfile(p => ({ ...p, dog_age: e.target.value }))}
                  placeholder="3"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="dogBreed">Breed</Label>
              <select
                id="dogBreed"
                value={profile.dog_breed}
                onChange={(e) => setProfile(p => ({ ...p, dog_breed: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select breed...</option>
                {dogBreeds.map(breed => (
                  <option key={breed} value={breed}>{breed}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Friendly with other dogs?</Label>
                <p className="text-sm text-muted-foreground">Does your dog get along with others?</p>
              </div>
              <Switch
                checked={profile.dog_friendly}
                onCheckedChange={(checked) => setProfile(p => ({ ...p, dog_friendly: checked }))}
              />
            </div>

            {profile.dog_friendly && (
              <div>
                <Label className="mb-2 block">Gets along with</Label>
                <div className="flex flex-wrap gap-2">
                  {friendlyOptions.map(option => (
                    <Badge
                      key={option}
                      variant={profile.dog_friendly_with.includes(option) ? "friendly" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFriendlyWith(option)}
                    >
                      {option}
                      {profile.dog_friendly_with.includes(option) && (
                        <X className="w-3 h-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          className="w-full" 
          size="lg"
          disabled={isSaving}
        >
          {isSaving ? (
            <Dog className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </main>

      <Navigation />
    </div>
  );
};

export default Profile;
