import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical, UserX, Ban } from "lucide-react";

interface MatchActionsProps {
  matchId: string;
  matchName: string;
  userProfileId: string;
  onActionComplete: () => void;
}

const MatchActions = ({
  matchId,
  matchName,
  userProfileId,
  onActionComplete,
}: MatchActionsProps) => {
  const [showUnmatchDialog, setShowUnmatchDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUnmatch = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.from("unmatches").insert({
        user_id: userProfileId,
        unmatched_profile_id: matchId,
      });

      if (error) throw error;

      toast({
        title: "Unmatched",
        description: `You've unmatched with ${matchName}.`,
      });
      onActionComplete();
    } catch (error) {
      console.error("Error unmatching:", error);
      toast({
        title: "Error",
        description: "Failed to unmatch. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setShowUnmatchDialog(false);
    }
  };

  const handleBlock = async () => {
    setIsProcessing(true);
    try {
      // Block also unmatches
      await supabase.from("unmatches").insert({
        user_id: userProfileId,
        unmatched_profile_id: matchId,
      });

      const { error } = await supabase.from("blocks").insert({
        user_id: userProfileId,
        blocked_profile_id: matchId,
      });

      if (error) throw error;

      toast({
        title: "User blocked",
        description: `${matchName} has been blocked and won't appear anywhere.`,
      });
      onActionComplete();
    } catch (error) {
      console.error("Error blocking:", error);
      toast({
        title: "Error",
        description: "Failed to block user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setShowBlockDialog(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowUnmatchDialog(true)}>
            <UserX className="w-4 h-4 mr-2" />
            Unmatch
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowBlockDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Ban className="w-4 h-4 mr-2" />
            Block User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Unmatch Dialog */}
      <AlertDialog open={showUnmatchDialog} onOpenChange={setShowUnmatchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unmatch with {matchName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {matchName} from your matches. They won't be
              notified, but you won't be able to message each other anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnmatch}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "Unmatching..." : "Unmatch"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {matchName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently hide {matchName} from everywhere in the app.
              They won't be able to see you either. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "Blocking..." : "Block User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MatchActions;
