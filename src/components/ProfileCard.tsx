import { useState } from "react";
import { SignedImg } from "@/components/SignedImg";
import { Heart, X, Star, MapPin, Dog, Navigation, ChevronLeft, ChevronRight, Briefcase, Ruler, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProfileData } from "@/pages/Discover";
import { cn } from "@/lib/utils";

interface ProfileCardProps {
  profile: ProfileData;
  onLike: () => void;
  onNope: () => void;
  onSuperLike: () => void;
  superLikesRemaining?: number;
  distance?: number | null;
  distanceLabel?: string;
}

const ProfileCard = ({ profile, onLike, onNope, onSuperLike, superLikesRemaining = 0, distance, distanceLabel }: ProfileCardProps) => {
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const handleLike = () => {
    setSwipeDirection("right");
    setTimeout(onLike, 400);
  };

  const handleNope = () => {
    setSwipeDirection("left");
    setTimeout(onNope, 400);
  };

  // Build array of all images (gallery photos first, then fallback to dog photo/avatar)
  const allImages = (() => {
    const images: string[] = [];
    
    // Add gallery photos (sorted by primary first)
    if (profile.photos && profile.photos.length > 0) {
      const sortedPhotos = [...profile.photos].sort((a, b) => {
        if (a.is_primary) return -1;
        if (b.is_primary) return 1;
        return a.display_order - b.display_order;
      });
      images.push(...sortedPhotos.map(p => p.photo_url));
    }
    
    // Add dog photo if exists and not already in gallery
    if (profile.dog_photo_url && !images.includes(profile.dog_photo_url)) {
      images.push(profile.dog_photo_url);
    }
    
    // Add avatar if exists and not already in gallery
    if (profile.avatar_url && !images.includes(profile.avatar_url)) {
      images.push(profile.avatar_url);
    }
    
    // Fallback to placeholder
    if (images.length === 0) {
      images.push("/placeholder.svg");
    }
    
    return images;
  })();

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
  };

  return (
    <div
      className={cn(
        "relative w-full max-w-sm mx-auto",
        swipeDirection === "right" && "animate-swipe-right",
        swipeDirection === "left" && "animate-swipe-left"
      )}
    >
      {/* Main Card */}
      <div
        className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-card-hover cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        {/* Image */}
        <SignedImg
          src={allImages[currentPhotoIndex]}
          alt={`${profile.name} with ${profile.dog_name}`}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
        />

        {/* Photo Navigation Dots */}
        {allImages.length > 1 && (
          <div className="absolute top-4 left-0 right-0 flex justify-center gap-1.5 z-10">
            {allImages.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1 rounded-full transition-all duration-200",
                  index === currentPhotoIndex 
                    ? "w-6 bg-primary-foreground" 
                    : "w-1.5 bg-primary-foreground/50"
                )}
              />
            ))}
          </div>
        )}

        {/* Photo Navigation Arrows */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={handlePrevPhoto}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-foreground/40 transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNextPhoto}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-foreground/40 transition-colors z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />

        {/* Like/Nope Indicators */}
        {swipeDirection === "right" && (
          <div className="absolute top-8 left-8 rotate-[-15deg] border-4 border-sage rounded-lg px-4 py-2">
            <span className="text-sage font-display text-3xl font-bold">LIKE</span>
          </div>
        )}
        {swipeDirection === "left" && (
          <div className="absolute top-8 right-8 rotate-[15deg] border-4 border-destructive rounded-lg px-4 py-2">
            <span className="text-destructive font-display text-3xl font-bold">NOPE</span>
          </div>
        )}

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-primary-foreground max-h-[58%] overflow-y-auto scrollbar-hide">
          {/* Dog Breed Badge */}
          <div className="flex items-center gap-2 mb-2">
            {profile.dog_breed && (
              <Badge variant="breed" className="flex items-center gap-1 text-[10px] sm:text-xs px-2 py-0.5">
                <Dog className="w-3 h-3" />
                {profile.dog_breed}
              </Badge>
            )}
            {profile.dog_friendly && (
              <Badge variant="friendly" className="text-[10px] sm:text-xs px-2 py-0.5">Dog Friendly</Badge>
            )}
          </div>

          {/* Name, Age & Gender */}
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-display text-3xl font-bold">
              {profile.name}{profile.age ? `, ${profile.age}` : ""}
            </h2>
            {profile.gender && (
              <Badge variant="secondary" className="text-xs capitalize bg-background/20 text-primary-foreground border-none">
                {profile.gender === "man" ? "♂ Man" : profile.gender === "woman" ? "♀ Woman" : "Other"}
              </Badge>
            )}
          </div>

          {/* Location & Distance */}
          <div className="flex items-center gap-3 text-primary-foreground/80 mb-2">
            {profile.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{profile.location}</span>
              </div>
            )}
            {distanceLabel && (
              <div className="flex items-center gap-1">
                <Navigation className="w-4 h-4" />
                <span className="text-sm font-medium">{distanceLabel} away</span>
              </div>
            )}
          </div>

          {/* Bio (expandable) */}
          {profile.bio && (
            <p
              className={cn(
                "text-sm text-primary-foreground/90 transition-all duration-300",
                showDetails ? "line-clamp-none" : "line-clamp-2"
              )}
            >
              {profile.bio}
            </p>
          )}

          {/* Quick facts row (always visible if any present) */}
          {(profile.occupation || profile.height_cm || profile.education) && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-primary-foreground/85">
              {profile.occupation && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> {profile.occupation}
                </span>
              )}
              {profile.height_cm && (
                <span className="flex items-center gap-1">
                  <Ruler className="w-3 h-3" /> {profile.height_cm} cm
                </span>
              )}
              {profile.education && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" /> {profile.education}
                </span>
              )}
            </div>
          )}

          {/* Interests — prioritize shared/top, cap visible count, show +N more */}
          {profile.interests && profile.interests.length > 0 && (() => {
            const MAX_VISIBLE = showDetails ? 6 : 3;
            const visible = profile.interests.slice(0, MAX_VISIBLE);
            const remaining = profile.interests.length - visible.length;
            return (
              <div className="flex flex-wrap gap-0.5 mt-1.5">
                {visible.map((interest) => (
                  <Badge
                    key={interest}
                    variant="info"
                    className="text-[10px] sm:text-xs bg-background/20 text-primary-foreground/90 px-2 py-0.5"
                  >
                    {interest}
                  </Badge>
                ))}
                {remaining > 0 && (
                  <Badge
                    variant="info"
                    className="text-[10px] sm:text-xs bg-background/30 text-primary-foreground px-2 py-0.5"
                  >
                    +{remaining} more
                  </Badge>
                )}
              </div>
            );
          })()}

          {/* Dog Details (expandable) */}
          {showDetails && profile.dog_name && (
            <div className="mt-3 p-2.5 sm:p-3 bg-background/10 backdrop-blur-sm rounded-xl">
              <p className="font-semibold text-sm mb-1.5">
                🐕 {profile.dog_name} {profile.dog_age ? `• ${profile.dog_age} years old` : ""}
              </p>
              {profile.dog_friendly_with && profile.dog_friendly_with.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {profile.dog_friendly_with.map((type) => (
                    <Badge key={type} variant="info" className="text-[10px] sm:text-xs bg-background/20 text-primary-foreground/90 px-2 py-0.5">
                      {type}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <Button
          variant="nope"
          size="icon-lg"
          onClick={handleNope}
          className="rounded-full"
        >
          <X className="w-8 h-8" />
        </Button>

        <Button
          variant="superlike"
          size="icon"
          onClick={onSuperLike}
          className="rounded-full relative"
          disabled={superLikesRemaining <= 0}
          title={superLikesRemaining <= 0 ? "No Super Likes left today" : `${superLikesRemaining} Super Likes remaining`}
        >
          <Star className="w-6 h-6" />
          {superLikesRemaining <= 0 && (
            <div className="absolute inset-0 bg-muted/50 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-muted-foreground">0</span>
            </div>
          )}
        </Button>

        <Button
          variant="like"
          size="icon-lg"
          onClick={handleLike}
          className="rounded-full"
        >
          <Heart className="w-8 h-8" />
        </Button>
      </div>
    </div>
  );
};

export default ProfileCard;
