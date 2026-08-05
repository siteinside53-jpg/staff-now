-- Οι φωτογραφίες και τα αρχεία έδειχναν στο pub-<hash>.r2.dev.
--
-- Αυτό είναι το προσωρινό domain ανάπτυξης της Cloudflare για κουβάδες R2.
-- Το μπλοκάρουν πάροχοι και routers (στο δίκτυο του πελάτη ολόκληρη η ζώνη
-- r2.dev αναλύεται σε 127.0.0.1, οπότε ΚΑΜΙΑ φωτογραφία δεν φόρτωνε) και η
-- ίδια η Cloudflare το χαρακτηρίζει ακατάλληλο για παραγωγή.
--
-- Τα ίδια αρχεία σερβίρονται πλέον από τον server του API, μέσω της νέας
-- διαδρομής GET /uploads/f/<key> (routes/uploads.ts). Το κλειδί του αρχείου
-- μένει ακριβώς το ίδιο — αλλάζει μόνο το κομμάτι πριν από αυτό.
--
-- Επηρεαζόμενες γραμμές στην παραγωγή τη στιγμή της συγγραφής:
--   worker_profiles.photo_url ............ 22
--   worker_profiles.cv_url ............... 36
--   business_branches.logo_url ............ 7
--   business_branches.cover_photo_url .... 10
--   messages.content (συνημμένα σε chat) . 14
--   business_profiles.logo_url ............ 0
--   media_files.url ....................... 0
--   verification_requests.document_url .... 0
--
-- Είναι επαναλήψιμο: το REPLACE δεν βρίσκει τίποτα σε δεύτερη εκτέλεση.

UPDATE worker_profiles
SET photo_url = REPLACE(photo_url,
      'https://pub-5e055b34e4694e02ac3de198a7776878.r2.dev/',
      'https://staffnow-api-production.siteinside53.workers.dev/uploads/f/')
WHERE photo_url LIKE '%pub-5e055b34e4694e02ac3de198a7776878.r2.dev/%';

UPDATE worker_profiles
SET cv_url = REPLACE(cv_url,
      'https://pub-5e055b34e4694e02ac3de198a7776878.r2.dev/',
      'https://staffnow-api-production.siteinside53.workers.dev/uploads/f/')
WHERE cv_url LIKE '%pub-5e055b34e4694e02ac3de198a7776878.r2.dev/%';

UPDATE business_profiles
SET logo_url = REPLACE(logo_url,
      'https://pub-5e055b34e4694e02ac3de198a7776878.r2.dev/',
      'https://staffnow-api-production.siteinside53.workers.dev/uploads/f/')
WHERE logo_url LIKE '%pub-5e055b34e4694e02ac3de198a7776878.r2.dev/%';

UPDATE business_branches
SET logo_url = REPLACE(logo_url,
      'https://pub-5e055b34e4694e02ac3de198a7776878.r2.dev/',
      'https://staffnow-api-production.siteinside53.workers.dev/uploads/f/')
WHERE logo_url LIKE '%pub-5e055b34e4694e02ac3de198a7776878.r2.dev/%';

UPDATE business_branches
SET cover_photo_url = REPLACE(cover_photo_url,
      'https://pub-5e055b34e4694e02ac3de198a7776878.r2.dev/',
      'https://staffnow-api-production.siteinside53.workers.dev/uploads/f/')
WHERE cover_photo_url LIKE '%pub-5e055b34e4694e02ac3de198a7776878.r2.dev/%';

UPDATE verification_requests
SET document_url = REPLACE(document_url,
      'https://pub-5e055b34e4694e02ac3de198a7776878.r2.dev/',
      'https://staffnow-api-production.siteinside53.workers.dev/uploads/f/')
WHERE document_url LIKE '%pub-5e055b34e4694e02ac3de198a7776878.r2.dev/%';

UPDATE media_files
SET url = REPLACE(url,
      'https://pub-5e055b34e4694e02ac3de198a7776878.r2.dev/',
      'https://staffnow-api-production.siteinside53.workers.dev/uploads/f/')
WHERE url LIKE '%pub-5e055b34e4694e02ac3de198a7776878.r2.dev/%';

-- Συνημμένα μέσα σε μηνύματα: το URL είναι ενσωματωμένο στο κείμενο ως
-- markdown, π.χ. 📷 [Φωτογραφία](https://...r2.dev/chat/.../foo.jpg)
UPDATE messages
SET content = REPLACE(content,
      'https://pub-5e055b34e4694e02ac3de198a7776878.r2.dev/',
      'https://staffnow-api-production.siteinside53.workers.dev/uploads/f/')
WHERE content LIKE '%pub-5e055b34e4694e02ac3de198a7776878.r2.dev/%';
