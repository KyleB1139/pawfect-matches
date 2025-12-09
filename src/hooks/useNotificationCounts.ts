import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useNotificationCounts = () => {
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [newMatches, setNewMatches] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      setNewMatches(0);
      return;
    }

    const fetchCounts = async () => {
      // Get user's profile id
      const { data: profileData } = await supabase
        .rpc('get_user_profile_id', { _user_id: user.id });

      if (!profileData) return;

      const profileId = profileData;

      // Get unread messages count
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .neq('sender_id', profileId)
        .is('read_at', null);

      setUnreadMessages(messageCount || 0);

      // Get matches from last 7 days as "new"
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: matches } = await supabase
        .rpc('get_user_matches', { _user_id: user.id });

      const recentMatches = matches?.filter(
        (m: { matched_at: string }) => new Date(m.matched_at) > sevenDaysAgo
      );

      setNewMatches(recentMatches?.length || 0);
    };

    fetchCounts();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('nav-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchCounts()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => fetchCounts()
      )
      .subscribe();

    // Subscribe to new likes (for match detection)
    const likesChannel = supabase
      .channel('nav-likes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'likes' },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(likesChannel);
    };
  }, [user]);

  return { unreadMessages, newMatches };
};
