import { ImageResponse } from 'next/og';
import fs from 'node:fs';
import path from 'node:path';
import {
  fetchAllJobs,
  jobCompany,
  jobLocation,
  jobSalaryText,
  jobBenefits,
  employmentGreek,
} from '@/lib/seo-data';

/**
 * Η εικόνα που βλέπει ο κόσμος όταν κάποιος κολλάει τον σύνδεσμο της αγγελίας
 * στο Facebook, στο Messenger ή στο WhatsApp.
 *
 * Γιατί υπάρχει: πριν, η εικόνα έμπαινε μόνο αν η επιχείρηση είχε ανεβάσει
 * λογότυπο. Στην πραγματικότητα 10 από τις 12 αγγελίες ΔΕΝ είχαν, οπότε στο
 * Facebook έβγαινε γυμνός σύνδεσμος χωρίς εικόνα. Τώρα φτιάχνεται μία εικόνα
 * για κάθε αγγελία, πάντα.
 *
 * Τα χρώματα είναι ΤΑ ΙΔΙΑ με τα email που στέλνουμε (apps/api/src/lib/email.ts):
 * ανοιχτό γκρι φόντο #eef2f7, λευκή κάρτα με περίγραμμα #e2e8f0, μπλε λωρίδα
 * #3b82f6 → #2563eb, τίτλοι #0f172a, δευτερεύον κείμενο #475569. Έτσι ό,τι φεύγει
 * από το StaffNow — email ή κοινοποίηση — μοιάζει μεταξύ του.
 *
 * Φτιάχνεται την ώρα του χτισίματος (η σελίδα είναι στατική ούτως ή άλλως),
 * άρα δεν επιβαρύνει καθόλου τον server.
 */
export const dynamic = 'force-static';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Αγγελία εργασίας στο StaffNow';

export async function generateStaticParams() {
  const jobs = await fetchAllJobs();
  return jobs.map((j) => ({ id: String(j.id) }));
}

/**
 * ΣΗΜΑΝΤΙΚΟ: η γραμματοσειρά διαβάζεται από τον φάκελο του έργου, ΔΕΝ κατεβαίνει
 * από το ίντερνετ. Το δοκίμασα: η ενσωματωμένη γραμματοσειρά έχει μηδέν ελληνικά
 * γράμματα και, αν το Google Fonts δεν απαντήσει την ώρα του χτισίματος, το
 * πρόγραμμα ΔΕΝ σταματάει με σφάλμα — βγάζει σιωπηλά εικόνα με άδεια κουτάκια
 * αντί για κείμενο. Δηλαδή θα δημοσιευόταν χαλασμένη εικόνα χωρίς να το πάρει
 * κανείς είδηση. Γι' αυτό τα αρχεία είναι μέσα στο έργο.
 */
function font(file: string): Buffer {
  return fs.readFileSync(path.join(process.cwd(), 'src/assets/fonts', file));
}

function logoDataUri(): string {
  const buf = fs.readFileSync(path.join(process.cwd(), 'public/icon-192.png'));
  return `data:image/png;base64,${buf.toString('base64')}`;
}

/**
 * Η φωτογραφία/λογότυπο της επιχείρησης, αν έχει ανεβάσει.
 *
 * Την κατεβάζουμε ΕΜΕΙΣ εδώ και τη βάζουμε μέσα στην εικόνα, αντί να αφήσουμε
 * τη διεύθυνσή της στο <img>. Δύο λόγοι: (α) αν ο διακομιστής δεν απαντήσει
 * την ώρα του χτισίματος, γυρνάμε null και η εικόνα βγαίνει κανονικά χωρίς
 * λογότυπο — δεν σταματάει το ανέβασμα ολόκληρου του site· (β) δεν εξαρτάται
 * μετά από τίποτα εξωτερικό, όπως και η γραμματοσειρά παραπάνω.
 *
 * Πολύ μεγάλα αρχεία τα αγνοούμε: θα φούσκωναν άσκοπα το τελικό PNG.
 */
const MAX_LOGO_BYTES = 3 * 1024 * 1024;

