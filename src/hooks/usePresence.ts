import { useState, useEffect, useRef } from 'react';
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
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [userId, profileId]);

  const isUserOnline = (profileId: string) => onlineUsers.has(profileId);

  return { onlineUsers, isUserOnline };
};
