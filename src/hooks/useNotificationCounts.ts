import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useNotificationCounts = () => {
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [newMatches, setNewMatches] = useState(0);
  const [newLikes, setNewLikes] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      setNewMatches(0);
      setNewLikes(0);
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

      // Get last viewed time for matches
      const { data: matchView } = await supabase
        .from('match_views')
        .select('last_viewed_at')
        .eq('user_id', user.id)
        .maybeSingle();

      const lastViewed = matchView?.last_viewed_at 
        ? new Date(matchView.last_viewed_at) 
        : new Date(0); // If never viewed, show all as new

      const { data: matches } = await supabase
        .rpc('get_user_matches', { _user_id: profileId });

      const unseenMatches = matches?.filter(
        (m: { matched_at: string }) => new Date(m.matched_at) > lastViewed
      );

      setNewMatches(unseenMatches?.length || 0);

      // Count likes and super likes on user's profile
      const { count: likesCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('liked_profile_id', profileId);

      const { count: superLikesCount } = await supabase
        .from('super_likes')
        .select('*', { count: 'exact', head: true })
        .eq('liked_profile_id', profileId);

      setNewLikes((likesCount || 0) + (superLikesCount || 0));
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
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'super_likes' },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(likesChannel);
    };
  }, [user]);

  return { unreadMessages, newMatches, newLikes };
};
