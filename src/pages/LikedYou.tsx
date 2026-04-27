import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import ProfilePreviewDialog from "@/components/ProfilePreviewDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Star, User, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { calculateCompatibility } from "@/lib/compatibility";
import { cn } from "@/lib/utils";

interface ProfilePhoto {
  id: string;
  photo_url: string;
  is_primary: boolean;
  display_order: number;
}

interface FullProfile {
  id: string;
  name: string;
  age: number | null;
  avatar_url: string | null;
  location: string | null;
  bio: string | null;
  gender: string | null;
  dog_name: string | null;
  dog_breed: string | null;
  dog_age: number | null;
  dog_photo_url: string | null;
  dog_friendly: boolean | null;
  dog_friendly_with: string[] | null;
  looking_for: string[] | null;
  lifestyle: string[] | null;
  min_age_preference?: number | null;
  max_age_preference?: number | null;
  photos?: ProfilePhoto[];
}

interface LikeData {
  id: string;
  created_at: string;
  profile: FullProfile;
  isSuperLike: boolean;
  compatibility: number;
}

const LikedYou = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [likes, setLikes] = useState<LikeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<FullProfile | null>(null);
  const [selectedIsSuperLike, setSelectedIsSuperLike] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompatibility, setSelectedCompatibility] = useState<number>(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchLikes();
      markLikesAsViewed();
    }
  }, [user]);

  const markLikesAsViewed = async () => {
    if (!user) return;
    
    // Upsert the like_views record
    await supabase
      .from("like_views")
      .upsert(
        { user_id: user.id, last_viewed_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
  };

  const fetchLikes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get user's profile ID
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("id, age, gender, interested_in, min_age_preference, max_age_preference, looking_for, lifestyle, dog_friendly, dog_friendly_with, dog_breed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!userProfile) {
        setLoading(false);
        return;
      }

      setUserProfileId(userProfile.id);

      // Get regular likes on user's profile
      const { data: likesData, error: likesError } = await supabase
        .from("likes")
        .select(`
          id,
          created_at,
          user_id
        `)
        .eq("liked_profile_id", userProfile.id)
        .order("created_at", { ascending: false });

      if (likesError) throw likesError;

      // Get super likes on user's profile
      const { data: superLikesData, error: superLikesError } = await supabase
        .from("super_likes")
        .select(`
          id,
          created_at,
          user_id
        `)
        .eq("liked_profile_id", userProfile.id)
        .order("created_at", { ascending: false });

      if (superLikesError) throw superLikesError;

      // Get all unique profile IDs that liked the user
      const likerProfileIds = [
        ...(likesData || []).map(l => l.user_id),
        ...(superLikesData || []).map(l => l.user_id)
      ];

      if (likerProfileIds.length === 0) {
        setLikes([]);
        setLoading(false);
        return;
      }

      // Fetch full profiles for all likers
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, age, avatar_url, location, bio, gender, dog_name, dog_breed, dog_age, dog_photo_url, dog_friendly, dog_friendly_with, looking_for, lifestyle, min_age_preference, max_age_preference")
        .in("id", likerProfileIds);

      if (profilesError) throw profilesError;

      // Fetch photos for all likers
      const { data: allPhotos } = await supabase
        .from("profile_photos")
        .select("id, profile_id, photo_url, is_primary, display_order")
        .in("profile_id", likerProfileIds);

      // Group photos by profile
      const photosByProfile = new Map<string, ProfilePhoto[]>();
      (allPhotos || []).forEach(photo => {
        const existing = photosByProfile.get(photo.profile_id) || [];
        existing.push(photo);
        photosByProfile.set(photo.profile_id, existing);
      });

      // Map profiles with photos
      const profileMap = new Map(profiles?.map(p => [p.id, { ...p, photos: photosByProfile.get(p.id) || [] }]) || []);

      // Combine and format the data
      const formattedLikes: LikeData[] = [];

      // Add regular likes
      (likesData || []).forEach(like => {
        const profile = profileMap.get(like.user_id);
        if (profile) {
          formattedLikes.push({
            id: like.id,
            created_at: like.created_at,
            profile: profile as FullProfile,
            isSuperLike: false,
            compatibility: calculateCompatibility(userProfile, profile as FullProfile),
          });
        }
      });

      // Add super likes
      (superLikesData || []).forEach(like => {
        const profile = profileMap.get(like.user_id);
        if (profile) {
          formattedLikes.push({
            id: `super-${like.id}`,
            created_at: like.created_at,
            profile: profile as FullProfile,
            isSuperLike: true,
            compatibility: calculateCompatibility(userProfile, profile as FullProfile),
          });
        }
      });

      // Sort by date, most recent first
      formattedLikes.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setLikes(formattedLikes);
    } catch (error) {
      console.error("Error fetching likes:", error);
      toast({
        title: "Error",
        description: "Failed to load who liked you",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLikeBack = async (profileId: string) => {
    if (!user) return;

    try {
      // Get user's profile ID
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!userProfile) return;

      // Check if user already liked this profile
      const { data: existingLike } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", userProfile.id)
        .eq("liked_profile_id", profileId)
        .maybeSingle();

      if (existingLike) {
        // Already a mutual like - it's a match!
        toast({
          title: "It's a match! 🎉",
          description: "You both like each other!",
        });
        navigate("/matches");
        return;
      }

      // Insert a like
      const { error } = await supabase
        .from("likes")
        .insert({
          user_id: userProfile.id,
          liked_profile_id: profileId,
        });

      if (error) throw error;

      toast({
        title: "It's a match! 🎉",
        description: "You both like each other!",
      });

      // Navigate to matches
      navigate("/matches");
    } catch (error) {
      console.error("Error liking back:", error);
      toast({
        title: "Error",
        description: "Failed to like back",
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border z-30">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary fill-primary" />
            <h1 className="text-xl font-bold">Who Liked You</h1>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-16 h-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : likes.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No likes yet</h2>
            <p className="text-muted-foreground mb-6">
              Keep swiping! Your admirers will show up here.
            </p>
            <Button onClick={() => navigate("/discover")}>
              Go to Discover
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              {likes.length} {likes.length === 1 ? "person" : "people"} liked you
            </p>
            {likes.map((like) => (
              <Card 
                key={like.id} 
                className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => {
                  setSelectedProfile(like.profile);
                  setSelectedIsSuperLike(like.isSuperLike);
                  setSelectedCompatibility(like.compatibility);
                  setDialogOpen(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 border-2 border-border">
                      <AvatarImage src={like.profile.avatar_url || undefined} />
                      <AvatarFallback>
                        <User className="w-8 h-8" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">
                          {like.profile.name}
                          {like.profile.age && `, ${like.profile.age}`}
                        </h3>
                        {like.isSuperLike && (
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-500">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            Super
                          </Badge>
                        )}
                        <Badge
                          variant="secondary"
                          className={cn(
                            "ml-auto shrink-0",
                            like.compatibility >= 75
                              ? "bg-sage/30 text-secondary-foreground"
                              : like.compatibility >= 50
                              ? "bg-accent/30 text-accent-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {like.compatibility}% match
                        </Badge>
                      </div>
                      {like.profile.location && (
                        <p className="text-sm text-muted-foreground truncate">
                          {like.profile.location}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(like.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLikeBack(like.profile.id);
                      }}
                      className="shrink-0"
                    >
                      <Heart className="w-4 h-4 mr-1" />
                      Like Back
                    </Button>
                  </div>
                  {like.profile.bio && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                      {like.profile.bio}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <ProfilePreviewDialog
        profile={selectedProfile}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onLikeBack={() => selectedProfile && handleLikeBack(selectedProfile.id)}
        isSuperLike={selectedIsSuperLike}
        userProfileId={userProfileId || undefined}
        compatibility={selectedCompatibility}
        onBlock={() => {
          // Remove blocked profile from list
          if (selectedProfile) {
            setLikes(prev => prev.filter(l => l.profile.id !== selectedProfile.id));
          }
        }}
      />

      <Navigation />
    </div>
  );
};

export default LikedYou;
