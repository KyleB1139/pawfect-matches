import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { 
  Dog, 
  User, 
  Camera, 
  MapPin, 
  Heart, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  Sparkles
} from "lucide-react";

const dogBreeds = [
  "Labrador Retriever", "German Shepherd", "Golden Retriever", "French Bulldog",
  "Bulldog", "Poodle", "Beagle", "Rottweiler", "Husky", "Corgi", "Boxer",
  "Dachshund", "Great Dane", "Shih Tzu", "Chihuahua", "Mixed Breed", "Other"
];

const friendlyOptions = ["Small dogs", "Large dogs", "Cats", "Children", "Everyone"];
const genderOptions = ["Man", "Woman", "Non-binary", "Prefer not to say"];
const interestedInOptions = ["Men", "Women", "Everyone"];
const lookingForOptions = ["Long-term relationship", "Casual dating", "Friendship", "Dog playdates", "Open to anything"];
const lifestyleOptions = ["Active & outdoorsy", "Homebody", "Social butterfly", "Adventurous", "Laid-back", "Fitness enthusiast", "Night owl", "Early bird"];

interface OnboardingData {
  name: string;
  age: string;
  gender: string;
  bio: string;
  location: string;
  interested_in: string[];
  looking_for: string[];
  lifestyle: string[];
  min_age_preference: string;
  max_age_preference: string;
  dog_name: string;
  dog_breed: string;
  dog_age: string;
  dog_friendly: boolean;
  dog_friendly_with: string[];
  avatar_url: string;
  dog_photo_url: string;
}

const STEPS = [
  { id: 1, title: "About You", icon: User },
  { id: 2, title: "Your Pup", icon: Dog },
  { id: 3, title: "Preferences", icon: Heart },
  { id: 4, title: "Photos", icon: Camera },
];

