import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Dog, Shield, AlertTriangle } from "lucide-react";

const AgeVerification = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVerified, setHasVerified] = useState<boolean | null>(null);
  
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 18 - i);
  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const getDaysInMonth = (month: string, year: string) => {
    if (!month || !year) return 31;
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  };

  const days = Array.from(
    { length: getDaysInMonth(birthMonth, birthYear) },
    (_, i) => String(i + 1).padStart(2, "0")
  );

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const checkVerification = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("age_verified_at")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data?.age_verified_at) {
        setHasVerified(true);
        navigate("/terms");
      } else {
        setHasVerified(false);
      }
    };

    checkVerification();
  }, [user, navigate]);

  const calculateAge = (birthdate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthdate.getFullYear();
    const monthDiff = today.getMonth() - birthdate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleVerify = async () => {
    if (!user || !birthMonth || !birthDay || !birthYear) {
      toast({
        title: "Missing information",
        description: "Please enter your complete date of birth.",
        variant: "destructive",
      });
      return;
    }

    const birthdate = new Date(`${birthYear}-${birthMonth}-${birthDay}`);
    const age = calculateAge(birthdate);

    if (age < 18) {
      toast({
        title: "Age Requirement Not Met",
        description: "You must be at least 18 years old to use Fetch. We're sorry, but we cannot create an account for you at this time.",
        variant: "destructive",
      });
      return;
    }

    if (age > 120) {
      toast({
        title: "Invalid date",
        description: "Please enter a valid date of birth.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({ 
        birthdate: `${birthYear}-${birthMonth}-${birthDay}`,
        age: age,
        age_verified_at: new Date().toISOString() 
      })
      .eq("user_id", user.id);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to verify your age. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    
    toast({
      title: "Age Verified",
      description: "Thank you for verifying your age.",
    });
    
    navigate("/terms");
  };

  if (loading || hasVerified === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Dog className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Dog className="w-10 h-10 text-primary-foreground" />
            <h1 className="font-display text-4xl font-bold text-primary-foreground">fetch</h1>
          </div>
          <p className="text-primary-foreground/80">Age Verification Required</p>
        </div>

        <Card className="border-border">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Verify Your Age</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Age Requirement</p>
                <p className="text-muted-foreground mt-1">
                  You must be at least 18 years old to use Fetch. This is a dating app for adults only.
                </p>
              </div>
            </div>

            {/* Date of Birth Selection */}
            <div className="space-y-4">
              <Label className="text-base">Date of Birth</Label>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="month" className="text-xs text-muted-foreground">Month</Label>
                  <Select value={birthMonth} onValueChange={setBirthMonth}>
                    <SelectTrigger id="month" className="mt-1">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="day" className="text-xs text-muted-foreground">Day</Label>
                  <Select value={birthDay} onValueChange={setBirthDay}>
                    <SelectTrigger id="day" className="mt-1">
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="year" className="text-xs text-muted-foreground">Year</Label>
                  <Select value={birthYear} onValueChange={setBirthYear}>
                    <SelectTrigger id="year" className="mt-1">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Legal Notice */}
            <p className="text-xs text-muted-foreground text-center">
              By proceeding, you confirm that the date of birth you provided is accurate. 
              Providing false information may result in account termination.
            </p>

            <Button
              onClick={handleVerify}
              disabled={!birthMonth || !birthDay || !birthYear || isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <Dog className="w-5 h-5 animate-spin" />
              ) : (
                "Verify Age & Continue"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgeVerification;
