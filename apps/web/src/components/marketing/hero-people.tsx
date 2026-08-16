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

/** Πόσες στήλες — λιγότερες σε κινητό, να μένει ελαφρύ. */
const COLS = 6;
const ROWS = 5;

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
function Tile({ index, size }: { index: number; size: number }) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const x = col * size;
  const y = row * size;
  const isShop = index % 4 === 3;
  return isShop ? <ShopGlyph x={x} y={y} size={size} /> : <PersonGlyph x={x} y={y} size={size} />;
}

/**
 * Το ίδιο πλέγμα, αλλά με εικόνες — μπαίνει μόνο αν υπάρχουν αρχεία στο
 * `public/hero/`. Οι κανόνες για το ΤΙ επιτρέπεται είναι στο lib/hero-photos.ts.
 */
function PhotoWall({ photos }: { photos: string[] }) {
  // Όσα πλακάκια χρειάζονται για να γεμίσει, επαναλαμβάνοντας τις εικόνες.
  const tiles = Array.from({ length: COLS * ROWS }, (_, i) => photos[i % photos.length]);
  return (
    <div
      className="grid gap-3 p-3"
      style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
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

export function HeroPeople({ photos = [] }: { photos?: string[] }) {
  const SIZE = 96;
  const width = COLS * SIZE;
  const height = ROWS * SIZE;
  const tiles = Array.from({ length: COLS * ROWS }, (_, i) => i);
  const hasPhotos = photos.length > 0;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Δύο αντίγραφα το ένα κάτω από το άλλο: όταν το πρώτο ανέβει όσο το ύψος
          του, το δεύτερο έχει πάρει ήδη τη θέση του — η κύλιση δεν «κόβεται». */}
      <div
        className={`hero-people-track absolute inset-x-0 -top-4 ${
          // Οι εικόνες σηκώνουν λίγη παραπάνω ένταση από τα σχέδια, αλλά μένουν
          // φόντο: το κείμενο από πάνω δεν χάνει ποτέ αντίθεση.
          hasPhotos ? 'opacity-[0.13] grayscale' : 'opacity-[0.055]'
        }`}
      >
        {[0, 1].map((copy) =>
          hasPhotos ? (
            <PhotoWall key={copy} photos={photos} />
          ) : (
            <svg
              key={copy}
              viewBox={`0 0 ${width} ${height}`}
              className="w-full"
              fill="white"
              role="presentation"
            >
              {tiles.map((i) => (
                <Tile key={i} index={i} size={SIZE} />
              ))}
            </svg>
          )
        )}
      </div>

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
