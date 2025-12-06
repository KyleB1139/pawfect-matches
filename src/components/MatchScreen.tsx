import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Profile } from "@/data/profiles";

interface MatchScreenProps {
  profile: Profile;
  onContinue: () => void;
  onMessage: () => void;
}

const MatchScreen = ({ profile, onContinue, onMessage }: MatchScreenProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 backdrop-blur-sm">
      <div className="text-center animate-match-pop">
        {/* Hearts Animation */}
        <div className="relative mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary shadow-card-hover">
              <img
                src={profile.image}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* Heart burst */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-heart-burst">
            <Heart className="w-16 h-16 text-primary fill-primary" />
          </div>
        </div>

        {/* Match Text */}
        <h1 className="font-display text-5xl font-bold text-gradient mb-4">
          It's a Match!
        </h1>
        <p className="text-primary-foreground/80 text-lg mb-8">
          You and {profile.name} liked each other
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-64 mx-auto">
          <Button variant="hero" size="lg" onClick={onMessage}>
            Send a Message
          </Button>
          <Button variant="outline" size="lg" onClick={onContinue} className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
            Keep Swiping
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MatchScreen;
