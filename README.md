# Helpita Pacientes MVP

Aplicación mínima para la gestión de "Pacientes" conectada a Supabase Postgres.

## Setup Local

1. Instalar dependencias:
```bash
npm install
```

2. Variables de entorno:
Copiar `.env.example` a `.env.local` y agregar credenciales de Supabase:
```env
VITE_SUPABASE_URL=tu-url
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

3. Iniciar entorno de desarrollo:
```bash
npm run dev
```

## Base de Datos (Supabase SQL)

Ejecuta el siguiente script en el "SQL Editor" de tu proyecto de Supabase:

```sql
-- patients table
CREATE TABLE public.patients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    child_full_name text NOT NULL,
    child_age int NOT NULL,
    city text,
    address text,
    neighborhood text,
    reason text,
    observations text,
    first_time boolean DEFAULT true,
    commercial_stage text DEFAULT 'Nuevo',
    clinical_stage text DEFAULT 'Primera consulta',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- responsible table
CREATE TABLE public.responsible (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    phone text NOT NULL,
    email text,
    ruc text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON patients
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_responsible_updated_at
BEFORE UPDATE ON responsible
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
```
