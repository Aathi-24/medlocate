
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create hospitals table
CREATE TABLE public.hospitals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  emergency_available BOOLEAN NOT NULL DEFAULT true,
  ot_available BOOLEAN NOT NULL DEFAULT true,
  general_beds INTEGER NOT NULL DEFAULT 0,
  ac_beds INTEGER NOT NULL DEFAULT 0,
  private_beds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create doctors table
CREATE TABLE public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  shift_start TEXT NOT NULL,
  shift_end TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'upcoming')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get admin's hospital_id
CREATE OR REPLACE FUNCTION public.get_admin_hospital_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hospital_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND role = 'admin'
  LIMIT 1
$$;

-- Hospitals: everyone can read
CREATE POLICY "Anyone can view hospitals"
ON public.hospitals FOR SELECT
USING (true);

-- Hospitals: admin can update their own hospital
CREATE POLICY "Admins can update their hospital"
ON public.hospitals FOR UPDATE
TO authenticated
USING (id = public.get_admin_hospital_id(auth.uid()));

-- Doctors: everyone can read
CREATE POLICY "Anyone can view doctors"
ON public.doctors FOR SELECT
USING (true);

-- Doctors: admin can insert for their hospital
CREATE POLICY "Admins can insert doctors"
ON public.doctors FOR INSERT
TO authenticated
WITH CHECK (hospital_id = public.get_admin_hospital_id(auth.uid()));

-- Doctors: admin can update their hospital's doctors
CREATE POLICY "Admins can update doctors"
ON public.doctors FOR UPDATE
TO authenticated
USING (hospital_id = public.get_admin_hospital_id(auth.uid()));

-- Doctors: admin can delete their hospital's doctors
CREATE POLICY "Admins can delete doctors"
ON public.doctors FOR DELETE
TO authenticated
USING (hospital_id = public.get_admin_hospital_id(auth.uid()));

-- User roles: users can read their own role
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_hospitals_updated_at
BEFORE UPDATE ON public.hospitals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at
BEFORE UPDATE ON public.doctors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for hospitals and doctors
ALTER PUBLICATION supabase_realtime ADD TABLE public.hospitals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctors;

-- Auto-assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
