-- Admin team RBAC: descriptive role labels for users with role='admin'.
-- Values: 'super', 'operations', 'moderation', 'support', 'finance', 'analytics'.
-- The label is shown in the admin team panel; future PRs may wire role-based
-- permission gating on individual admin endpoints.
ALTER TABLE users ADD COLUMN admin_role TEXT;

-- Promote any existing admins to 'super' so they keep full access.
UPDATE users SET admin_role = 'super' WHERE role = 'admin' AND admin_role IS NULL;
