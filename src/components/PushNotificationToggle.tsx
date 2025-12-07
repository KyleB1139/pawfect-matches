import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';

export function PushNotificationToggle() {
  const { permission, isSubscribed, isSupported, loading, subscribe, unsubscribe } = usePushNotifications();
  const { toast } = useToast();

  if (!isSupported) {
    return null;
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast({
          title: 'Notifications disabled',
          description: 'You will no longer receive push notifications.',
        });
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast({
          title: 'Notifications enabled',
          description: 'You will now receive push notifications for new messages and matches.',
        });
      } else if (permission === 'denied') {
        toast({
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={loading}
      className="relative"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="h-5 w-5 text-primary" />
      ) : (
        <BellOff className="h-5 w-5 text-muted-foreground" />
      )}
    </Button>
  );
}
