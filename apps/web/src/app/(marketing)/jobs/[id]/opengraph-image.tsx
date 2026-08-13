import { ImageResponse } from 'next/og';
import fs from 'node:fs';
import path from 'node:path';
import {
  fetchAllJobs,
  jobCompany,
  jobLocation,
  employmentGreek,
  type PublicJob,
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

function salaryText(j: PublicJob): string | null {
  const unit =
    j.salary_type === 'hourly' ? '€/ώρα' :
    j.salary_type === 'daily' ? '€/ημέρα' :
    j.salary_type === 'monthly' ? '€/μήνα' : '€';
  if (j.salary_min && j.salary_max) return `${j.salary_min}-${j.salary_max} ${unit}`;
  if (j.salary_min) return `Από ${j.salary_min} ${unit}`;
  if (j.salary_max) return `Έως ${j.salary_max} ${unit}`;
  return null;
}

// Κόβουμε εμείς το κείμενο αντί να το αφήσουμε στη στοίχιση, ώστε να ξέρουμε
// σίγουρα ότι χωράει και δεν ξεχειλίζει έξω από την εικόνα.
function clamp(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobs = await fetchAllJobs();
  const job = jobs.find((j) => String(j.id) === id);

  const title = clamp(job?.title || 'Θέση εργασίας', 70);
  const company = clamp(job ? jobCompany(job) : 'StaffNow', 42);
  const location = job ? clamp(jobLocation(job), 30) : 'Ελλάδα';
  const salary = job ? salaryText(job) : null;
  const employment = job ? employmentGreek(job.employment_type) : '';

  const chips = [location, employment, salary].filter(Boolean) as string[];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#060B1F',
          backgroundImage: 'linear-gradient(135deg, #060B1F 0%, #172554 55%, #1d4ed8 100%)',
          padding: '64px 72px',
          fontFamily: 'NotoSans',
        }}
      >
        {/* Πάνω: το σήμα του StaffNow */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoDataUri()} width={72} height={72} style={{ borderRadius: 18 }} alt="" />
          <div
            style={{
              display: 'flex',
              marginLeft: 22,
              fontSize: 42,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: -1,
            }}
          >
            StaffNow
          </div>
        </div>

        {/* Μέση: ο τίτλος και η επιχείρηση */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: title.length > 44 ? 60 : 74,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.12,
              letterSpacing: -1.5,
            }}
          >
            {title}
          </div>
          {company ? (
            <div
              style={{
                display: 'flex',
                marginTop: 20,
                fontSize: 36,
                color: '#bfdbfe',
              }}
            >
              {company}
            </div>
          ) : null}
        </div>

        {/* Κάτω: περιοχή, τύπος απασχόλησης, αμοιβή */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {chips.map((c, i) => (
              <div
                key={c}
                style={{
                  display: 'flex',
                  marginRight: i === chips.length - 1 ? 0 : 16,
                  padding: '14px 28px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  border: '2px solid rgba(255,255,255,0.22)',
                  color: '#ffffff',
                  fontSize: 30,
                }}
              >
                {c}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', fontSize: 30, color: '#93c5fd' }}>staffnow.gr</div>
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
