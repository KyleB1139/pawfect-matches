import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ProfileCard from "@/components/ProfileCard";
import MatchScreen from "@/components/MatchScreen";
import Navigation from "@/components/Navigation";
import MatchFiltersComponent, { MatchFilters } from "@/components/MatchFilters";
import { useDistanceUnit } from "@/hooks/useDistanceUnit";
import { toast } from "@/hooks/use-toast";
import { Dog, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export interface ProfileData {
  id: string;
  user_id: string;
  name: string;
  age: number | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  dog_name: string | null;
  dog_breed: string | null;
  dog_age: number | null;
  dog_friendly: boolean | null;
  dog_friendly_with: string[] | null;
  dog_photo_url: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

const Discover = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { formatDistance } = useDistanceUnit();
  
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchedProfile, setMatchedProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [superLikesRemaining, setSuperLikesRemaining] = useState(3);
  const [isBoostActive, setIsBoostActive] = useState(false);
  const [boostEndsAt, setBoostEndsAt] = useState<Date | null>(null);
  const [filters, setFilters] = useState<MatchFilters>({
    breed: "",
    minAge: null,
    maxAge: null,
    location: "",
    maxDistance: null,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const [userProfileId, setUserProfileId] = useState<string | null>(null);

  // Request and save user location
  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        // Save to user's profile
        if (user) {
          await supabase
            .from("profiles")
            .update({ latitude, longitude })
            .eq("user_id", user.id);
        }

        toast({
          title: "Location enabled",
          description: "You can now filter matches by distance.",
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          title: "Location access denied",
          description: "Please enable location in your browser settings.",
          variant: "destructive",
        });
      }
    );
  }, [user]);

  // Load user's saved location on mount
  useEffect(() => {
    const loadUserLocation = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("latitude, longitude")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.latitude && data?.longitude) {
        setUserLocation({ lat: data.latitude, lng: data.longitude });
      }
    };

    loadUserLocation();
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchProfiles();
      fetchSuperLikeCount();
      fetchBoostStatus();
    }
  }, [user]);

  const fetchBoostStatus = async () => {
    if (!user) return;
    
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!userProfile) return;

    const { data: activeBoost } = await supabase
      .from("profile_boosts")
      .select("ends_at")
      .eq("user_id", userProfile.id)
      .gte("ends_at", new Date().toISOString())
      .lte("starts_at", new Date().toISOString())
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeBoost) {
      setIsBoostActive(true);
      setBoostEndsAt(new Date(activeBoost.ends_at));
    } else {
      setIsBoostActive(false);
      setBoostEndsAt(null);
    }
  };

  const handleActivateBoost = async () => {
    if (!userProfileId) return;

    const now = new Date();
    const endsAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

    const { error } = await supabase
      .from("profile_boosts")
      .insert({
        user_id: userProfileId,
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
      });

    if (error) {
      console.error("Error activating boost:", error);
      toast({
        title: "Error",
        description: "Failed to activate boost. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsBoostActive(true);
    setBoostEndsAt(endsAt);
    toast({
      title: "Boost activated! ⚡",
      description: "Your profile will appear first for the next 30 minutes!",
    });
  };

  const fetchSuperLikeCount = async () => {
    if (!user) return;
    
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!userProfile) return;

    const { data: count } = await supabase
      .rpc("get_daily_super_like_count", { _user_profile_id: userProfile.id });

    const used = count || 0;
    setSuperLikesRemaining(Math.max(0, 3 - used));
  };

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (!error && data) {
      setUserProfileId(data.id);
    }
  };

  const fetchProfiles = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    // Get user's profile ID and preferences
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id, interested_in, min_age_preference, max_age_preference")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!userProfile) {
      setIsLoading(false);
      return;
    }

    const interestedIn = userProfile.interested_in || [];
    const minAge = userProfile.min_age_preference;
    const maxAge = userProfile.max_age_preference;

    // Get already liked profiles to exclude them
    const { data: likedData } = await supabase
      .from("likes")
      .select("liked_profile_id")
      .eq("user_id", userProfile.id);
    
    const likedIds = likedData?.map(l => l.liked_profile_id) || [];

    // Get blocked profiles (both directions)
    const { data: blockedData } = await supabase
      .from("blocks")
      .select("blocked_profile_id")
      .eq("user_id", userProfile.id);
    
    const blockedIds = blockedData?.map(b => b.blocked_profile_id) || [];

    // Get profiles that blocked the current user using the is_blocked function
    // We'll filter these on the server side via the RPC function
    const { data: blockedByData } = await supabase
      .rpc("get_blocked_by_ids" as any, { _user_id: userProfile.id });
    
    const blockedByIds = (blockedByData as { blocker_id: string }[] | null)?.map(b => b.blocker_id) || [];

    // Get passed profiles
    const { data: passedData } = await supabase
      .from("passes" as any)
      .select("passed_profile_id")
      .eq("user_id", userProfile.id);
    
    const passedIds = (passedData as unknown as { passed_profile_id: string }[] | null)?.map(p => p.passed_profile_id) || [];

    // Combine all IDs to exclude
    const excludeIds = [...new Set([...likedIds, ...blockedIds, ...blockedByIds, ...passedIds])];
    
    // Fetch profiles excluding current user, already liked, and blocked
    let query = supabase
      .from("profiles")
      .select("*")
      .neq("user_id", user.id)
      .not("dog_name", "is", null);  // Only show profiles with dogs
    
    if (excludeIds.length > 0) {
      query = query.not("id", "in", `(${excludeIds.join(",")})`);
    }

    // Filter by interested_in preferences if set
    if (interestedIn.length > 0) {
      query = query.in("gender", interestedIn);
    }

    // Filter by age preferences if set
    if (minAge) {
      query = query.gte("age", minAge);
    }
    if (maxAge) {
      query = query.lte("age", maxAge);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error fetching profiles:", error);
      toast({
        title: "Error loading profiles",
        description: "Please try again later.",
        variant: "destructive",
      });
    } else {
      // Check which profiles are boosted and sort them first
      const profilesWithBoost = await Promise.all(
        (data || []).map(async (profile) => {
          const { data: isBoosted } = await supabase
            .rpc("is_profile_boosted", { _profile_id: profile.id });
          return { ...profile, isBoosted: !!isBoosted };
        })
      );
      
      // Sort boosted profiles first
      profilesWithBoost.sort((a, b) => {
        if (a.isBoosted && !b.isBoosted) return -1;
        if (!a.isBoosted && b.isBoosted) return 1;
        return 0;
      });
      
      setProfiles(profilesWithBoost);
    }
    
    setIsLoading(false);
  };

  

  const handleLike = async () => {
    if (!userProfileId || !currentProfile) return;
    
    // Save the like to database
    const { error } = await supabase
      .from("likes")
      .insert({
        user_id: userProfileId,
        liked_profile_id: currentProfile.id,
      });
    
    if (error) {
      console.error("Error saving like:", error);
      goToNext();
      return;
    }

    // Check if this creates a mutual match
    const { data: matchData } = await supabase
      .rpc("get_user_matches", { _user_id: userProfileId });
    
    const isMatch = matchData?.some(
      (m: { matched_user_id: string }) => m.matched_user_id === currentProfile.id
    );

    if (isMatch) {
      // Send push notification to matched user
      try {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("dog_name, name")
          .eq("id", userProfileId)
          .single();

        const myName = myProfile?.dog_name || myProfile?.name || "Someone";

        await supabase.functions.invoke("send-push-notification", {
          body: {
            userId: currentProfile.user_id,
            title: "It's a match! 🎉",
            body: `You and ${myName} liked each other!`,
            url: "/matches",
          },
        });
      } catch (pushError) {
        console.error("Failed to send match notification:", pushError);
      }

      setMatchedProfile(currentProfile);
    } else {
      goToNext();
    }
  };

  const handleNope = async () => {
    if (!userProfileId || !currentProfile) {
      goToNext();
      return;
    }

    // Save the pass to database
    await supabase
      .from("passes" as any)
      .insert({
        user_id: userProfileId,
        passed_profile_id: currentProfile.id,
      });

    goToNext();
  };

  const handleSuperLike = async () => {
    if (!userProfileId || !currentProfile) return;
    
    // Check daily limit
    if (superLikesRemaining <= 0) {
      toast({
        title: "No Super Likes left",
        description: "You've used all 3 Super Likes for today. Come back tomorrow!",
        variant: "destructive",
      });
      return;
    }

    // Record the super like
    const { error: superLikeError } = await supabase
      .from("super_likes")
      .insert({
        user_id: userProfileId,
        liked_profile_id: currentProfile.id,
      });

    if (superLikeError && superLikeError.code !== "23505") {
      console.error("Error saving super like:", superLikeError);
      toast({
        title: "Error",
        description: "Failed to send Super Like. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Also add a regular like
    const { error: likeError } = await supabase
      .from("likes")
      .insert({
        user_id: userProfileId,
        liked_profile_id: currentProfile.id,
      });
    
    if (likeError && likeError.code !== "23505") {
      console.error("Error saving like:", likeError);
    }

    // Update remaining count
    setSuperLikesRemaining(prev => Math.max(0, prev - 1));

    // Send push notification to the recipient
    try {
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("dog_name, name")
        .eq("id", userProfileId)
        .single();

      const myName = myProfile?.dog_name || myProfile?.name || "Someone";

      await supabase.functions.invoke("send-push-notification", {
        body: {
          userId: currentProfile.user_id,
          title: "⭐ You got a Super Like!",
          body: `${myName} super liked you! Check them out!`,
          url: "/discover",
        },
      });
    } catch (pushError) {
      console.error("Failed to send super like notification:", pushError);
    }

    toast({
      title: "Super Like sent! ⭐",
      description: `${currentProfile.name} will be notified! (${superLikesRemaining - 1} left today)`,
    });

    // Check if this creates a mutual match
    const { data: matchData } = await supabase
      .rpc("get_user_matches", { _user_id: userProfileId });
    
    const isMatch = matchData?.some(
      (m: { matched_user_id: string }) => m.matched_user_id === currentProfile.id
    );

    if (isMatch) {
      // Send push notification to matched user
      try {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("dog_name, name")
          .eq("id", userProfileId)
          .single();

        const myName = myProfile?.dog_name || myProfile?.name || "Someone";

        await supabase.functions.invoke("send-push-notification", {
          body: {
            userId: currentProfile.user_id,
            title: "It's a match! 🎉",
            body: `You and ${myName} liked each other!`,
            url: "/matches",
          },
        });
      } catch (pushError) {
        console.error("Failed to send match notification:", pushError);
      }

      setMatchedProfile(currentProfile);
    } else {
      goToNext();
    }
  };

  const goToNext = () => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Loop back for demo
    }
  };

  const handleMatchContinue = () => {
    setMatchedProfile(null);
    goToNext();
  };

  const handleMatchMessage = () => {
    setMatchedProfile(null);
    toast({
      title: "Messages coming soon!",
      description: "This feature is under development.",
    });
    goToNext();
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Dog className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filter profiles based on distance and other filters
  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      // Distance filter
      if (filters.maxDistance && userLocation && profile.latitude && profile.longitude) {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          profile.latitude,
          profile.longitude
        );
        if (distance > filters.maxDistance) return false;
      }

      // Breed filter
      if (filters.breed && profile.dog_breed !== filters.breed) return false;

      // Age filter
      if (filters.minAge !== null && (profile.dog_age ?? 0) < filters.minAge) return false;
      if (filters.maxAge !== null && (profile.dog_age ?? 0) > filters.maxAge) return false;

      // Location filter
      if (filters.location && profile.location !== filters.location) return false;

      return true;
    });
  }, [profiles, filters, userLocation]);

  // Get available filter options from profiles
  const availableBreeds = useMemo(() => {
    const breeds = profiles.map((p) => p.dog_breed).filter((b): b is string => !!b);
    return [...new Set(breeds)].sort();
  }, [profiles]);

  const availableLocations = useMemo(() => {
    const locations = profiles.map((p) => p.location).filter((l): l is string => !!l);
    return [...new Set(locations)].sort();
  }, [profiles]);

  const currentProfile = filteredProfiles[currentIndex];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-gradient">fetch</h1>
          <MatchFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            availableBreeds={availableBreeds}
            availableLocations={availableLocations}
            userHasLocation={!!userLocation}
            onRequestLocation={requestLocation}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        {currentProfile ? (
          <>
            {/* Boost & Super Like Status */}
            <div className="flex justify-center gap-3 mb-4 flex-wrap">
              {isBoostActive ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
                  <Zap className="w-4 h-4 text-primary fill-primary animate-pulse" />
                  <span className="text-sm font-medium text-primary">
                    Boost active until {boostEndsAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleActivateBoost}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-full transition-colors border border-primary/20"
                >
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Boost Profile</span>
                </button>
              )}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full">
                <Star className="w-4 h-4 text-accent fill-accent" />
                <span className="text-sm font-medium">
                  {superLikesRemaining} Super {superLikesRemaining === 1 ? 'Like' : 'Likes'} left today
                </span>
              </div>
            </div>
            <ProfileCard
              profile={currentProfile}
              onLike={handleLike}
              onNope={handleNope}
              onSuperLike={handleSuperLike}
              superLikesRemaining={superLikesRemaining}
              distance={
                userLocation && currentProfile.latitude && currentProfile.longitude
                  ? calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      currentProfile.latitude,
                      currentProfile.longitude
                    )
                  : null
              }
              distanceLabel={
                userLocation && currentProfile.latitude && currentProfile.longitude
                  ? formatDistance(
                      calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        currentProfile.latitude,
                        currentProfile.longitude
                      )
                    )
                  : undefined
              }
            />
          </>
        ) : (
          <div className="text-center py-20 space-y-4">
            <Dog className="w-16 h-16 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No more profiles to show!</p>
            <p className="text-sm text-muted-foreground">
              {profiles.length > 0 
                ? "Try adjusting your filters to see more matches."
                : "Be the first to create a profile and attract dog lovers."}
            </p>
            <Link to="/profile">
              <Button>Complete Your Profile</Button>
            </Link>
          </div>
        )}
      </main>

      {/* Match Screen */}
      {matchedProfile && (
        <MatchScreen
          profile={matchedProfile}
          onContinue={handleMatchContinue}
          onMessage={handleMatchMessage}
        />
      )}

      {/* Navigation */}
      <Navigation />
    </div>
  );
};

export default Discover;
