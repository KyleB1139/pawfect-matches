import { useState } from "react";
import { mockProfiles, Profile } from "@/data/profiles";
import ProfileCard from "@/components/ProfileCard";
import MatchScreen from "@/components/MatchScreen";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";

const Discover = () => {
  const [profiles, setProfiles] = useState<Profile[]>(mockProfiles);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);

  const currentProfile = profiles[currentIndex];

  const handleLike = () => {
    // Simulate a 30% chance of matching
    if (Math.random() < 0.3) {
      setMatchedProfile(currentProfile);
    } else {
      goToNext();
    }
  };

  const handleNope = () => {
    goToNext();
  };

  const handleSuperLike = () => {
    toast({
      title: "Super Like sent! ⭐",
      description: `${currentProfile.name} will be notified!`,
    });
    // Super likes always match for demo purposes
    setMatchedProfile(currentProfile);
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

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-center">
          <h1 className="font-display text-2xl font-bold text-gradient">fetch</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        {currentProfile ? (
          <ProfileCard
            profile={currentProfile}
            onLike={handleLike}
            onNope={handleNope}
            onSuperLike={handleSuperLike}
          />
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No more profiles to show!</p>
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
