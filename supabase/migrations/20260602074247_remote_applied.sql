-- Base schema (part 2/3): enum value additions, isolated in their own
-- migration because Postgres forbids using a value added by ALTER TYPE ...
-- ADD VALUE inside the same transaction (part 3 uses both values).
-- From legacy Drizzle migrations 0005 and 0006.

ALTER TYPE "public"."application_status" ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE "public"."payment_status" ADD VALUE IF NOT EXISTS 'rejected';
