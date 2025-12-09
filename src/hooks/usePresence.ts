import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresenceState {
  [key: string]: {
    presence_ref: string;
    user_id: string;
    profile_id: string;
    online_at: string;
  }[];
}

export const usePresence = (userId: string | null, profileId: string | null) => {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSeenUpdateRef = useRef<number>(0);

  // Update last_seen in the database
  const updateLastSeen = useCallback(async () => {
    if (!userId) return;
    
    // Throttle updates to once per minute
    const now = Date.now();
    if (now - lastSeenUpdateRef.current < 60000) return;
    lastSeenUpdateRef.current = now;

    await supabase
      .from('profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('user_id', userId);
  }, [userId]);

  useEffect(() => {
    if (!userId || !profileId) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: profileId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as PresenceState;
        const online = new Set<string>();
        
        Object.keys(state).forEach((key) => {
          online.add(key);
        });
        
        setOnlineUsers(online);
        console.log('Presence sync - online users:', Array.from(online));
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log('User joined:', key);
        setOnlineUsers((prev) => new Set([...prev, key]));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('User left:', key);
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            profile_id: profileId,
            online_at: new Date().toISOString(),
          });
          // Update last_seen when user comes online
          updateLastSeen();
        }
      });

    channelRef.current = channel;

    // Update last_seen periodically while user is active
    const interval = setInterval(updateLastSeen, 60000);

    // Update last_seen on page visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateLastSeen();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Update last_seen when leaving
      updateLastSeen();
      channel.unsubscribe();
      channelRef.current = null;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, profileId, updateLastSeen]);

  const isUserOnline = (profileId: string) => onlineUsers.has(profileId);

  return { onlineUsers, isUserOnline };
};
