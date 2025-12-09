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
import { Card } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import { Dog, Camera, Save, Settings, X, Heart, ThumbsDown, Users, MapPin, CheckCircle } from "lucide-react";
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
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [dogPhotoFile, setDogPhotoFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [dogPhotoPreview, setDogPhotoPreview] = useState<string | null>(null);
  const [stats, setStats] = useState({ passes: 0, likes: 0, matches: 0 });
  
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
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    // Get user's profile ID
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!userProfile) return;

    // Fetch counts in parallel
    const [passesResult, likesResult, matchesResult] = await Promise.all([
      supabase
        .from("passes" as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userProfile.id),
      supabase
        .from("likes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userProfile.id),
      supabase.rpc("get_user_matches", { _user_id: userProfile.id }),
    ]);

    setStats({
      passes: passesResult.count || 0,
      likes: likesResult.count || 0,
      matches: matchesResult.data?.length || 0,
    });
  };

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
      
      // Check if user has location coordinates
      setHasLocation(!!(data.latitude && data.longitude));
    }
  };

  const updateLocation = async () => {
    if (!user) return;
    
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        const { error } = await supabase
          .from("profiles")
          .update({ latitude, longitude })
          .eq("user_id", user.id);

        if (error) {
          toast({
            title: "Error updating location",
            description: "Please try again later.",
            variant: "destructive",
          });
        } else {
          setHasLocation(true);
          toast({
            title: "Location updated!",
            description: "Your GPS coordinates have been saved.",
          });
        }
        
        setIsUpdatingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          title: "Location access denied",
          description: "Please enable location in your browser settings.",
          variant: "destructive",
        });
        setIsUpdatingLocation(false);
      }
    );
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
        {/* Stats Section */}
        <section className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <Heart className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">{stats.likes}</p>
            <p className="text-xs text-muted-foreground">Likes Sent</p>
          </Card>
          <Card className="p-4 text-center">
            <Users className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">{stats.matches}</p>
            <p className="text-xs text-muted-foreground">Matches</p>
          </Card>
          <Card className="p-4 text-center">
            <ThumbsDown className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold text-foreground">{stats.passes}</p>
            <p className="text-xs text-muted-foreground">Passed</p>
          </Card>
        </section>

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
            
            {/* GPS Location */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">GPS Location</p>
                  <p className="text-xs text-muted-foreground">
                    {hasLocation ? "Location saved for distance filtering" : "Enable for distance-based matching"}
                  </p>
                </div>
              </div>
              <Button
                variant={hasLocation ? "outline" : "default"}
                size="sm"
                onClick={updateLocation}
                disabled={isUpdatingLocation}
                className="gap-2"
              >
                {isUpdatingLocation ? (
                  <Dog className="w-4 h-4 animate-spin" />
                ) : hasLocation ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Update
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    Enable
                  </>
                )}
              </Button>
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
