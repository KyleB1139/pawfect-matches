import { useState } from "react";
import { Heart, X, Star, MapPin, Dog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Profile } from "@/data/profiles";
import { cn } from "@/lib/utils";

interface ProfileCardProps {
  profile: Profile;
  onLike: () => void;
  onNope: () => void;
  onSuperLike: () => void;
}

const ProfileCard = ({ profile, onLike, onNope, onSuperLike }: ProfileCardProps) => {
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
          src={profile.image}
          alt={`${profile.name} with ${profile.dog.name}`}
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
            <Badge variant="breed" className="flex items-center gap-1">
              <Dog className="w-3 h-3" />
              {profile.dog.breed}
            </Badge>
            {profile.dog.friendly && (
              <Badge variant="friendly">Dog Friendly</Badge>
            )}
          </div>

          {/* Name & Age */}
          <h2 className="font-display text-3xl font-bold mb-1">
            {profile.name}, {profile.age}
          </h2>

          {/* Location */}
          <div className="flex items-center gap-1 text-primary-foreground/80 mb-3">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{profile.location}</span>
          </div>

          {/* Bio (expandable) */}
          <p
            className={cn(
              "text-sm text-primary-foreground/90 transition-all duration-300",
              showDetails ? "line-clamp-none" : "line-clamp-2"
            )}
          >
            {profile.bio}
          </p>

          {/* Dog Details (expandable) */}
          {showDetails && (
            <div className="mt-4 p-3 bg-background/10 backdrop-blur-sm rounded-xl">
              <p className="font-semibold text-sm mb-2">
                🐕 {profile.dog.name} • {profile.dog.age} years old
              </p>
              <div className="flex flex-wrap gap-1">
                {profile.dog.friendlyWith.map((type) => (
                  <Badge key={type} variant="info" className="text-xs bg-background/20 text-primary-foreground/90">
                    {type}
                  </Badge>
                ))}
              </div>
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
          className="rounded-full"
        >
          <Star className="w-6 h-6" />
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
