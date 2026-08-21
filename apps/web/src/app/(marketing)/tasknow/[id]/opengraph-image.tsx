import { ImageResponse } from 'next/og';
import fs from 'node:fs';
import path from 'node:path';
import { CATEGORY_BY_KEY, SAMPLE_TASKS, isLicensedCategory } from '@/components/tasknow/data';

/**
 * Η εικόνα που βλέπει ο κόσμος όταν κάποιος κολλάει τον σύνδεσμο μιας
 * μικροδουλειάς σε Facebook, Messenger ή WhatsApp.
 *
 * Ίδιο μοτίβο με την εικόνα των αγγελιών — αλλά στα χρώματα του TaskNow και
 * με ΤΟ ΠΟΣΟ ως κύριο στοιχείο, γιατί αυτό είναι που κάνει κάποιον να πατήσει.
 *
 * ΤΟ ΠΟΣΟ ΜΕΝΕΙ ΣΚΟΥΡΟ ΣΕ ΛΕΥΚΟ, όχι πορτοκαλί σε πορτοκαλί: μεγάλα ποσά με
 * έντονο χρώμα πάνω σε χρωματιστό φόντο μοιάζουν με διαφήμιση στοιχηματικής.
 * Ίδιος κανόνας με την οθόνη (components/tasknow/amount.tsx).
 *
 * ΤΟ «ΜΑΚΕΤΑ» ΕΙΝΑΙ ΠΑΝΩ ΣΤΗΝ ΕΙΚΟΝΑ. Όποιος τη δει στο Facebook δεν έχει
 * μπροστά του τη σελίδα μας για να διαβάσει την προειδοποίηση — έχει μόνο την
 * εικόνα. Όταν οι μικροδουλειές γίνουν αληθινές, φεύγει η κορδέλα.
 *
 * Φτιάχνεται την ώρα του χτισίματος, άρα δεν επιβαρύνει τον server.
 */
export const dynamic = 'force-static';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Μικροδουλειά στο TaskNow';

const MOCK = true;

/** Ίδιος λόγος με τη σελίδα: άδεια λίστα σταματάει το χτίσιμο. */
export async function generateStaticParams() {
  const ids = SAMPLE_TASKS.filter((t) => !t.hidden).map((t) => ({ id: t.id }));
  return ids.length > 0 ? ids : [{ id: '_none' }];
}

/**
 * Η γραμματοσειρά διαβάζεται από τον φάκελο του έργου, ΔΕΝ κατεβαίνει από το
 * ίντερνετ: η ενσωματωμένη δεν έχει ελληνικά και, αν το Google Fonts δεν
 * απαντήσει την ώρα του χτισίματος, βγαίνει σιωπηλά εικόνα με άδεια κουτάκια.
 */
function font(file: string): Buffer {
  return fs.readFileSync(path.join(process.cwd(), 'src/assets/fonts', file));
}

/**
 * Κεφαλαία στα ελληνικά: ο τόνος φεύγει.
 *
 * Το σκέτο toUpperCase() δίνει «ΚΑΘΑΡΙΌΤΗΤΑ» και «ΗΛΕΚΤΡΟΛΟΓΙΚΆ» — λάθος που
 * το βλέπει αμέσως κάθε Έλληνας, πάνω σε εικόνα που θα κυκλοφορήσει. Τα
 * διαλυτικά μένουν (ΑΫΠΝΙΑ), γι' αυτό αφαιρείται μόνο η οξεία.
 */
function greekUpper(s: string): string {
  return s
    .toUpperCase()
    .normalize('NFD')
    .replace(/\u0301/g, '')
    .normalize('NFC');
}

