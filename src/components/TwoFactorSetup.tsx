import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Shield, ShieldCheck, ShieldOff, Loader2, KeyRound, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
}

export const TwoFactorSetup = () => {
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<{
    id: string;
    qr_code: string;
    secret: string;
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUnenrolling, setIsUnenrolling] = useState(false);
  
  // Backup codes state
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [remainingBackupCodes, setRemainingBackupCodes] = useState<number>(0);
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  useEffect(() => {
    fetchFactors();
  }, []);

  const fetchFactors = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setFactors(data?.totp || []);
      
      // Fetch backup codes status if 2FA is enabled
      const verifiedFactors = (data?.totp || []).filter((f) => f.status === "verified");
      if (verifiedFactors.length > 0) {
        fetchBackupCodesStatus();
      }
    } catch (error) {
      console.error("Error fetching MFA factors:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBackupCodesStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("backup-codes", {
        body: { action: "status" },
      });

      if (!error && data) {
        setRemainingBackupCodes(data.remainingCodes || 0);
      }
    } catch (error) {
      console.error("Error fetching backup codes status:", error);
    }
  };

  const generateBackupCodes = async () => {
    setIsGeneratingBackup(true);
    try {
      const { data, error } = await supabase.functions.invoke("backup-codes", {
        body: { action: "generate" },
      });

      if (error) throw error;

      setBackupCodes(data.codes);
      setShowBackupCodes(true);
      setRemainingBackupCodes(data.codes.length);
      setCopiedCodes(false);

      toast({
        title: "Backup codes generated",
        description: "Save these codes in a secure place.",
      });
    } catch (error: any) {
      toast({
        title: "Error generating backup codes",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingBackup(false);
    }
  };

  const copyBackupCodes = async () => {
    const codesText = backupCodes.join("\n");
    await navigator.clipboard.writeText(codesText);
    setCopiedCodes(true);
    toast({
      title: "Copied to clipboard",
      description: "Backup codes have been copied.",
    });
  };

  const startEnrollment = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
      });

      if (error) throw error;

      setEnrollmentData({
        id: data.id,
        qr_code: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch (error: any) {
      toast({
        title: "Error starting 2FA setup",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
      setIsEnrolling(false);
    }
  };

  const verifyEnrollment = async () => {
    if (!enrollmentData || verifyCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit code from your authenticator app.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = 
        await supabase.auth.mfa.challenge({ factorId: enrollmentData.id });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollmentData.id,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      toast({
        title: "2FA enabled",
        description: "Two-factor authentication has been set up successfully.",
      });

      setEnrollmentData(null);
      setVerifyCode("");
      setIsEnrolling(false);
      
      // Generate backup codes after successful enrollment
      await generateBackupCodes();
      fetchFactors();
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const cancelEnrollment = () => {
    setEnrollmentData(null);
    setVerifyCode("");
    setIsEnrolling(false);
  };

  const unenrollFactor = async (factorId: string) => {
    setIsUnenrolling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;

      toast({
        title: "2FA disabled",
        description: "Two-factor authentication has been removed.",
      });
      setRemainingBackupCodes(0);
      fetchFactors();
    } catch (error: any) {
      toast({
        title: "Error disabling 2FA",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsUnenrolling(false);
    }
  };

  const verifiedFactors = factors.filter((f) => f.status === "verified");
  const hasVerified2FA = verifiedFactors.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Shield className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">Two-Factor Authentication</p>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              hasVerified2FA ? "bg-green-500/10" : "bg-muted"
            }`}>
              {hasVerified2FA ? (
                <ShieldCheck className="w-5 h-5 text-green-500" />
              ) : (
                <ShieldOff className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">
                {hasVerified2FA
                  ? "Enabled - Your account is secured"
                  : "Add an extra layer of security"}
              </p>
            </div>
          </div>

          {hasVerified2FA ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={isUnenrolling}>
                  {isUnenrolling ? "Disabling..." : "Disable"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the extra security layer from your account.
                    You can always enable it again later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => unenrollFactor(verifiedFactors[0].id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Disable 2FA
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              size="sm"
              onClick={startEnrollment}
              disabled={isEnrolling}
            >
              {isEnrolling ? "Setting up..." : "Enable"}
            </Button>
          )}
        </div>
      </div>

      {/* Backup Codes Section - Only show when 2FA is enabled */}
      {hasVerified2FA && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Backup Codes</p>
                <p className="text-sm text-muted-foreground">
                  {remainingBackupCodes > 0
                    ? `${remainingBackupCodes} codes remaining`
                    : "No backup codes generated"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generateBackupCodes}
              disabled={isGeneratingBackup}
            >
              {isGeneratingBackup ? "Generating..." : remainingBackupCodes > 0 ? "Regenerate" : "Generate"}
            </Button>
          </div>
        </div>
      )}

      {/* Enrollment Dialog */}
      <Dialog open={!!enrollmentData} onOpenChange={(open) => !open && cancelEnrollment()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (like Google Authenticator or Authy)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {enrollmentData && (
              <>
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img
                    src={enrollmentData.qr_code}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                  />
                </div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    Or enter this code manually:
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                    {enrollmentData.secret}
                  </code>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Enter the 6-digit code from your app
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                    className="text-center text-lg tracking-widest"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={cancelEnrollment}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={verifyEnrollment}
                    disabled={verifyCode.length !== 6 || isVerifying}
                    className="flex-1"
                  >
                    {isVerifying ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Your Backup Codes</DialogTitle>
            <DialogDescription>
              Save these codes in a secure place. Each code can only be used once to disable 2FA if you lose access to your authenticator app.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
              {backupCodes.map((code, index) => (
                <div key={index} className="text-center py-1">
                  {code}
                </div>
              ))}
            </div>

            <Button
              onClick={copyBackupCodes}
              variant="outline"
              className="w-full"
            >
              {copiedCodes ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All Codes
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              These codes won't be shown again. Make sure to save them now.
            </p>

            <Button onClick={() => setShowBackupCodes(false)} className="w-full">
              I've Saved My Codes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
