'use client';

/**
 * Το «πλήθος» που αχνοφαίνεται πίσω από το hero.
 *
 * ΤΙ ΕΙΝΑΙ ΚΑΙ ΤΙ ΔΕΝ ΕΙΝΑΙ
 * Είναι διακοσμητική υφή: ανώνυμα σχήματα ανθρώπων και μαγαζιών που κυλούν αργά.
 * ΔΕΝ είναι φωτογραφίες, ΔΕΝ έχει ονόματα, ΔΕΝ έχει νούμερα, ΔΕΝ υπονοεί ποιοι
 * είναι οι χρήστες μας. Αυτό είναι σκόπιμο: φωτογραφίες αρχείου πίσω από τη
 * φράση «η πλατφόρμα που συνδέει επιχειρήσεις με εργαζόμενους» διαβάζονται σαν
 * «αυτοί είναι οι χρήστες μας» — και δεν είναι. Το αληθινό «ζωντανό» το δίνει
 * το πάνελ με τις ΠΡΑΓΜΑΤΙΚΕΣ αγγελίες, όχι το φόντο.
 *
 * ΓΙΑΤΙ ΣΧΕΔΙΑ ΚΑΙ ΟΧΙ ΕΙΚΟΝΕΣ
 * Μηδέν κιλά να κατέβουν. Ένα κολάζ προσώπων θα πρόσθετε εκατοντάδες KB πάνω
 * ακριβώς στην πρώτη οθόνη — στο φθηνό Android που είναι το μισό μας κοινό,
 * αυτό είναι δευτερόλεπτα αναμονής πριν δει την πρώτη λέξη.
 *
 * ΑΝΑΓΝΩΣΙΜΟΤΗΤΑ
 * Ζει κάτω από σκούρο πέπλο και σε πολύ χαμηλή ένταση. Το κείμενο από πάνω δεν
 * χάνει ποτέ αντίθεση — το κοινό μας διαβάζει και έξω, στον ήλιο.
 *
 * ΚΙΝΗΣΗ
 * Μία αργή, σταθερή κύλιση με transform (η κάρτα γραφικών τη βγάζει χωρίς να
 * ξαναϋπολογίζει τη σελίδα). Σταματά εντελώς σε όποιον έχει ζητήσει «μειωμένη
 * κίνηση» από τη συσκευή του.
 */

/**
 * Πόσα σχήματα χωράνε στο πλάτος.
 *
 * Δύο διαφορετικά πλέγματα, όχι ένα. Με το ίδιο πλέγμα παντού, στο κινητό
 * στριμώχνονταν έξι σε 350 πίξελ και γίνονταν κουκκίδες — ψιλόλιγνο μοτίβο
 * αντί για ανθρώπους. Στο κινητό μπαίνουν τρία, άρα διπλάσια σε μέγεθος.
 *
 * ΤΟ ΚΙΝΗΤΟ ΜΕΝΕΙ ΣΤΑ ΤΡΙΑ, ΕΠΙΤΗΔΕΣ. Το πλέγμα δουλεύει με ολόκληρα
 * πλακάκια: το επόμενο σκαλί είναι τέσσερα, που σημαίνει 25% μικρότερα —
 * θα ξαναγύριζε εκεί απ' όπου φύγαμε όταν ζητήθηκε «πιο χοντροκομμένο».
 */
const COLS = 8;
const ROWS = 7;
const COLS_MOBILE = 3;
const ROWS_MOBILE = 4;

/** Σιλουέτα ανθρώπου: κεφάλι + ώμοι. Ένα path, χωρίς λεπτομέρεια. */
function PersonGlyph({ x, y, size }: { x: number; y: number; size: number }) {
  const r = size * 0.17;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx={size / 2} cy={size * 0.32} r={r} />
      <path
        d={`M ${size * 0.18} ${size * 0.86}
            a ${size * 0.32} ${size * 0.3} 0 0 1 ${size * 0.64} 0 Z`}
      />
    </g>
  );
}

/** Μαγαζί: τέντα και βιτρίνα. Το «επιχειρήσεις» της ίδιας ροής. */
function ShopGlyph({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={size * 0.2} y={size * 0.4} width={size * 0.6} height={size * 0.45} rx={size * 0.05} />
      <path d={`M ${size * 0.14} ${size * 0.4} L ${size * 0.24} ${size * 0.22} L ${size * 0.76} ${size * 0.22} L ${size * 0.86} ${size * 0.4} Z`} />
    </g>
  );
}