function clamp(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Όσο πιο μακρύς ο τίτλος, τόσο μικρότερα γράμματα — για να χωρέσει. */
function fit(text: string, sizes: Array<[number, number]>, min: number): number {
  for (const [maxChars, px] of sizes) if (text.length <= maxChars) return px;
  return min;
}

const CARD_W = size.width - 60;
const CARD_H = size.height - 60;
const INNER_W = CARD_W - 88;
const AMBER_GRADIENT = 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        marginRight: 16,
        marginTop: 10,
        padding: '14px 26px',
        borderRadius: 18,
        backgroundColor: '#f1f5f9',
        border: '2px solid #e2e8f0',
      }}
    >
      <div style={{ display: 'flex', fontSize: 18, color: '#94a3b8', letterSpacing: 2 }}>
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 4,
          fontSize: fit(value, [[11, 32], [16, 28]], 24),
          fontWeight: 700,
          color: '#0f172a',
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
  const task = SAMPLE_TASKS.find((t) => t.id === id);

  const title = clamp(task?.title ?? 'Μικροδουλειά', 62);
  const category = task ? (CATEGORY_BY_KEY[task.category]?.label ?? '') : '';
  const area = task ? clamp(task.area, 22) : 'Θεσσαλονίκη';
  const when = task ? clamp(task.when, 22) : '';
  const budget = task ? String(task.budget) : '';
  const note = task?.budgetNote ?? 'για όλη τη δουλειά';
  const licensed = task ? isLicensedCategory(task.category) : false;

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
          {/* Η πορτοκαλί λωρίδα του TaskNow */}
          <div style={{ display: 'flex', height: 10, backgroundImage: AMBER_GRADIENT }} />

          {/* Κεφαλίδα: το σήμα, και η κορδέλα ΜΑΚΕΤΑ όσο ισχύει */}
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
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: '#f59e0b',
                  fontSize: 30,
                  color: '#ffffff',
                }}
              >
                ⚡
              </div>
              <div
                style={{
                  display: 'flex',
                  marginLeft: 14,
                  fontSize: 34,
                  fontWeight: 700,
                  letterSpacing: -0.8,
                }}
              >
                <div style={{ display: 'flex', color: '#1f2937' }}>Task</div>
                <div style={{ display: 'flex', color: '#f59e0b' }}>Now</div>
              </div>
            </div>

            {MOCK ? (
              <div
                style={{
                  display: 'flex',
                  padding: '8px 18px',
                  borderRadius: 10,
                  backgroundColor: '#111827',
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 2,
                  color: '#fcd34d',
                }}
              >
                ΜΑΚΕΤΑ — ΟΧΙ ΑΛΗΘΙΝΗ ΑΓΓΕΛΙΑ
              </div>
            ) : (
              <div style={{ display: 'flex', fontSize: 22, color: '#94a3b8' }}>staffnow.gr</div>
            )}
          </div>

          {/* Σώμα: τίτλος αριστερά, ποσό δεξιά */}
          <div
            style={{
              display: 'flex',
              width: CARD_W,
              flexGrow: 1,
              alignItems: 'center',
              padding: '0 44px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', width: INNER_W - 300 }}>
              <div style={{ display: 'flex', fontSize: 19, color: '#b45309', letterSpacing: 3 }}>
                ΜΙΚΡΟΔΟΥΛΕΙΑ{category ? ` · ${greekUpper(category)}` : ''}
              </div>

              <div
                style={{
                  display: 'flex',
                  width: INNER_W - 300,
                  marginTop: 10,
                  fontSize: fit(title, [[26, 60], [40, 50], [52, 42]], 36),
                  fontWeight: 700,
                  color: '#0f172a',
                  lineHeight: 1.1,
                  letterSpacing: -1.5,
                }}
              >
                {title}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', width: INNER_W - 300, marginTop: 8 }}>
                <Fact label="ΠΕΡΙΟΧΗ" value={area} />
                {when ? <Fact label="ΠΟΤΕ" value={when} /> : null}
              </div>
            </div>

            {/* Το ποσό: σκούρο σε λευκό, όπως και στην οθόνη */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                width: 300,
              }}
            >
              <div style={{ display: 'flex', fontSize: 22, color: '#94a3b8' }}>δίνει</div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  fontSize: 116,
                  fontWeight: 700,
                  color: '#0f172a',
                  letterSpacing: -4,
                  lineHeight: 1,
                }}
              >
                {budget}
                <div style={{ display: 'flex', fontSize: 56, color: '#94a3b8', marginLeft: 4 }}>
                  €
                </div>
              </div>
              <div style={{ display: 'flex', marginTop: 8, fontSize: 24, color: '#64748b' }}>
                {note}
              </div>
            </div>
          </div>

          {/* Πόδι: ο περιορισμός της άδειας, ή η προτροπή */}
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
            {licensed ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '9px 20px',
                  borderRadius: 999,
                  backgroundColor: '#fef2f2',
                  border: '2px solid #fecaca',
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#b91c1c',
                }}
              >
                Θέλει επαγγελματική άδεια — προσφορά μόνο με ανέβασμα άδειας
              </div>
            ) : (
              <div style={{ display: 'flex', fontSize: 24, color: '#64748b' }}>
                Κάνε προσφορά με δικό σου ποσό στο staffnow.gr/tasknow
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