async function companyLogoDataUri(url?: string | null): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    // Μόνο png και jpeg: αυτά ξέρει σίγουρα να ζωγραφίσει η βιβλιοθήκη.
    if (!/^image\/(png|jpeg)/i.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > MAX_LOGO_BYTES) return null;
    return `data:${type.split(';')[0]};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

// Κόβουμε εμείς το κείμενο αντί να το αφήσουμε στη στοίχιση, ώστε να ξέρουμε
// σίγουρα ότι χωράει και δεν ξεχειλίζει έξω από την εικόνα.
function clamp(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

const BRAND_GRADIENT = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';

/**
 * Οι διαστάσεις γράφονται με νούμερα, ΟΧΙ με ποσοστά. Χωρίς σταθερό πλάτος, τα
 * μεγάλα κείμενα δεν αναδιπλώνονται: σπρώχνουν την κάρτα και βγαίνει έξω από
 * την εικόνα. Το είδα σε αληθινή αγγελία με τοποθεσία «ΠΕΡΑΙΑ / ΘΕΣΣΑΛΟΝΙΚΗ» —
 * κοβόταν η δεξιά άκρη της κάρτας και το τρίτο κουτάκι.
 */
const CARD_W = size.width - 60; // 30 padding αριστερά + 30 δεξιά
const CARD_H = size.height - 60;
const INNER_W = CARD_W - 88; // 44 padding αριστερά + 44 δεξιά

/**
 * Όσο πιο μακρύ το κείμενο, τόσο πιο μικρά τα γράμματα — για να χωρέσει χωρίς
 * να κοπεί. Τα όρια βγήκαν μετρώντας τις 12 αληθινές αγγελίες.
 */
function fit(text: string, sizes: Array<[number, number]>, min: number): number {
  for (const [maxChars, px] of sizes) if (text.length <= maxChars) return px;
  return min;
}

/** Τα τρία κουτάκια: ΜΙΣΘΟΣ / ΤΟΠΟΘΕΣΙΑ / ΑΠΑΣΧΟΛΗΣΗ. */
function Fact({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  const fontSize = wide
    ? fit(value, [[13, 40], [19, 34]], 30)
    : fit(value, [[11, 32], [16, 28]], 24);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        marginRight: 16,
        marginTop: 10,
        padding: '14px 26px',
        borderRadius: 18,
        backgroundColor: wide ? '#eff6ff' : '#f1f5f9',
        border: `2px solid ${wide ? '#bfdbfe' : '#e2e8f0'}`,
      }}
    >
      <div style={{ display: 'flex', fontSize: 18, color: '#94a3b8', letterSpacing: 2 }}>
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 4,
          fontSize,
          fontWeight: 700,
          color: wide ? '#1d4ed8' : '#0f172a',
          letterSpacing: -0.8,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobs = await fetchAllJobs();
  const job = jobs.find((j) => String(j.id) === id);

  const title = clamp(job?.title || 'Θέση εργασίας', 62);
  const company = clamp(job ? jobCompany(job) : 'StaffNow', 46);
  const location = job ? clamp(jobLocation(job), 22) : 'Ελλάδα';
  // Χωρίς ποσό γράφουμε «Κατόπιν συνεννόησης». Κενό κουτί σε εικόνα που θα δει
  // κόσμος στο Facebook μοιάζει με χαλασμένη σελίδα.
  const salary = (job && jobSalaryText(job)) || 'Κατόπιν συνεννόησης';
  const employment = job ? employmentGreek(job.employment_type) : '';
  const benefits = job ? jobBenefits(job) : [];
  const companyLogo = await companyLogoDataUri(job?.company_logo);

  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: 'flex',
          backgroundColor: '#eef2f7',
          padding: 30,
          fontFamily: 'NotoSans',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: CARD_W,
            height: CARD_H,
            backgroundColor: '#ffffff',
            border: '2px solid #e2e8f0',
            borderRadius: 28,
            overflow: 'hidden',
          }}
        >
          {/* Η μπλε λωρίδα του StaffNow, ίδια με την κορυφή κάθε email */}
          <div style={{ display: 'flex', height: 10, backgroundImage: BRAND_GRADIENT }} />

          {/* Κεφαλίδα: λογότυπο + όνομα, ακριβώς όπως στα email */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 44px',
              borderBottom: '2px solid #eef2f7',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {/* borderRadius = μισό του πλάτους → κύκλος, όπως παντού αλλού. */}
              <img src={logoDataUri()} width={52} height={52} style={{ borderRadius: 26 }} alt="" />
              <div style={{ display: 'flex', marginLeft: 14, fontSize: 34, fontWeight: 700, letterSpacing: -0.8 }}>
                <div style={{ display: 'flex', color: '#1f2937' }}>Staff</div>
                <div style={{ display: 'flex', color: '#3b82f6' }}>Now</div>
              </div>
            </div>
            <div style={{ display: 'flex', fontSize: 22, color: '#94a3b8' }}>staffnow.gr</div>
          </div>

          {/* Σώμα: θέση, επιχείρηση, και τα τρία κουτάκια */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: INNER_W,
              flexGrow: 1,
              justifyContent: 'center',
              padding: '0 44px',
            }}
          >
            <div style={{ display: 'flex', fontSize: 19, color: '#2563eb', letterSpacing: 3 }}>
              ΑΓΓΕΛΙΑ ΕΡΓΑΣΙΑΣ
            </div>

            <div
              style={{
                display: 'flex',
                width: INNER_W,
                marginTop: 10,
                fontSize: fit(title, [[26, 66], [40, 54], [52, 46]], 40),
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.1,
                letterSpacing: -1.5,
              }}
            >
              {title}
            </div>

            {/* Η επιχείρηση: με τη φωτογραφία της αν έχει ανεβάσει, αλλιώς σκέτο
                το όνομα. Στρογγυλή, όπως δείχνουμε τα λογότυπα παντού αλλού. */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                width: INNER_W,
                marginTop: 12,
              }}
            >
              {companyLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={companyLogo}
                  width={58}
                  height={58}
                  alt=""
                  style={{
                    marginRight: 14,
                    borderRadius: 29,
                    border: '2px solid #e2e8f0',
                    objectFit: 'cover',
                  }}
                />
              ) : null}
              <div style={{ display: 'flex', fontSize: 27, color: '#475569' }}>{company}</div>
            </div>

            {/* flexWrap: αν τα κουτάκια δεν χωρέσουν στη σειρά, πέφτουν από κάτω
                αντί να βγουν έξω από την εικόνα. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', width: INNER_W, marginTop: 12 }}>
              <Fact label="ΜΙΣΘΟΣ" value={salary} wide />
              <Fact label="ΤΟΠΟΘΕΣΙΑ" value={location} />
              {employment ? <Fact label="ΑΠΑΣΧΟΛΗΣΗ" value={employment} /> : null}
            </div>
          </div>

          {/* Πόδι: οι παροχές — «τα καλά» της αγγελίας */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              width: CARD_W,
              minHeight: 82,
              padding: '0 44px',
              backgroundColor: '#f8fafc',
              borderTop: '2px solid #eef2f7',
            }}
          >
            {benefits.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', width: INNER_W }}>
                <div style={{ display: 'flex', marginRight: 18, fontSize: 22, color: '#64748b' }}>
                  Παροχές:
                </div>
                {benefits.map((b) => (
                  <div
                    key={b}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginRight: 12,
                      padding: '9px 20px',
                      borderRadius: 999,
                      backgroundColor: '#ecfdf5',
                      border: '2px solid #a7f3d0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        width: 12,
                        height: 12,
                        marginRight: 10,
                        borderRadius: 6,
                        backgroundColor: '#10b981',
                      }}
                    />
                    <div style={{ display: 'flex', fontSize: 24, color: '#047857', fontWeight: 700 }}>
                      {b}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', fontSize: 24, color: '#64748b' }}>
                Δες όλη την αγγελία και κάνε αίτηση στο staffnow.gr
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'NotoSans', data: font('NotoSans-Greek-Regular.ttf'), weight: 400, style: 'normal' },
        { name: 'NotoSans', data: font('NotoSans-Greek-Bold.ttf'), weight: 700, style: 'normal' },
      ],
    },
  );
}
