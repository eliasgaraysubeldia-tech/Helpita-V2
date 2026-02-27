-- 1. Create the appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'Agendado' CHECK (status IN ('Agendado', 'Confirmado', 'Completado', 'NoShow', 'Cancelado', 'Reprogramado')),
    cancel_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Prevent double booking on the same date and start time (unique constraint)
ALTER TABLE public.appointments ADD CONSTRAINT unique_slot_date_start_time UNIQUE (slot_date, start_time);

-- 3. Create indexes to speed up queries by date or by patient
CREATE INDEX IF NOT EXISTS idx_appointments_slot_date ON public.appointments(slot_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);

-- 4. Set up an updated_at trigger (Assumes handle_updated_at() function already exists from previous tables, if not, create it first)
-- Create function if it doesn't exist (commonly used in Supabase projects)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
DROP TRIGGER IF EXISTS trigger_set_updated_at_appointments ON public.appointments;
CREATE TRIGGER trigger_set_updated_at_appointments
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 5. Set up basic RLS (Row Level Security) - optional but recommended, depending on your current setup.
-- If you are relying on anon keys with full access for the MVP, you might need to enable RLS and add policies, or leave it disabled as per current project settings.
-- To allow all operations (assuming open MVP without granular user roles yet):
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for anon" 
ON public.appointments FOR ALL 
USING (true) WITH CHECK (true);
