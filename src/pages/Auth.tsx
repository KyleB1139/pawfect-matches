import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dog, Heart, ArrowLeft, Mail, Key, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { Link } from "react-router-dom";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const emailSchema = z.string().email("Please enter a valid email");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const nameSchema = z.string().min(2, "Name must be at least 2 characters");

type AuthMode = "signin" | "signup" | "forgot" | "mfa" | "backup-recovery";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [pendingSession, setPendingSession] = useState<{ accessToken: string; userId: string } | null>(null);
  
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
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          toast({
            title: "Sign in failed",
            description: "Invalid email or password. Please try again.",
            variant: "destructive",
          });
        } else if (data.session) {
          // Check if MFA is required
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const totpFactor = factorsData?.totp?.find(f => f.status === 'verified');
          
          if (totpFactor) {
            // MFA is required
            setMfaFactorId(totpFactor.id);
            setMode("mfa");
          } else {
            toast({
              title: "Welcome back! 🐕",
              description: "Ready to find your perfect match?",
            });
            navigate("/discover");
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId || mfaCode.length !== 6) return;

    setIsLoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });

      if (challengeError) {
        toast({
          title: "MFA Error",
          description: challengeError.message,
          variant: "destructive",
        });
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });

      if (verifyError) {
        toast({
          title: "Invalid code",
          description: "Please check your authenticator app and try again.",
          variant: "destructive",
        });
        setMfaCode("");
      } else {
        toast({
          title: "Welcome back! 🐕",
          description: "Ready to find your perfect match?",
        });
        navigate("/discover");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupCodeRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = backupCode.toUpperCase().replace(/\s/g, "");
    if (cleanCode.length !== 8) {
      toast({
        title: "Invalid code",
        description: "Backup codes are 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Session expired",
          description: "Please sign in again.",
          variant: "destructive",
        });
        setMode("signin");
        return;
      }

      const response = await supabase.functions.invoke("backup-codes", {
        body: { action: "recover", code: cleanCode },
      });

      if (response.error) {
        toast({
          title: "Error",
          description: "Failed to verify backup code. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (response.data.valid) {
        toast({
          title: "2FA Disabled",
          description: "Your account has been recovered. 2FA has been disabled.",
        });
        navigate("/discover");
      } else {
        toast({
          title: "Invalid code",
          description: response.data.error || "This backup code is invalid or already used.",
          variant: "destructive",
        });
        setBackupCode("");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrors({});
    setMfaCode("");
    setBackupCode("");
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
      case "mfa": return "Two-factor authentication";
      case "backup-recovery": return "Account recovery";
      default: return "Welcome back, dog lover!";
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case "signup": return "Create Account";
      case "forgot": return "Send Reset Link";
      case "mfa": return "Verify";
      case "backup-recovery": return "Recover Account";
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
          {mode === "mfa" ? (
            <form onSubmit={handleMfaVerify} className="bg-background rounded-3xl p-8 shadow-card">
              <div className="text-center mb-6">
                <Shield className="w-12 h-12 mx-auto text-primary mb-4" />
                <p className="text-muted-foreground text-sm">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div className="flex justify-center mb-6">
                <InputOTP
                  maxLength={6}
                  value={mfaCode}
                  onChange={setMfaCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={isLoading || mfaCode.length !== 6}
              >
                {isLoading ? (
                  <Dog className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    {getButtonText()}
                  </>
                )}
              </Button>

              <div className="mt-6 text-center space-y-2">
                <button
                  type="button"
                  onClick={() => switchMode("backup-recovery")}
                  className="text-primary hover:underline text-sm flex items-center justify-center gap-1 w-full"
                >
                  <Key className="w-4 h-4" />
                  Use a backup code instead
                </button>
                <button
                  type="button"
                  onClick={() => {
                    supabase.auth.signOut();
                    switchMode("signin");
                  }}
                  className="text-muted-foreground hover:underline text-sm"
                >
                  Cancel and sign out
                </button>
              </div>
            </form>
          ) : mode === "backup-recovery" ? (
            <form onSubmit={handleBackupCodeRecovery} className="bg-background rounded-3xl p-8 shadow-card">
              <div className="text-center mb-6">
                <Key className="w-12 h-12 mx-auto text-primary mb-4" />
                <p className="text-muted-foreground text-sm">
                  Enter one of your 8-character backup codes to disable 2FA and recover your account
                </p>
              </div>

              <div className="mb-6">
                <Label htmlFor="backup-code">Backup Code</Label>
                <Input
                  id="backup-code"
                  type="text"
                  placeholder="XXXXXXXX"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                  className="mt-1 text-center font-mono text-lg tracking-widest"
                  maxLength={8}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={isLoading || backupCode.length !== 8}
              >
                {isLoading ? (
                  <Dog className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Key className="w-5 h-5 mr-2" />
                    {getButtonText()}
                  </>
                )}
              </Button>

              <div className="mt-6 text-center space-y-2">
                <button
                  type="button"
                  onClick={() => switchMode("mfa")}
                  className="text-primary hover:underline text-sm"
                >
                  Back to authenticator code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    supabase.auth.signOut();
                    switchMode("signin");
                  }}
                  className="text-muted-foreground hover:underline text-sm"
                >
                  Cancel and sign out
                </button>
              </div>
            </form>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
