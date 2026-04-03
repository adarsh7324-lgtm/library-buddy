-- SQL script to add startDate column
-- Run this in the Supabase SQL Editor

ALTER TABLE "public"."payments" ADD COLUMN IF NOT EXISTS "startDate" date;
ALTER TABLE "public"."deleted_payments" ADD COLUMN IF NOT EXISTS "startDate" date;
