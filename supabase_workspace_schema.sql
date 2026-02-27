CREATE TABLE IF NOT EXISTS public.case_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    note_type TEXT NOT NULL CHECK (note_type IN ('Sesion', 'Evolucion', 'Plan', 'Observacion', 'Alta')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('efectivo', 'transferencia', 'tarjeta_credito', 'tarjeta_debito', 'otro')),
    is_paid BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_notes_patient_id ON public.case_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_appointment_id ON public.case_notes(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON public.payments(appointment_id);

DROP TRIGGER IF EXISTS trigger_set_updated_at_case_notes ON public.case_notes;
CREATE TRIGGER trigger_set_updated_at_case_notes
BEFORE UPDATE ON public.case_notes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_set_updated_at_payments ON public.payments;
CREATE TRIGGER trigger_set_updated_at_payments
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for anon on case_notes" 
ON public.case_notes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for anon on payments" 
ON public.payments FOR ALL USING (true) WITH CHECK (true);
