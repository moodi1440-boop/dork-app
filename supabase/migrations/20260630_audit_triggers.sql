-- نقطتا 40 و54: Audit Logging لعمليات الحذف والتعديل الحساسة
-- triggers على DB تسجّل في admin_audit_log تلقائياً

-- ============================================================
-- دالة التسجيل المشتركة
-- ============================================================
CREATE OR REPLACE FUNCTION audit_sensitive_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  action_label text;
  details_val  jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    action_label := TG_TABLE_NAME || '.delete';
    details_val  := to_jsonb(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    action_label := TG_TABLE_NAME || '.update';
    details_val  := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO admin_audit_log (actor, action, target_type, target_id, details)
  VALUES (
    current_setting('app.current_actor', true) :: text,
    action_label,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END,
    details_val
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- ============================================================
-- bookings: حذف + تغيير status
-- ============================================================
DROP TRIGGER IF EXISTS trg_audit_bookings ON bookings;
CREATE TRIGGER trg_audit_bookings
  AFTER DELETE OR UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_change();

-- ============================================================
-- salons: حذف + تغيير الأسعار (prices, total_paid)
-- ============================================================
DROP TRIGGER IF EXISTS trg_audit_salons ON salons;
CREATE TRIGGER trg_audit_salons
  AFTER DELETE OR UPDATE OF prices, total_paid ON salons
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_change();

-- ============================================================
-- customers: حذف فقط
-- ============================================================
DROP TRIGGER IF EXISTS trg_audit_customers ON customers;
CREATE TRIGGER trg_audit_customers
  AFTER DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_change();