/** Ένα «πλακάκι» του πλέγματος. Κάθε 4ο είναι μαγαζί, τα υπόλοιπα άνθρωποι. */
function Tile({ index, size, cols }: { index: number; size: number; cols: number }) {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const x = col * size;
  const y = row * size;
  const isShop = index % 4 === 3;
  return isShop ? <ShopGlyph x={x} y={y} size={size} /> : <PersonGlyph x={x} y={y} size={size} />;
}

/**
 * Το ίδιο πλέγμα, αλλά με εικόνες — μπαίνει μόνο αν υπάρχουν αρχεία στο
 * `public/hero/`. Οι κανόνες για το ΤΙ επιτρέπεται είναι στο lib/hero-photos.ts.
 */
function PhotoWall({ photos, cols, rows }: { photos: string[]; cols: number; rows: number }) {
  // Όσα πλακάκια χρειάζονται για να γεμίσει, επαναλαμβάνοντας τις εικόνες.
  const tiles = Array.from({ length: cols * rows }, (_, i) => photos[i % photos.length]);
  return (
    <div
      className="grid gap-3 p-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {tiles.map((src, i) => (
        // Σκέτο <img>: το next/image δεν κάνει τίποτα σε στατικό site, και εδώ
        // δεν θέλουμε καν να «φορτώσει σωστά» — είναι φόντο.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="aspect-square w-full rounded-2xl object-cover"
        />
      ))}
    </div>
  );
}

/** Το κυλιόμενο ταπέτο σε ένα συγκεκριμένο πλέγμα. */
function Track({
  photos,
  cols,
  rows,
  size,
  className,
}: {
  photos: string[];
  cols: number;
  rows: number;
  size: number;
  className: string;
}) {
  const hasPhotos = photos.length > 0;
  const tiles = Array.from({ length: cols * rows }, (_, i) => i);
  return (
    <div
      className={`hero-people-track absolute inset-x-0 -top-4 ${className} ${
        // Οι εικόνες σηκώνουν λίγη παραπάνω ένταση από τα σχέδια, αλλά μένουν
        // φόντο: το κείμενο από πάνω δεν χάνει ποτέ αντίθεση.
        // Οι εικόνες μπορούν πλέον να φαίνονται ΚΑΝΟΝΙΚΑ: το σκούρο πέπλο
        // στο hero-gradient προστατεύει τη ζώνη του κειμένου, οπότε δεν
        // χρειάζεται να τις κρύβουμε για να διαβάζεται ο τίτλος. Πριν το
        // πέπλο ήταν στο 0.13 και μόλις που διακρίνονταν.
        hasPhotos ? 'opacity-40 grayscale' : 'opacity-[0.055]'
      }`}
    >
      {/* Δύο αντίγραφα το ένα κάτω από το άλλο: όταν το πρώτο ανέβει όσο το ύψος
          του, το δεύτερο έχει πάρει ήδη τη θέση του — η κύλιση δεν «κόβεται». */}
      {[0, 1].map((copy) =>
        hasPhotos ? (
          <PhotoWall key={copy} photos={photos} cols={cols} rows={rows} />
        ) : (
          <svg
            key={copy}
            viewBox={`0 0 ${cols * size} ${rows * size}`}
            className="w-full"
            fill="white"
            role="presentation"
          >
            {tiles.map((i) => (
              <Tile key={i} index={i} size={size} cols={cols} />
            ))}
          </svg>
        )
      )}
    </div>
  );
}

export function HeroPeople({ photos = [] }: { photos?: string[] }) {
  const SIZE = 96;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Κινητό: λίγα και μεγάλα. */}
      <Track photos={photos} cols={COLS_MOBILE} rows={ROWS_MOBILE} size={SIZE} className="lg:hidden" />
      {/* Υπολογιστής: ακριβώς όπως ήταν. */}
      <Track photos={photos} cols={COLS} rows={ROWS} size={SIZE} className="hidden lg:block" />

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .hero-people-track {
          animation: heroPeopleScroll 90s linear infinite;
          will-change: transform;
        }
        @keyframes heroPeopleScroll {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(0, -50%, 0); }
        }
        /* Όποιος έχει ζητήσει λιγότερη κίνηση από τη συσκευή του, δεν βλέπει
           καμία. Η υφή μένει ακίνητη — δεν εξαφανίζεται. */
        @media (prefers-reduced-motion: reduce) {
          .hero-people-track { animation: none; }
        }
      `,
        }}
      />
    </div>
  );
}
