import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Dog, Shield, Eye, Database, Bell, Users, Lock, FileText, Scale } from "lucide-react";

const TermsOfService = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const checkTermsAcceptance = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("terms_accepted_at")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data?.terms_accepted_at) {
        setHasAccepted(true);
        navigate("/discover");
      } else {
        setHasAccepted(false);
      }
    };

    checkTermsAcceptance();
  }, [user, navigate]);

  const handleAccept = async () => {
    if (!user || !agreed) return;
    
    setIsSubmitting(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({ terms_accepted_at: new Date().toISOString() })
      .eq("user_id", user.id);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to save your agreement. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    
    toast({
      title: "Welcome to Fetch!",
      description: "Thank you for agreeing to our terms.",
    });
    
    navigate("/discover");
  };

  if (loading || hasAccepted === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Dog className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-gradient mb-2">fetch</h1>
          <h2 className="text-2xl font-semibold text-foreground">Terms of Service & Privacy Policy</h2>
          <p className="text-muted-foreground mt-2">
            Please review and accept our terms to continue using Fetch
          </p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Legal Agreement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-8 text-sm text-muted-foreground">
                {/* Last Updated */}
                <p className="text-xs">
                  <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>

                {/* Introduction */}
                <section>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Scale className="w-4 h-4 text-primary" />
                    1. Introduction and Acceptance
                  </h3>
                  <p className="mb-2">
                    Welcome to Fetch ("the App," "we," "us," or "our"). By creating an account, accessing, or using our dating application designed for dog owners and dog lovers, you agree to be bound by these Terms of Service ("Terms") and our Privacy Policy.
                  </p>
                  <p className="mb-2">
                    If you do not agree to these Terms, you must not access or use the App. We reserve the right to modify these Terms at any time. Continued use of the App after any modifications indicates your acceptance of the updated Terms.
                  </p>
                  <p>
                    You must be at least 18 years of age to use this App. By using Fetch, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into these Terms.
                  </p>
                </section>

                {/* Data Collection */}
                <section>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Database className="w-4 h-4 text-primary" />
                    2. Data Collection and Usage
                  </h3>
                  <p className="mb-3">We collect and process the following categories of personal information:</p>
                  
                  <h4 className="font-medium text-foreground mb-2">2.1 Information You Provide</h4>
                  <ul className="list-disc pl-5 space-y-1 mb-3">
                    <li>Account information (name, email address, password)</li>
                    <li>Profile information (age, gender, bio, photos)</li>
                    <li>Dog information (name, breed, age, photos, temperament)</li>
                    <li>Preferences (age range, location preferences, interested in)</li>
                    <li>Communications (messages sent through the App)</li>
                  </ul>

                  <h4 className="font-medium text-foreground mb-2">2.2 Information Collected Automatically</h4>
                  <ul className="list-disc pl-5 space-y-1 mb-3">
                    <li>Device information (device type, operating system, unique device identifiers)</li>
                    <li>Log data (access times, pages viewed, app crashes)</li>
                    <li>Location data (precise GPS location when enabled, IP-based location)</li>
                    <li>Usage data (features used, interactions, swipes, matches, messages)</li>
                    <li>Cookies and similar tracking technologies</li>
                  </ul>

                  <h4 className="font-medium text-foreground mb-2">2.3 How We Use Your Data</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>To provide and improve our matching algorithms</li>
                    <li>To personalize your experience and show relevant profiles</li>
                    <li>To communicate with you about your account and updates</li>
                    <li>To ensure safety and prevent fraud</li>
                    <li>To comply with legal obligations</li>
                    <li>For analytics and service improvement</li>
                  </ul>
                </section>

                {/* Location Services */}
                <section>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Eye className="w-4 h-4 text-primary" />
                    3. Location Services and Tracking
                  </h3>
                  <p className="mb-2">
                    Fetch uses location services to provide distance-based matching features. When you enable location services, we collect your precise GPS coordinates to:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 mb-3">
                    <li>Show you profiles of users near your location</li>
                    <li>Display your distance from other users</li>
                    <li>Enable location-based filters and preferences</li>
                    <li>Improve our matching algorithms</li>
                  </ul>
                  <p className="mb-2">
                    You can disable location services at any time through your device settings, but this may limit certain features of the App.
                  </p>
                  <p>
                    We may also use background location tracking if you have enabled this feature, to update your location even when the App is not actively in use.
                  </p>
                </section>

                {/* User Conduct */}
                <section>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-primary" />
                    4. User Conduct and Community Guidelines
                  </h3>
                  <p className="mb-2">By using Fetch, you agree to:</p>
                  <ul className="list-disc pl-5 space-y-1 mb-3">
                    <li>Provide accurate and truthful information in your profile</li>
                    <li>Use only your own photos and not impersonate others</li>
                    <li>Treat other users with respect and dignity</li>
                    <li>Not harass, threaten, or abuse other users</li>
                    <li>Not use the App for commercial purposes or solicitation</li>
                    <li>Not share illegal, harmful, or offensive content</li>
                    <li>Not attempt to circumvent any security measures</li>
                    <li>Report any suspicious or abusive behavior</li>
                  </ul>
                  <p>
                    Violation of these guidelines may result in immediate account suspension or termination without notice.
                  </p>
                </section>

                {/* Privacy and Security */}
                <section>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-primary" />
                    5. Privacy and Data Security
                  </h3>
                  <p className="mb-2">
                    We implement industry-standard security measures to protect your personal information, including:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 mb-3">
                    <li>Encryption of data in transit and at rest</li>
                    <li>Secure authentication protocols</li>
                    <li>Regular security audits and updates</li>
                    <li>Access controls and employee training</li>
                  </ul>
                  <p className="mb-2">
                    While we strive to protect your data, no method of transmission over the internet is 100% secure. You are responsible for maintaining the confidentiality of your account credentials.
                  </p>
                </section>

                {/* Data Sharing */}
                <section>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-primary" />
                    6. Data Sharing and Third Parties
                  </h3>
                  <p className="mb-2">We may share your information with:</p>
                  <ul className="list-disc pl-5 space-y-1 mb-3">
                    <li><strong>Other Users:</strong> Your profile information is visible to other Fetch users</li>
                    <li><strong>Service Providers:</strong> Third parties who help us operate the App (hosting, analytics, customer support)</li>
                    <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                    <li><strong>Safety:</strong> To protect the rights, property, or safety of our users</li>
                    <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                  </ul>
                  <p>
                    We do not sell your personal information to third parties for marketing purposes.
                  </p>
                </section>

                {/* Notifications */}
                <section>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Bell className="w-4 h-4 text-primary" />
                    7. Communications and Notifications
                  </h3>
                  <p className="mb-2">By using Fetch, you agree to receive:</p>
                  <ul className="list-disc pl-5 space-y-1 mb-3">
                    <li>Push notifications about matches, messages, and likes</li>
                    <li>Email communications about your account and important updates</li>
                    <li>In-app notifications and alerts</li>
                    <li>Promotional communications (which you can opt out of)</li>
                  </ul>
                  <p>
                    You can manage your notification preferences in your account settings.
                  </p>
                </section>

                {/* Your Rights */}
                <section>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                    8. Your Rights and Choices
                  </h3>
                  <p className="mb-2">Depending on your location, you may have the right to:</p>
                  <ul className="list-disc pl-5 space-y-1 mb-3">
                    <li><strong>Access:</strong> Request a copy of your personal data</li>
                    <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                    <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                    <li><strong>Portability:</strong> Receive your data in a portable format</li>
                    <li><strong>Opt-out:</strong> Opt out of certain data processing activities</li>
                    <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing</li>
                  </ul>
                  <p>
                    To exercise these rights, please contact us through the App settings or at our support email.
                  </p>
                </section>

                {/* Data Retention */}
                <section>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                    9. Data Retention
                  </h3>
                  <p className="mb-2">
                    We retain your personal information for as long as your account is active or as needed to provide you services. After account deletion:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 mb-3">
                    <li>Profile data is deleted within 30 days</li>
                    <li>Messages may be retained for up to 90 days for safety purposes</li>
                    <li>Some data may be retained longer for legal compliance</li>
                    <li>Anonymized data may be retained for analytics purposes</li>
                  </ul>
                </section>

                {/* Disclaimers */}
                <section>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                    10. Disclaimers and Limitations
                  </h3>
                  <p className="mb-2">
                    THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 mb-3">
                    <li>That you will find a match or make connections</li>
                    <li>The accuracy of information provided by other users</li>
                    <li>The behavior or conduct of other users</li>
                    <li>Uninterrupted or error-free service</li>
                  </ul>
                  <p className="mb-2">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE APP.
                  </p>
                  <p>
                    You use the App at your own risk. We recommend meeting in public places and exercising caution when meeting people from the internet.
                  </p>
                </section>

                {/* Termination */}
                <section>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                    11. Account Termination
                  </h3>
                  <p className="mb-2">
                    You may delete your account at any time through the App settings. We reserve the right to suspend or terminate your account if:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>You violate these Terms or Community Guidelines</li>
                    <li>We suspect fraudulent or illegal activity</li>
                    <li>Your behavior poses a risk to other users</li>
                    <li>Required by law or legal process</li>
                  </ul>
                </section>

                {/* Governing Law */}
                <section>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                    12. Governing Law and Disputes
                  </h3>
                  <p className="mb-2">
                    These Terms shall be governed by and construed in accordance with applicable laws. Any disputes arising from these Terms or your use of the App shall be resolved through binding arbitration, except where prohibited by law.
                  </p>
                  <p>
                    You agree to waive any right to participate in class action lawsuits against us.
                  </p>
                </section>

                {/* Contact */}
                <section>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                    13. Contact Us
                  </h3>
                  <p>
                    If you have questions about these Terms or our privacy practices, please contact us through the App settings or reach out to our support team. We will respond to your inquiry within a reasonable timeframe.
                  </p>
                </section>

                {/* Final Agreement */}
                <section className="pt-4 border-t border-border">
                  <p className="text-foreground font-medium">
                    By checking the box below and clicking "I Agree," you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and Privacy Policy.
                  </p>
                </section>
              </div>
            </ScrollArea>

            {/* Agreement Checkbox and Button */}
            <div className="mt-6 pt-6 border-t border-border space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                  className="mt-1"
                />
                <label
                  htmlFor="agree"
                  className="text-sm text-foreground cursor-pointer leading-relaxed"
                >
                  I have read, understood, and agree to the Terms of Service and Privacy Policy. I understand that my data will be collected and processed as described above.
                </label>
              </div>

              <Button
                onClick={handleAccept}
                disabled={!agreed || isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <Dog className="w-5 h-5 animate-spin" />
                ) : (
                  "I Agree - Continue to Fetch"
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                You can review these terms at any time in your account settings
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;
