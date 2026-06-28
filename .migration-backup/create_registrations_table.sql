-- Create registrations table to track which users joined which events
CREATE TABLE IF NOT EXISTS public.registrations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id BIGINT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_status TEXT DEFAULT 'free',
  ticket_code TEXT,
  UNIQUE(user_id, event_id)
);

-- Enable RLS
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own registrations
CREATE POLICY "Users can view own registrations"
  ON public.registrations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own registrations
CREATE POLICY "Users can create own registrations"
  ON public.registrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own registrations (leave event)
CREATE POLICY "Users can delete own registrations"
  ON public.registrations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON public.registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.registrations(event_id);
