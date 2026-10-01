-- Clarify the two roles involved in the order workflow.
-- Existing production operators keep their permissions under the new name.
UPDATE "User"
SET "role" = 'order_operator'
WHERE "role" = 'production_operator';
