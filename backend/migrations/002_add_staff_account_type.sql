-- Migration: Add 'staff' account type
-- Date: 2026-07-25
-- Purpose: Allow staff accounts (function like individual accounts, no family members list)
--
-- SQLite does not support altering a CHECK constraint directly, so the accounts
-- table is rebuilt with the updated constraint and existing rows are copied over.
--
-- accounts is referenced by transactions.account_id via foreign key, so the
-- runner disables foreign_keys before running this script (DROP TABLE would
-- otherwise fail on databases with real transaction history). Wrapped in an
-- explicit transaction so a failure partway leaves no leftover state; the
-- DROP TABLE IF EXISTS also lets this be re-run safely if a previous attempt
-- (e.g. before this fix) left accounts_new behind.

BEGIN TRANSACTION;

DROP TABLE IF EXISTS accounts_new;

CREATE TABLE accounts_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_number TEXT UNIQUE NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK(account_type IN ('family', 'individual', 'staff')),
    family_members TEXT,
    active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

INSERT INTO accounts_new SELECT * FROM accounts;

DROP TABLE accounts;

ALTER TABLE accounts_new RENAME TO accounts;

CREATE INDEX idx_accounts_number ON accounts(account_number);
CREATE INDEX idx_accounts_name ON accounts(account_name);

COMMIT;
