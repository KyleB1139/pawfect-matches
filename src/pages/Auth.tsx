import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dog, Heart, ArrowLeft, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { Link } from "react-router-dom";

const emailSchema = z.string().email("Please enter a valid email");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const nameSchema = z.string().min(2, "Name must be at least 2 characters");

type AuthMode = "signin" | "signup" | "forgot";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  
  const { signUp, signIn, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/discover");
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; name?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    if (mode !== "forgot") {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
    }
    
    if (mode === "signup") {
      const nameResult = nameSchema.safeParse(name);
      if (!nameResult.success) {
        newErrors.name = nameResult.error.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleForgotPassword = async () => {
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.errors[0].message });
      return;
    }

    setIsLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
      setMode("signin");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === "forgot") {
      await handleForgotPassword();
      return;
    }
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      if (mode === "signup") {
        const { error } = await signUp(email, password, name);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Try signing in instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sign up failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Welcome to Fetch! 🐕",
            description: "Your account has been created. Let's set up your profile!",
          });
          navigate("/profile");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Sign in failed",
            description: "Invalid email or password. Please try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Welcome back! 🐕",
            description: "Ready to find your perfect match?",
          });
          navigate("/discover");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrors({});
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Dog className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  const getTitle = () => {
    switch (mode) {
      case "signup": return "Create your account";
      case "forgot": return "Reset your password";
      default: return "Welcome back, dog lover!";
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case "signup": return "Create Account";
      case "forgot": return "Send Reset Link";
      default: return "Sign In";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Back Button */}
      <div className="p-4">
        <Link to="/">
          <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {/* Auth Form */}
      <div className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Dog className="w-10 h-10 text-primary-foreground" />
              <h1 className="font-display text-4xl font-bold text-primary-foreground">fetch</h1>
            </div>
            <p className="text-primary-foreground/80">{getTitle()}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-background rounded-3xl p-8 shadow-card">
            <div className="space-y-4">
              {mode === "signup" && (
                <div>
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="What should we call you?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1"
                  />
                  {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
                </div>
              )}
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
                {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
              </div>

              {mode !== "forgot" && (
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1"
                  />
                  {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
                </div>
              )}
            </div>

            {mode === "signin" && (
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-primary hover:underline text-sm"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full mt-6" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <Dog className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === "forgot" ? (
                    <Mail className="w-5 h-5 mr-2" />
                  ) : (
                    <Heart className="w-5 h-5 mr-2" />
                  )}
                  {getButtonText()}
                </>
              )}
            </Button>

            <div className="mt-6 text-center space-y-2">
              {mode === "forgot" ? (
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="text-primary hover:underline text-sm"
                >
                  Back to sign in
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}
                  className="text-primary hover:underline text-sm"
                >
                  {mode === "signup" 
                    ? "Already have an account? Sign in" 
                    : "Don't have an account? Sign up"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