const Onboarding = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [dogPhotoFile, setDogPhotoFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [dogPhotoPreview, setDogPhotoPreview] = useState<string | null>(null);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    name: "",
    age: "",
    gender: "",
    bio: "",
    location: "",
    interested_in: [],
    looking_for: [],
    lifestyle: [],
    min_age_preference: "18",
    max_age_preference: "50",
    dog_name: "",
    dog_breed: "",
    dog_age: "",
    dog_friendly: true,
    dog_friendly_with: [],
    avatar_url: "",
    dog_photo_url: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchExistingProfile();
    }
  }, [user]);

  const fetchExistingProfile = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile) {
      setData({
        name: profile.name || "",
        age: profile.age?.toString() || "",
        gender: profile.gender || "",
        bio: profile.bio || "",
        location: profile.location || "",
        interested_in: profile.interested_in || [],
        looking_for: profile.looking_for || [],
        lifestyle: profile.lifestyle || [],
        min_age_preference: profile.min_age_preference?.toString() || "18",
        max_age_preference: profile.max_age_preference?.toString() || "50",
        dog_name: profile.dog_name || "",
        dog_breed: profile.dog_breed || "",
        dog_age: profile.dog_age?.toString() || "",
        dog_friendly: profile.dog_friendly ?? true,
        dog_friendly_with: profile.dog_friendly_with || [],
        avatar_url: profile.avatar_url || "",
        dog_photo_url: profile.dog_photo_url || "",
      });
      setHasLocation(!!(profile.latitude && profile.longitude));
    }
  };

  const updateField = <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field: 'interested_in' | 'dog_friendly_with' | 'looking_for' | 'lifestyle', option: string) => {
    setData(prev => ({
      ...prev,
      [field]: prev[field].includes(option)
        ? prev[field].filter(o => o !== option)
        : [...prev[field], option]
    }));
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

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return urlData.publicUrl;
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
            title: "Location saved!",
            description: "You'll now see matches near you.",
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

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!data.name.trim()) {
          toast({ title: "Please enter your name", variant: "destructive" });
          return false;
        }
        if (!data.age || parseInt(data.age) < 18) {
          toast({ title: "You must be 18 or older", variant: "destructive" });
          return false;
        }
        return true;
      case 2:
        if (!data.dog_name.trim()) {
          toast({ title: "Please enter your dog's name", variant: "destructive" });
          return false;
        }
        return true;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleComplete = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      let avatarUrl = data.avatar_url;
      let dogPhotoUrl = data.dog_photo_url;

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
          name: data.name,
          age: data.age ? parseInt(data.age) : null,
          gender: data.gender || null,
          bio: data.bio,
          location: data.location,
          interested_in: data.interested_in,
          looking_for: data.looking_for,
          lifestyle: data.lifestyle,
          min_age_preference: data.min_age_preference ? parseInt(data.min_age_preference) : null,
          max_age_preference: data.max_age_preference ? parseInt(data.max_age_preference) : null,
          dog_name: data.dog_name,
          dog_breed: data.dog_breed,
          dog_age: data.dog_age ? parseInt(data.dog_age) : null,
          dog_friendly: data.dog_friendly,
          dog_friendly_with: data.dog_friendly_with,
          avatar_url: avatarUrl,
          dog_photo_url: dogPhotoUrl,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profile complete! 🐕",
        description: "Let's find your perfect match!",
      });

      navigate("/discover");
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Error saving profile",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Dog className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Dog className="w-6 h-6 text-primary" />
              <span className="font-display text-xl font-bold text-gradient">Setup Profile</span>
            </div>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {STEPS.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex flex-col items-center gap-1">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all
                    ${isCompleted ? 'bg-primary text-primary-foreground' : 
                      isActive ? 'bg-primary/20 text-primary ring-2 ring-primary' : 
                      'bg-muted text-muted-foreground'}
                  `}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`text-xs ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* Step 1: About You */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-bold text-foreground">Tell us about yourself</h2>
              <p className="text-muted-foreground mt-2">Let's start with the basics</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Your Name *</Label>
                <Input
                  id="name"
                  value={data.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="What should we call you?"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    value={data.age}
                    onChange={(e) => updateField('age', e.target.value)}
                    placeholder="25"
                    min="18"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="location">City</Label>
                  <Input
                    id="location"
                    value={data.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    placeholder="New York"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Gender</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {genderOptions.map((option) => (
                    <Badge
                      key={option}
                      variant={data.gender === option ? "default" : "outline"}
                      className="cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105"
                      onClick={() => updateField('gender', option)}
                    >
                      {option}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={data.bio}
                  onChange={(e) => updateField('bio', e.target.value)}
                  placeholder="Tell others about yourself and why you love dogs..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* GPS Location */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">Enable GPS</p>
                    <p className="text-xs text-muted-foreground">
                      {hasLocation ? "Location saved" : "For distance matching"}
                    </p>
                  </div>
                </div>
                <Button
                  variant={hasLocation ? "outline" : "default"}
                  size="sm"
                  onClick={updateLocation}
                  disabled={isUpdatingLocation}
                >
                  {isUpdatingLocation ? (
                    <Dog className="w-4 h-4 animate-spin" />
                  ) : hasLocation ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    "Enable"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Your Pup */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-bold text-foreground">Tell us about your pup</h2>
              <p className="text-muted-foreground mt-2">The real star of the show!</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="dog_name">Dog's Name *</Label>
                <Input
                  id="dog_name"
                  value={data.dog_name}
                  onChange={(e) => updateField('dog_name', e.target.value)}
                  placeholder="Max"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dog_age">Dog's Age</Label>
                  <Input
                    id="dog_age"
                    type="number"
                    value={data.dog_age}
                    onChange={(e) => updateField('dog_age', e.target.value)}
                    placeholder="3"
                    min="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="dog_breed">Breed</Label>
                  <select
                    id="dog_breed"
                    value={data.dog_breed}
                    onChange={(e) => updateField('dog_breed', e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Select breed</option>
                    {dogBreeds.map((breed) => (
                      <option key={breed} value={breed}>{breed}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label>My dog is friendly with</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {friendlyOptions.map((option) => (
                    <Badge
                      key={option}
                      variant={data.dog_friendly_with.includes(option) ? "default" : "outline"}
                      className="cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105"
                      onClick={() => toggleArrayField('dog_friendly_with', option)}
                    >
                      {option}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Preferences */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-bold text-foreground">Who are you looking for?</h2>
              <p className="text-muted-foreground mt-2">Help us find your perfect match</p>
            </div>

            <div className="space-y-6">
              <div>
                <Label>I'm interested in</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {interestedInOptions.map((option) => (
                    <Badge
                      key={option}
                      variant={data.interested_in.includes(option) ? "default" : "outline"}
                      className="cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105"
                      onClick={() => toggleArrayField('interested_in', option)}
                    >
                      {option}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>What are you looking for?</Label>
                <p className="text-xs text-muted-foreground mb-2">Select all that apply</p>
                <div className="flex flex-wrap gap-2">
                  {lookingForOptions.map((option) => (
                    <Badge
                      key={option}
                      variant={data.looking_for.includes(option) ? "default" : "outline"}
                      className="cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105"
                      onClick={() => toggleArrayField('looking_for', option)}
                    >
                      {option}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Your lifestyle</Label>
                <p className="text-xs text-muted-foreground mb-2">What describes you best?</p>
                <div className="flex flex-wrap gap-2">
                  {lifestyleOptions.map((option) => (
                    <Badge
                      key={option}
                      variant={data.lifestyle.includes(option) ? "default" : "outline"}
                      className="cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105"
                      onClick={() => toggleArrayField('lifestyle', option)}
                    >
                      {option}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Age Range</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="min_age" className="text-xs text-muted-foreground">Minimum</Label>
                    <Input
                      id="min_age"
                      type="number"
                      value={data.min_age_preference}
                      onChange={(e) => updateField('min_age_preference', e.target.value)}
                      placeholder="18"
                      min="18"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_age" className="text-xs text-muted-foreground">Maximum</Label>
                    <Input
                      id="max_age"
                      type="number"
                      value={data.max_age_preference}
                      onChange={(e) => updateField('max_age_preference', e.target.value)}
                      placeholder="50"
                      min="18"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Photos */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-bold text-foreground">Add some photos</h2>
              <p className="text-muted-foreground mt-2">Show off you and your furry friend!</p>
            </div>

            <div className="space-y-6">
              {/* Profile Photo */}
              <div className="bg-muted/30 rounded-2xl p-6 border border-border">
                <Label className="text-base font-medium">Your Photo</Label>
                <div className="flex items-center gap-4 mt-4">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-dashed border-border">
                    {(avatarPreview || data.avatar_url) ? (
                      <img
                        src={avatarPreview || data.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="avatar" className="cursor-pointer">
                      <Button variant="outline" asChild>
                        <span>
                          <Camera className="w-4 h-4 mr-2" />
                          Choose Photo
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      A friendly photo works best!
                    </p>
                  </div>
                </div>
              </div>

              {/* Dog Photo */}
              <div className="bg-muted/30 rounded-2xl p-6 border border-border">
                <Label className="text-base font-medium">Your Dog's Photo</Label>
                <div className="flex items-center gap-4 mt-4">
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-muted border-2 border-dashed border-border">
                    {(dogPhotoPreview || data.dog_photo_url) ? (
                      <img
                        src={dogPhotoPreview || data.dog_photo_url}
                        alt="Dog"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Dog className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="dog-photo" className="cursor-pointer">
                      <Button variant="outline" asChild>
                        <span>
                          <Camera className="w-4 h-4 mr-2" />
                          Choose Photo
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="dog-photo"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleDogPhotoChange}
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Show off that cute pup!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border p-4">
        <div className="max-w-lg mx-auto space-y-2">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={prevStep}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            
            {currentStep < STEPS.length ? (
              <Button
                onClick={nextStep}
                className="flex-1"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={isSaving}
                className="flex-1 gap-2"
              >
              {isSaving ? (
                <Dog className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Start Matching!
                </>
              )}
            </Button>
          )}
          </div>
          
          <Button
            variant="ghost"
            onClick={() => navigate("/discover")}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
