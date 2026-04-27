import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import { usePresence } from "@/hooks/usePresence";
import { Dog, ArrowLeft, Send, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProfileData } from "./Discover";

const formatLastActive = (lastSeen: string | null | undefined, isOnline: boolean): string => {
  if (isOnline) return "Online now";
  if (!lastSeen) return "Recently";
  
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return lastSeenDate.toLocaleDateString();
};

const OnlineIndicator = ({ isOnline }: { isOnline: boolean }) => (
  <span
    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
      isOnline ? "bg-green-500" : "bg-muted-foreground/40"
    }`}
  />
);

interface ConversationProfile extends ProfileData {
  last_seen?: string | null;
}

interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  created_at: string;
  updated_at: string;
  other_profile: ConversationProfile;
  last_message?: Message;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

const Messages = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { isUserOnline } = usePresence(user?.id || null, userProfileId);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  useEffect(() => {
    if (userProfileId) {
      fetchConversations();
    }
  }, [userProfileId]);

  useEffect(() => {
    if (activeConversation && userProfileId) {
      fetchMessages(activeConversation.id);
      markMessagesAsRead(activeConversation.id);
      setIsOtherTyping(false);
      
      // Subscribe to new messages and read status updates
      const messagesChannel = supabase
        .channel(`messages:${activeConversation.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${activeConversation.id}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages((prev) => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            // Mark new incoming messages as read immediately
            if (newMsg.sender_id !== userProfileId) {
              markMessagesAsRead(activeConversation.id);
              setIsOtherTyping(false); // They sent a message, so they stopped typing
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${activeConversation.id}`,
          },
          (payload) => {
            const updatedMsg = payload.new as Message;
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
            );
          }
        )
        .subscribe();

      // Subscribe to typing indicators
      const typingChannel = supabase
        .channel(`typing:${activeConversation.id}`)
        .on('broadcast', { event: 'typing' }, (payload) => {
          if (payload.payload.userId !== userProfileId) {
            setIsOtherTyping(payload.payload.isTyping);
          }
        })
        .subscribe();
      
      typingChannelRef.current = typingChannel;

      return () => {
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(typingChannel);
        typingChannelRef.current = null;
      };
    }
  }, [activeConversation, userProfileId]);

  const markMessagesAsRead = async (conversationId: string) => {
    if (!userProfileId) return;
    
    // Mark all unread messages from other users as read
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userProfileId)
      .is('read_at', null);
  };

  const sendTypingIndicator = (isTyping: boolean) => {
    if (!typingChannelRef.current || !userProfileId) return;
    
    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: userProfileId, isTyping },
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator
    sendTypingIndicator(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (!error && data) {
      setUserProfileId(data.id);
    }
  };

  const fetchConversations = async () => {
    if (!userProfileId) return;
    
    setIsLoading(true);
    
    const { data: convos, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant_1_id.eq.${userProfileId},participant_2_id.eq.${userProfileId}`)
      .order("updated_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching conversations:", error);
      setIsLoading(false);
      return;
    }

    if (!convos || convos.length === 0) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    // Fetch other participants' profiles
    const otherProfileIds = convos.map(c => 
      c.participant_1_id === userProfileId ? c.participant_2_id : c.participant_1_id
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*, last_seen")
      .in("id", otherProfileIds);

    // Fetch last message for each conversation
    const conversationsWithProfiles: Conversation[] = await Promise.all(
      convos.map(async (convo) => {
        const otherId = convo.participant_1_id === userProfileId 
          ? convo.participant_2_id 
          : convo.participant_1_id;
        
        const otherProfile = profiles?.find(p => p.id === otherId);
        
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", convo.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...convo,
          other_profile: otherProfile as ProfileData,
          last_message: lastMsg || undefined,
        };
      })
    );

    setConversations(conversationsWithProfiles);
    setIsLoading(false);
  };

  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    
    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !userProfileId) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    
    // Stop typing indicator when sending
    sendTypingIndicator(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: activeConversation.id,
        sender_id: userProfileId,
        content: messageContent,
      });

    if (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to send message",
        variant: "destructive",
      });
      setNewMessage(messageContent);
      return;
    }

    // Update conversation timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", activeConversation.id);

    // Send push notification to recipient
    try {
      const recipientProfileId = activeConversation.participant_1_id === userProfileId
        ? activeConversation.participant_2_id
        : activeConversation.participant_1_id;

      // Get the recipient's user_id from their profile
      const { data: recipientProfile } = await supabase
        .from("profiles")
        .select("user_id, name")
        .eq("id", recipientProfileId)
        .single();

      if (recipientProfile) {
        // Get sender name
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("dog_name, name")
          .eq("id", userProfileId)
          .single();

        const senderName = senderProfile?.dog_name || senderProfile?.name || "Someone";

        await supabase.functions.invoke("send-push-notification", {
          body: {
            userId: recipientProfile.user_id,
            title: `New message from ${senderName}`,
            body: messageContent.length > 50 ? messageContent.substring(0, 50) + "..." : messageContent,
            url: "/messages",
          },
        });
      }
    } catch (pushError) {
      console.error("Failed to send push notification:", pushError);
      // Don't show error to user - push notification is non-critical
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Dog className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  // Chat view
  if (activeConversation) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Chat Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveConversation(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="relative">
              <img
                src={activeConversation.other_profile?.dog_photo_url || activeConversation.other_profile?.avatar_url || "/placeholder.svg"}
                alt={activeConversation.other_profile?.dog_name || ""}
                className="w-10 h-10 rounded-full object-cover border border-border"
              />
              <OnlineIndicator isOnline={isUserOnline(activeConversation.other_profile?.id || '')} />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground">
                {activeConversation.other_profile?.dog_name || activeConversation.other_profile?.name}
              </h2>
              <p className={`text-xs ${isUserOnline(activeConversation.other_profile?.id || '') ? 'text-green-600' : 'text-muted-foreground'}`}>
                {formatLastActive(activeConversation.other_profile?.last_seen, isUserOnline(activeConversation.other_profile?.id || ''))}
              </p>
            </div>
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="max-w-md mx-auto space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_id === userProfileId ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                    msg.sender_id === userProfileId
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <div className={`flex items-center justify-end gap-1 mt-1 ${
                    msg.sender_id === userProfileId ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}>
                    <span className="text-xs">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.sender_id === userProfileId && (
                      msg.read_at ? (
                        <CheckCheck className="w-4 h-4 text-primary-foreground" />
                      ) : (
                        <Check className="w-4 h-4 text-primary-foreground/50" />
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing indicator */}
            {isOtherTyping && (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground px-4 py-2 rounded-2xl rounded-bl-md">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="sticky bottom-0 bg-background border-t border-border p-4">
          <div className="max-w-md mx-auto flex gap-2">
            <Input
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button onClick={sendMessage} size="icon" disabled={!newMessage.trim()}>
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Conversations list
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-center">
          <h1 className="font-display text-2xl font-bold text-gradient">Messages</h1>
        </div>
      </header>

      {/* Conversations List */}
      <main className="max-w-md mx-auto px-4 py-4">
        {conversations.length > 0 ? (
          <div className="space-y-2">
            {conversations.map((convo) => (
              <Card
                key={convo.id}
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setActiveConversation(convo)}
              >
                <div className="relative">
                  <img
                    src={convo.other_profile?.dog_photo_url || convo.other_profile?.avatar_url || "/placeholder.svg"}
                    alt={convo.other_profile?.dog_name || ""}
                    className="w-14 h-14 rounded-full object-cover border-2 border-border"
                  />
                  <OnlineIndicator isOnline={isUserOnline(convo.other_profile?.id || '')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {convo.other_profile?.dog_name || convo.other_profile?.name}
                    </h3>
                    <span className={`text-xs shrink-0 ${isUserOnline(convo.other_profile?.id || '') ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {formatLastActive(convo.other_profile?.last_seen, isUserOnline(convo.other_profile?.id || ''))}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {convo.last_message?.content || "Start a conversation!"}
                  </p>
                </div>
                {convo.last_message && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(convo.last_message.created_at).toLocaleDateString()}
                  </span>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 space-y-4">
            <Dog className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">No messages yet</h2>
            <p className="text-muted-foreground">
              Match with someone to start chatting!
            </p>
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
};

export default Messages;