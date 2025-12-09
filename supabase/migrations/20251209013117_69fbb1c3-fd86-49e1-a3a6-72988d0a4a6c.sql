-- Allow conversation participants to mark messages as read
CREATE POLICY "Users can mark messages as read in their conversations"
ON public.messages
FOR UPDATE
USING (is_conversation_participant(auth.uid(), conversation_id))
WITH CHECK (is_conversation_participant(auth.uid(), conversation_id));