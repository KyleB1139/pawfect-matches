import { useEffect, useState, type ImgHTMLAttributes, type ComponentProps } from "react";
import { AvatarImage } from "@/components/ui/avatar";
import { getSignedPhotoUrl, parseStorageUrl } from "@/lib/signedPhotos";

export function useSignedUrl(src: string | null | undefined): string | undefined {
  const [signed, setSigned] = useState<string | undefined>(() =>
    src && !parseStorageUrl(src) ? src : undefined
  );

  useEffect(() => {
    if (src && !parseStorageUrl(src)) {
      setSigned(src);
      return;
    }
    let alive = true;
    getSignedPhotoUrl(src).then((u) => {
      if (alive) setSigned(u);
    });
    return () => {
      alive = false;
    };
  }, [src]);

  return signed;
}

// Drop-in replacement for <img> that signs Supabase Storage URLs.
export function SignedImg(props: ImgHTMLAttributes<HTMLImageElement>) {
  const { src, ...rest } = props;
  const signed = useSignedUrl(src);
  return <img src={signed} {...rest} />;
}

// Drop-in replacement for shadcn <AvatarImage>.
export function SignedAvatarImage(props: ComponentProps<typeof AvatarImage>) {
  const { src, ...rest } = props;
  const signed = useSignedUrl(src ?? undefined);
  return <AvatarImage src={signed} {...rest} />;
}
