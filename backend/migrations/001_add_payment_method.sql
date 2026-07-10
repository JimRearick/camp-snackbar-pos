-- Migration: Add payment_method field to transactions table
-- Date: 2026-02-07
-- Purpose: Track cash vs account-based transactions

-- Add payment_method column to transactions table
-- Default to 'account' for backward compatibility with existing transactions
ALTER TABLE transactions ADD COLUMN payment_method TEXT DEFAULT 'account'
    CHECK(payment_method IN ('account', 'cash', 'card'));

-- Create a Cash Sales account for tracking walk-up cash customers
INSERT INTO accounts (account_number, account_name, account_type, notes, active)
VALUES ('CASH001', 'Cash Sales', 'individual',
        'Special account for walk-up cash customers. Balance represents total cash collected.', 1)
ON CONFLICT(account_number) DO NOTHING;
