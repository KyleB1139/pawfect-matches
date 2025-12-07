import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import { Dog, MessageCircle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ProfileData } from "./Discover";

interface MatchWithProfile extends ProfileData {
  matched_at: string;
}

const Matches = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user]);

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
      .select("*")
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
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-center">
          <h1 className="font-display text-2xl font-bold text-gradient">Matches</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        {matches.length > 0 ? (
          <div className="space-y-4">
            {matches.map((match) => (
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
                  <Heart className="absolute -bottom-1 -right-1 w-5 h-5 text-primary fill-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {match.dog_name || match.name}
                  </h3>
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