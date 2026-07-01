-- إصلاح trigger التدقيق: تجاهل التسجيل عندما لا يوجد actor (طلبات API للصالون)
-- المشكلة: عندما يحفظ صاحب الصالون بياناته عبر owner-salon API، لا يُضبط app.current_actor
-- فيحاول trigger إدراج NULL في عمود actor الذي يرفض NULL → فشل الحفظ

CREATE OR REPLACE FUNCTION audit_sensitive_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  action_label text;
  details_val  jsonb;
  v_actor      text;
BEGIN
  v_actor := current_setting('app.current_actor', true);

  -- تجاهل التسجيل إذا لم يكن هناك actor (عملية API بدون سياق إداري)
  IF v_actor IS NULL OR v_actor = '' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

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
    v_actor,
    action_label,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END,
    details_val
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
