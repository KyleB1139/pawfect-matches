import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Heart, Star, MapPin, Dog, ChevronLeft, ChevronRight, MoreVertical, Ban, Briefcase, GraduationCap, Ruler, Wine, Cigarette, Baby, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
interface ProfilePhoto {
  id: string;
  photo_url: string;
  is_primary: boolean;
  display_order: number;
}

interface ProfilePreviewData {
  id: string;
  name: string;
  age: number | null;
  avatar_url: string | null;
  location: string | null;
  bio: string | null;
  gender?: string | null;
  dog_name?: string | null;
  dog_breed?: string | null;
  dog_age?: number | null;
  dog_photo_url?: string | null;
  dog_friendly?: boolean | null;
  dog_friendly_with?: string[] | null;
  looking_for?: string[] | null;
  lifestyle?: string[] | null;
  occupation?: string | null;
  education?: string | null;
  height_cm?: number | null;
  drinking?: string | null;
  smoking?: string | null;
  has_kids?: string | null;
  wants_kids?: string | null;
  interests?: string[] | null;
  photos?: ProfilePhoto[];
}

interface ProfilePreviewDialogProps {
  profile: ProfilePreviewData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLikeBack?: () => void;
  isSuperLike?: boolean;
  showLikeButton?: boolean;
  userProfileId?: string;
  onBlock?: () => void;
  compatibility?: number;
}

const ProfilePreviewDialog = ({
  profile,
  open,
  onOpenChange,
  onLikeBack,
  isSuperLike = false,
  showLikeButton = true,
  userProfileId,
  onBlock,
  compatibility,
}: ProfilePreviewDialogProps) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!profile) return null;

  const handleBlock = async () => {
    if (!userProfileId) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase.from("blocks").insert({
        user_id: userProfileId,
        blocked_profile_id: profile.id,
      });

      if (error) throw error;

      toast({
        title: "User blocked",
        description: `${profile.name} has been blocked and won't appear anywhere.`,
      });
      
      onBlock?.();
      onOpenChange(false);
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

  // Build array of all images
  const allImages = (() => {
    const images: string[] = [];
    
    if (profile.photos && profile.photos.length > 0) {
      const sortedPhotos = [...profile.photos].sort((a, b) => {
        if (a.is_primary) return -1;
        if (b.is_primary) return 1;
        return a.display_order - b.display_order;
      });
      images.push(...sortedPhotos.map(p => p.photo_url));
    }
    
    if (profile.avatar_url && !images.includes(profile.avatar_url)) {
      images.push(profile.avatar_url);
    }
    
    if (profile.dog_photo_url && !images.includes(profile.dog_photo_url)) {
      images.push(profile.dog_photo_url);
    }
    
    if (images.length === 0) {
      images.push("/placeholder.svg");
    }
    
    return images;
  })();

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-0 overflow-hidden max-h-[90vh]">
          <ScrollArea className="max-h-[90vh]">
            {/* Photo Section */}
            <div className="relative aspect-square">
              <img
                src={allImages[currentPhotoIndex]}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
              
              {/* Photo Navigation Dots */}
              {allImages.length > 1 && (
                <div className="absolute top-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                  {allImages.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "h-1 rounded-full transition-all duration-200",
                        index === currentPhotoIndex 
                          ? "w-6 bg-primary-foreground" 
                          : "w-1.5 bg-primary-foreground/50"
                      )}
                    />
                  ))}
                </div>
              )}

              {/* Photo Navigation Arrows */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrevPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-foreground/40 transition-colors z-10"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNextPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-foreground/40 transition-colors z-10"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Actions Menu */}
              {userProfileId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-foreground/40 transition-colors z-10">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setShowBlockDialog(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Block User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Super Like Badge */}
              {isSuperLike && !userProfileId && (
                <Badge 
                  className="absolute top-4 right-4 bg-blue-500 text-white border-none"
                >
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Super Liked You
                </Badge>
              )}
              
              {isSuperLike && userProfileId && (
                <Badge 
                  className="absolute top-4 right-16 bg-blue-500 text-white border-none"
                >
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Super Liked You
                </Badge>
              )}

              {/* Gradient Overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
            </div>

            {/* Profile Info */}
            <div className="p-6 -mt-8 relative">
              {/* Name & Age */}
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">
                  {profile.name}{profile.age ? `, ${profile.age}` : ""}
                </h2>
                {profile.gender && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {profile.gender === "man" ? "♂ Man" : profile.gender === "woman" ? "♀ Woman" : "Other"}
                  </Badge>
                )}
                {typeof compatibility === "number" && (
                  <Badge
                    className={cn(
                      "ml-auto",
                      compatibility >= 75
                        ? "bg-sage/40 text-secondary-foreground border-none"
                        : compatibility >= 50
                        ? "bg-accent/40 text-accent-foreground border-none"
                        : "bg-muted text-muted-foreground border-none"
                    )}
                  >
                    {compatibility}% match
                  </Badge>
                )}
              </div>

              {/* Location */}
              {profile.location && (
                <div className="flex items-center gap-1 text-muted-foreground mb-4">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{profile.location}</span>
                </div>
              )}

              {/* Bio */}
              {profile.bio && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-1">About</h3>
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                </div>
              )}

              {/* Looking For */}
              {profile.looking_for && profile.looking_for.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2">Looking For</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.looking_for.map((item) => (
                      <Badge key={item} variant="secondary" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Lifestyle */}
              {profile.lifestyle && profile.lifestyle.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2">Lifestyle</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.lifestyle.map((item) => (
                      <Badge key={item} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Dog Info */}
              {profile.dog_name && (
                <div className="p-4 bg-muted/50 rounded-xl mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Dog className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">
                      {profile.dog_name}
                      {profile.dog_age ? ` • ${profile.dog_age} years old` : ""}
                    </h3>
                  </div>
                  {profile.dog_breed && (
                    <Badge variant="secondary" className="mb-2">
                      {profile.dog_breed}
                    </Badge>
                  )}
                  {profile.dog_friendly_with && profile.dog_friendly_with.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-xs text-muted-foreground mr-1">Friendly with:</span>
                      {profile.dog_friendly_with.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Like Back Button */}
              {showLikeButton && onLikeBack && (
                <Button 
                  onClick={() => {
                    onLikeBack();
                    onOpenChange(false);
                  }}
                  className="w-full"
                  size="lg"
                >
                  <Heart className="w-5 h-5 mr-2" />
                  Like Back
                </Button>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {profile.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently hide {profile.name} from everywhere in the app.
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

export default ProfilePreviewDialog;