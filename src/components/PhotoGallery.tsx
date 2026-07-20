import { useState, useRef } from "react";
import { SignedImg } from "@/components/SignedImg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Plus, X, Star, Loader2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface Photo {
  id: string;
  photo_url: string;
  display_order: number;
  is_primary: boolean;
}

interface PhotoGalleryProps {
  userId: string;
  profileId: string;
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  maxPhotos?: number;
}

export const PhotoGallery = ({
  userId,
  profileId,
  photos,
  onPhotosChange,
  maxPhotos = 6,
}: PhotoGalleryProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > maxPhotos) {
      toast({
        title: "Too many photos",
        description: `You can only upload up to ${maxPhotos} photos.`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const newPhotos: Photo[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!file.type.startsWith("image/")) {
          toast({
            title: "Invalid file type",
            description: "Please upload only image files.",
            variant: "destructive",
          });
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Images must be under 5MB.",
            variant: "destructive",
          });
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${i}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast({
            title: "Upload failed",
            description: "Failed to upload photo. Please try again.",
            variant: "destructive",
          });
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("profile-photos")
          .getPublicUrl(filePath);

        const displayOrder = photos.length + newPhotos.length;
        const isPrimary = photos.length === 0 && newPhotos.length === 0;

        const { data: photoData, error: insertError } = await supabase
          .from("profile_photos")
          .insert({
            profile_id: profileId,
            photo_url: urlData.publicUrl,
            display_order: displayOrder,
            is_primary: isPrimary,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Insert error:", insertError);
          continue;
        }

        newPhotos.push(photoData);
      }

      if (newPhotos.length > 0) {
        onPhotosChange([...photos, ...newPhotos]);
        toast({
          title: "Photos uploaded",
          description: `${newPhotos.length} photo(s) added to your gallery.`,
        });
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (photo: Photo) => {
    setDeletingId(photo.id);

    try {
      // Extract file path from URL
      const urlParts = photo.photo_url.split("/profile-photos/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("profile-photos").remove([filePath]);
      }

      const { error } = await supabase
        .from("profile_photos")
        .delete()
        .eq("id", photo.id);

      if (error) throw error;

      const updatedPhotos = photos.filter((p) => p.id !== photo.id);
      
      // If we deleted the primary photo, make the first remaining photo primary
      if (photo.is_primary && updatedPhotos.length > 0) {
        const newPrimaryId = updatedPhotos[0].id;
        await supabase
          .from("profile_photos")
          .update({ is_primary: true })
          .eq("id", newPrimaryId);
        updatedPhotos[0].is_primary = true;
      }

      onPhotosChange(updatedPhotos);
      toast({
        title: "Photo deleted",
        description: "The photo has been removed from your gallery.",
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetPrimary = async (photo: Photo) => {
    if (photo.is_primary) return;

    try {
      // Remove primary from all photos
      await supabase
        .from("profile_photos")
        .update({ is_primary: false })
        .eq("profile_id", profileId);

      // Set new primary
      await supabase
        .from("profile_photos")
        .update({ is_primary: true })
        .eq("id", photo.id);

      const updatedPhotos = photos.map((p) => ({
        ...p,
        is_primary: p.id === photo.id,
      }));

      onPhotosChange(updatedPhotos);
      toast({
        title: "Primary photo set",
        description: "This photo will be shown first on your profile.",
      });
    } catch (error) {
      console.error("Set primary error:", error);
      toast({
        title: "Error",
        description: "Failed to set primary photo.",
        variant: "destructive",
      });
    }
  };

  const sortedPhotos = [...photos].sort((a, b) => {
    if (a.is_primary) return -1;
    if (b.is_primary) return 1;
    return a.display_order - b.display_order;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-foreground">Photo Gallery</h3>
          <p className="text-sm text-muted-foreground">
            Add up to {maxPhotos} photos. The primary photo appears first.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {photos.length}/{maxPhotos}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {sortedPhotos.map((photo) => (
          <div
            key={photo.id}
            className={cn(
              "relative aspect-square rounded-xl overflow-hidden group border-2",
              photo.is_primary ? "border-primary" : "border-transparent"
            )}
          >
            <SignedImg
              src={photo.photo_url}
              alt="Profile photo"
              className="w-full h-full object-cover"
            />
            
            {/* Primary badge */}
            {photo.is_primary && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" />
                Primary
              </div>
            )}

            {/* Overlay actions */}
            <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {!photo.is_primary && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleSetPrimary(photo)}
                  className="h-8"
                >
                  <Star className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(photo)}
                disabled={deletingId === photo.id}
                className="h-8"
              >
                {deletingId === photo.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        ))}

        {/* Add photo button */}
        {photos.length < maxPhotos && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
          >
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Plus className="w-6 h-6" />
                <span className="text-xs">Add Photo</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
