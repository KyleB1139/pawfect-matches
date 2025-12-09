import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePresence } from "@/hooks/usePresence";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import { Dog, MessageCircle, Heart, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MatchFiltersComponent, { MatchFilters } from "@/components/MatchFilters";
import MatchActions from "@/components/MatchActions";
import type { ProfileData } from "./Discover";

interface MatchWithProfile extends ProfileData {
  matched_at: string;
  last_seen?: string | null;
}

const formatLastActive = (lastSeen: string | null | undefined, isOnline: boolean): string => {
  if (isOnline) return "Online now";
  if (!lastSeen) return "Recently";
  
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return lastSeenDate.toLocaleDateString();
};

const Matches = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [filters, setFilters] = useState<MatchFilters>({
    breed: "",
    minAge: null,
    maxAge: null,
    location: "",
    maxDistance: null,
  });

  // Track presence for online status
  const { isUserOnline } = usePresence(user?.id ?? null, userProfileId);

  // Extract unique breeds and locations for filter options
  const availableBreeds = useMemo(() => {
    const breeds = matches
      .map((m) => m.dog_breed)
      .filter((b): b is string => !!b);
    return [...new Set(breeds)].sort();
  }, [matches]);

  const availableLocations = useMemo(() => {
    const locations = matches
      .map((m) => m.location)
      .filter((l): l is string => !!l);
    return [...new Set(locations)].sort();
  }, [matches]);

  // Filter matches based on current filters
  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      if (filters.breed && match.dog_breed !== filters.breed) return false;
      if (filters.minAge !== null && (match.dog_age ?? 0) < filters.minAge) return false;
      if (filters.maxAge !== null && (match.dog_age ?? 0) > filters.maxAge) return false;
      if (filters.location && match.location !== filters.location) return false;
      return true;
    });
  }, [matches, filters]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMatches();
      markMatchesAsViewed();
    }
  }, [user]);

  const markMatchesAsViewed = async () => {
    if (!user) return;
    
    // Upsert the match_views record
    await supabase
      .from('match_views')
      .upsert(
        { user_id: user.id, last_viewed_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
  };

  const fetchMatches = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    // Get user's profile id first
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (profileError || !userProfile) {
      console.error("Error fetching user profile:", profileError);
      setIsLoading(false);
      return;
    }

    setUserProfileId(userProfile.id);

    // Get mutual matches using the function
    const { data: matchData, error: matchError } = await supabase
      .rpc("get_user_matches", { _user_id: userProfile.id });
    
    if (matchError) {
      console.error("Error fetching matches:", matchError);
      toast({
        title: "Error loading matches",
        description: "Please try again later.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!matchData || matchData.length === 0) {
      setMatches([]);
      setIsLoading(false);
      return;
    }

    // Fetch full profile data for matched users
    const matchedUserIds = matchData.map((m: { matched_user_id: string }) => m.matched_user_id);
    
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*, last_seen")
      .in("id", matchedUserIds);
    
    if (profilesError) {
      console.error("Error fetching matched profiles:", profilesError);
      setIsLoading(false);
      return;
    }

    // Combine profile data with match timestamps
    const matchesWithProfiles: MatchWithProfile[] = (profiles || []).map(profile => {
      const matchInfo = matchData.find((m: { matched_user_id: string; matched_at: string }) => 
        m.matched_user_id === profile.id
      );
      return {
        ...profile,
        matched_at: matchInfo?.matched_at || new Date().toISOString(),
      };
    });

    // Sort by most recent match
    matchesWithProfiles.sort((a, b) => 
      new Date(b.matched_at).getTime() - new Date(a.matched_at).getTime()
    );

    setMatches(matchesWithProfiles);
    setIsLoading(false);
  };

  const handleMessage = async (match: MatchWithProfile) => {
    if (!userProfileId) return;

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(participant_1_id.eq.${userProfileId},participant_2_id.eq.${match.id}),and(participant_1_id.eq.${match.id},participant_2_id.eq.${userProfileId})`)
      .maybeSingle();

    if (existing) {
      navigate("/messages");
      return;
    }

    // Create new conversation
    const { error } = await supabase
      .from("conversations")
      .insert({
        participant_1_id: userProfileId,
        participant_2_id: match.id,
      });

    if (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error starting chat",
        variant: "destructive",
      });
      return;
    }

    navigate("/messages");
  };

  if (loading || isLoading) {
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
          <h1 className="font-display text-2xl font-bold text-gradient">Matches</h1>
          {matches.length > 0 && (
            <MatchFiltersComponent
              filters={filters}
              onFiltersChange={setFilters}
              availableBreeds={availableBreeds}
              availableLocations={availableLocations}
            />
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        {filteredMatches.length > 0 ? (
          <div className="space-y-4">
            {filteredMatches.map((match) => (
              <Card 
                key={match.id} 
                className="p-4 flex items-center gap-4 hover:bg-accent/50 transition-colors"
              >
                <div className="relative">
                  <img
                    src={match.dog_photo_url || match.avatar_url || "/placeholder.svg"}
                    alt={match.dog_name || match.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                  />
                  <Circle 
                    className={`absolute -bottom-1 -right-1 w-4 h-4 ${
                      isUserOnline(match.id) 
                        ? "text-green-500 fill-green-500" 
                        : "text-muted-foreground fill-muted-foreground/50"
                    }`} 
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {match.dog_name || match.name}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isUserOnline(match.id)
                        ? "bg-green-500/10 text-green-600"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {formatLastActive(match.last_seen, isUserOnline(match.id))}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {match.dog_breed && `${match.dog_breed} • `}
                    {match.location || "Nearby"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Matched {new Date(match.matched_at).toLocaleDateString()}
                  </p>
                </div>

                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleMessage(match)}
                  className="shrink-0"
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>

                <MatchActions
                  matchId={match.id}
                  matchName={match.dog_name || match.name}
                  userProfileId={userProfileId!}
                  onActionComplete={fetchMatches}
                />
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 space-y-4">
            <Heart className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">No matches yet</h2>
            <p className="text-muted-foreground">
              Keep swiping to find your perfect match!
            </p>
            <Link to="/discover">
              <Button>Start Discovering</Button>
            </Link>
          </div>
        )}
      </main>

      {/* Navigation */}
      <Navigation />
    </div>
  );
};

export default Matches;