import { useState } from "react";
import { Heart, X, Star, MapPin, Dog, Navigation } from "lucide-react";
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

  const handleLike = () => {
    setSwipeDirection("right");
    setTimeout(onLike, 400);
  };

  const handleNope = () => {
    setSwipeDirection("left");
    setTimeout(onNope, 400);
  };

  // Use dog photo or avatar as the main image
  const displayImage = profile.dog_photo_url || profile.avatar_url || "/placeholder.svg";

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
        <img
          src={displayImage}
          alt={`${profile.name} with ${profile.dog_name}`}
          className="absolute inset-0 w-full h-full object-cover"
        />

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
        <div className="absolute bottom-0 left-0 right-0 p-6 text-primary-foreground">
          {/* Dog Breed Badge */}
          <div className="flex items-center gap-2 mb-3">
            {profile.dog_breed && (
              <Badge variant="breed" className="flex items-center gap-1">
                <Dog className="w-3 h-3" />
                {profile.dog_breed}
              </Badge>
            )}
            {profile.dog_friendly && (
              <Badge variant="friendly">Dog Friendly</Badge>
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
          <div className="flex items-center gap-3 text-primary-foreground/80 mb-3">
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

          {/* Dog Details (expandable) */}
          {showDetails && profile.dog_name && (
            <div className="mt-4 p-3 bg-background/10 backdrop-blur-sm rounded-xl">
              <p className="font-semibold text-sm mb-2">
                🐕 {profile.dog_name} {profile.dog_age ? `• ${profile.dog_age} years old` : ""}
              </p>
              {profile.dog_friendly_with && profile.dog_friendly_with.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {profile.dog_friendly_with.map((type) => (
                    <Badge key={type} variant="info" className="text-xs bg-background/20 text-primary-foreground/90">
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
