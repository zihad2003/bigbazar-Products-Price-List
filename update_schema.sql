-- Run this in your Supabase Dashboard -> SQL Editor

-- 1. Add "is_exclusive" property to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_exclusive boolean DEFAULT false;

-- 2. Add properties to orders table for tracking exclusive order & moderator entry
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_exclusive_order boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS moderator_reference text DEFAULT NULL;
