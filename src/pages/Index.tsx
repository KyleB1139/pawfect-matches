import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dog, Heart, Users, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
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
          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-8 font-medium">
            Where dog lovers find their perfect match
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link to="/discover">
              <Button variant="hero" size="xl" className="w-full sm:w-auto">
                <Heart className="w-5 h-5 mr-2" />
                Start Swiping
              </Button>
            </Link>
            <Button variant="outline" size="xl" className="w-full sm:w-auto border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              Learn More
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 text-primary-foreground/80">
            <div>
              <p className="font-display text-3xl font-bold text-primary-foreground">50K+</p>
              <p className="text-sm">Dog Lovers</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-primary-foreground">15K+</p>
              <p className="text-sm">Matches Made</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-primary-foreground">100+</p>
              <p className="text-sm">Dog Breeds</p>
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
            How <span className="text-gradient">fetch</span> Works
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Find someone who loves dogs as much as you do. Our app makes it easy to connect with fellow dog parents.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center p-6 rounded-2xl bg-background shadow-card hover:shadow-card-hover transition-shadow">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Dog className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">Show Off Your Pup</h3>
              <p className="text-muted-foreground text-sm">
                Create a profile featuring you and your furry best friend. Share your dog's breed and personality.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center p-6 rounded-2xl bg-background shadow-card hover:shadow-card-hover transition-shadow">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sage/30 flex items-center justify-center">
                <Users className="w-8 h-8 text-secondary-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">Find Compatible Dogs</h3>
              <p className="text-muted-foreground text-sm">
                See if your dogs are compatible! We show breed info and whether they get along with other pups.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center p-6 rounded-2xl bg-background shadow-card hover:shadow-card-hover transition-shadow">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-golden/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-accent" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">Plan Dog Dates</h3>
              <p className="text-muted-foreground text-sm">
                Match, chat, and plan the perfect dog park date. Double the love, double the fun!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-hero">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-4xl font-bold text-primary-foreground mb-4">
            Ready to Find Your Pack?
          </h2>
          <p className="text-primary-foreground/80 mb-8">
            Join thousands of dog lovers who've found love through fetch.
          </p>
          <Link to="/discover">
            <Button size="xl" className="bg-background text-foreground hover:bg-background/90">
              Get Started Free
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
