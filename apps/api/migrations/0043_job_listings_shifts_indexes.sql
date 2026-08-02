-- Ξεχωριστό αρχείο από το 0042: τα ALTER εκεί σπάνε σε re-run και το
-- `wrangler d1 execute --file` εγκαταλείπει το υπόλοιπο αρχείο στο πρώτο σφάλμα.
CREATE INDEX IF NOT EXISTS idx_job_listings_kind_start
  ON job_listings(listing_kind, status, shift_start_utc);
