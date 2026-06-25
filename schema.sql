-- ============================================================
-- Employee Leave Management System — PostgreSQL DDL for Supabase
-- Language: Arabic (RTL), Numbers: International digits (1, 2, 3...)
-- ============================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==================== PROFILES TABLE ====================

CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  email         TEXT,
  days_balance  INT NOT NULL DEFAULT 3,
  hourly_balance INT NOT NULL DEFAULT 2,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper function to check admin role (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles (drop first to allow re-run)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (public.is_admin());

-- ==================== LEAVE REQUESTS TABLE ====================

CREATE TABLE IF NOT EXISTS leave_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type      TEXT NOT NULL CHECK (leave_type IN ('اعتيادية', 'مرضية', 'زمنية')),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  duration_hours  INT NOT NULL DEFAULT 0,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'قيد الانتظار'
                    CHECK (status IN ('قيد الانتظار', 'مقبولة', 'مرفوضة')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT leave_dates_check CHECK (end_date >= start_date),
  CONSTRAINT hours_only_for_time CHECK (
    (leave_type = 'زمنية' AND duration_hours > 0) OR
    (leave_type <> 'زمنية' AND duration_hours = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for leave_requests (drop first to allow re-run)
DROP POLICY IF EXISTS "Employees can view their own requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON leave_requests;
DROP POLICY IF EXISTS "Employees can insert their own requests" ON leave_requests;
DROP POLICY IF EXISTS "Employees can update their own pending requests" ON leave_requests;
DROP POLICY IF EXISTS "Admins can update any request" ON leave_requests;
DROP POLICY IF EXISTS "Admins can delete requests" ON leave_requests;

CREATE POLICY "Employees can view their own requests"
  ON leave_requests FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "Admins can view all requests"
  ON leave_requests FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Employees can insert their own requests"
  ON leave_requests FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Employees can update their own pending requests"
  ON leave_requests FOR UPDATE
  USING (auth.uid() = employee_id AND status = 'قيد الانتظار')
  WITH CHECK (auth.uid() = employee_id AND status = 'قيد الانتظار');

CREATE POLICY "Admins can update any request"
  ON leave_requests FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete requests"
  ON leave_requests FOR DELETE
  USING (public.is_admin());

-- ==================== MONTHLY BALANCE REFRESH ====================

CREATE OR REPLACE FUNCTION refresh_monthly_balance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET
    days_balance   = days_balance + 3,
    hourly_balance = hourly_balance + 2;
END;
$$;

-- Schedule via pg_cron (Supabase):
--   SELECT cron.schedule('monthly-balance', '0 0 1 * *', 'SELECT refresh_monthly_balance();');

-- ==================== APPROVE / REJECT LEAVE REQUEST FUNCTIONS ====================

-- Approve: just set status (balance already deducted on submit)
CREATE OR REPLACE FUNCTION approve_leave_request(request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE leave_requests
  SET status = 'مقبولة'
  WHERE id = request_id AND status = 'قيد الانتظار';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطلب غير موجود أو تمت معالجته مسبقاً';
  END IF;
END;
$$;

-- Reject: set status AND restore deducted balance to employee
CREATE OR REPLACE FUNCTION reject_leave_request(request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_leave_type    TEXT;
  v_employee_id   UUID;
  v_days          INT;
  v_hours         INT;
BEGIN
  SELECT leave_type, employee_id, (end_date - start_date + 1), duration_hours
  INTO v_leave_type, v_employee_id, v_days, v_hours
  FROM leave_requests
  WHERE id = request_id AND status = 'قيد الانتظار'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطلب غير موجود أو تمت معالجته مسبقاً';
  END IF;

  UPDATE leave_requests SET status = 'مرفوضة' WHERE id = request_id;

  IF v_leave_type IN ('اعتيادية', 'مرضية') THEN
    UPDATE profiles
    SET days_balance = days_balance + v_days
    WHERE id = v_employee_id;
  ELSIF v_leave_type = 'زمنية' THEN
    UPDATE profiles
    SET hourly_balance = hourly_balance + v_hours
    WHERE id = v_employee_id;
  END IF;
END;
$$;

-- ==================== BACKFILL EMAILS FOR EXISTING PROFILES ====================
-- Run this ONCE to populate the email column for profiles created before the column was added:
--   UPDATE profiles p SET email = u.email FROM auth.users u WHERE p.id = u.id AND p.email IS NULL;

-- ==================== ADMIN DELETE USER FUNCTION ====================

CREATE OR REPLACE FUNCTION admin_delete_user(target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  DELETE FROM public.profiles WHERE id = target_id;
  DELETE FROM auth.users WHERE id = target_id;
END;
$$;

-- ==================== AUTO-PROFILE TRIGGER ====================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'employee')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ==================== NOTIFICATIONS TABLE ====================

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- IMPORTANT: After creating this table, enable Realtime (Replication) for it
-- in the Supabase Dashboard under Database > Replication.

-- ==================== TRIGGER: New leave request → Notify all admins ====================

CREATE OR REPLACE FUNCTION notify_new_leave_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_employee_name TEXT;
BEGIN
  SELECT full_name INTO v_employee_name FROM profiles WHERE id = NEW.employee_id;

  INSERT INTO notifications (user_id, title, message, type)
  SELECT
    p.id,
    'طلب إجازة جديد',
    'قام ' || v_employee_name || ' بتقديم طلب إجازة ' || NEW.leave_type,
    'info'
  FROM profiles p
  WHERE p.role = 'admin';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_leave_request_insert ON leave_requests;
CREATE TRIGGER on_leave_request_insert
  AFTER INSERT ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_leave_request();

-- ==================== TRIGGER: Leave request status change → Notify employee ====================

CREATE OR REPLACE FUNCTION notify_leave_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'مقبولة' THEN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.employee_id,
      'تم قبول طلب الإجازة',
      'تم قبول طلب إجازتك (' || NEW.leave_type || ')',
      'success'
    );
  ELSIF NEW.status = 'مرفوضة' THEN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.employee_id,
      'تم رفض طلب الإجازة',
      'تم رفض طلب إجازتك (' || NEW.leave_type || ')' || CASE WHEN NEW.rejection_reason IS NOT NULL AND NEW.rejection_reason <> '' THEN '. سبب الرفض: ' || NEW.rejection_reason ELSE '' END,
      'error'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_leave_request_update ON leave_requests;
CREATE TRIGGER on_leave_request_update
  AFTER UPDATE OF status ON leave_requests
  FOR EACH ROW
  WHEN (OLD.status = 'قيد الانتظار' AND NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION notify_leave_status_change();

-- ==================== PUSH SUBSCRIPTIONS TABLE ====================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON push_subscriptions;

CREATE POLICY "Users can manage their own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- ==================== APP CONFIG TABLE ====================
-- جميع الإعدادات في قاعدة البيانات — لا حاجة لـ Environment Variables

CREATE TABLE IF NOT EXISTS app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO app_config (key, value) VALUES
  ('function_url', 'https://bbntytnzcavsedvmckkc.supabase.co'),
  ('service_key', '<your_service_role_key_here>'),
  ('vapid_public_key', 'BMn9QJDeeK63eMDTjee-g2MVhrXb4qhmJSnsBilULkPdtXJShG3ZzGAo0AlQYhUlPIbdHEHZR7n_N3dNgNfpga0'),
  ('vapid_private_key', '22vOPJUpiJ5Fa4HPnbqJzQB9kPqIeoKX3tladso_LA8'),
  ('vapid_email', 'admin@example.com')
ON CONFLICT (key) DO NOTHING;

-- ==================== TRIGGER: New notification → Call Edge Function for push ====================

-- IMPORTANT: Enable pg_net extension first:
--   SQL Editor → CREATE EXTENSION IF NOT EXISTS pg_net;
--
-- Then update the service_key in app_config:
--   UPDATE app_config SET value = '<your_service_role_key>' WHERE key = 'service_key';

CREATE OR REPLACE FUNCTION notify_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_function_url TEXT;
  v_service_key  TEXT;
BEGIN
  SELECT value INTO v_function_url FROM app_config WHERE key = 'function_url';
  SELECT value INTO v_service_key  FROM app_config WHERE key = 'service_key';

  IF v_function_url IS NULL OR v_service_key IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_function_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object('notification_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_notification_insert ON notifications;
CREATE TRIGGER on_notification_insert
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_push_on_notification();
