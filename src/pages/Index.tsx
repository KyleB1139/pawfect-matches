import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dog, Heart, Users, Sparkles, LogIn, Coffee, MapPin } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 p-4">
        <div className="max-w-6xl mx-auto flex justify-end">
          {user ? (
            <Link to="/discover">
              <Button variant="hero" size="sm">
                <Heart className="w-4 h-4 mr-2" />
                Start Swiping
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button variant="hero" size="sm">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Happy couple walking dogs at sunset"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/40 to-foreground/80" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-6 animate-float">
            <Dog className="w-12 h-12 text-primary" />
            <h1 className="font-display text-6xl md:text-7xl font-bold text-primary-foreground">
              fetch
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-2xl md:text-4xl text-primary-foreground mb-4 font-display font-bold leading-tight">
            Dating for people who love their dogs
          </p>
          <p className="text-base md:text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Meet someone who gets it — the early walks, the muddy paws, the unconditional love. Real connections between humans, with a shared love for dogs.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link to={user ? "/discover" : "/auth"}>
              <Button variant="hero" size="xl" className="w-full sm:w-auto">
                <Heart className="w-5 h-5 mr-2" />
                Find your person
              </Button>
            </Link>
            <Button variant="outline" size="xl" className="w-full sm:w-auto border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              How it works
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 text-primary-foreground/80">
            <div>
              <p className="font-display text-3xl font-bold text-primary-foreground">50K+</p>
              <p className="text-sm">Singles</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-primary-foreground">15K+</p>
              <p className="text-sm">Matches Made</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-primary-foreground">2K+</p>
              <p className="text-sm">First Dates</p>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-primary-foreground/50 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-primary-foreground/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-card">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-4xl font-bold text-center mb-4">
            Dating, with a <span className="text-gradient">shared love</span>
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Fetch is a dating app for people, not pets. Your dog is just the best icebreaker you'll ever have.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center p-6 rounded-2xl bg-background shadow-card hover:shadow-card-hover transition-shadow">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">Real Connections</h3>
              <p className="text-muted-foreground text-sm">
                Share who you are — your lifestyle, what you're looking for, and the values that matter. Then add your pup to the picture.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center p-6 rounded-2xl bg-background shadow-card hover:shadow-card-hover transition-shadow">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sage/30 flex items-center justify-center">
                <Coffee className="w-8 h-8 text-secondary-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">Skip the Small Talk</h3>
              <p className="text-muted-foreground text-sm">
                No more "what do you do for fun?" You both already love long walks, dog parks, and weekend adventures.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center p-6 rounded-2xl bg-background shadow-card hover:shadow-card-hover transition-shadow">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-golden/20 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-accent" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">Date Locally</h3>
              <p className="text-muted-foreground text-sm">
                Match with people nearby and turn coffee dates into park dates. Your dog approves the vibe before you do.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-hero">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-4xl font-bold text-primary-foreground mb-4">
            Your next great date starts with a wag
          </h2>
          <p className="text-primary-foreground/80 mb-8">
            Join thousands of singles who've found love — with a four-legged co-pilot.
          </p>
          <Link to={user ? "/discover" : "/auth"}>
            <Button size="xl" className="bg-background text-foreground hover:bg-background/90">
              Create Your Profile
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-foreground text-primary-foreground/60">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Dog className="w-6 h-6 text-primary" />
            <span className="font-display text-xl font-bold text-primary-foreground">fetch</span>
          </div>
          <p className="text-sm">© 2024 Fetch. Made with ❤️ for dog lovers.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
