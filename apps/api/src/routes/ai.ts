import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import { hasFeature } from '../middleware/subscription';
import { success, error } from '../lib/response';

const ai = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// =====================================================================
// HELPERS
// =====================================================================

/**
 * Build ROLE-DOMINANT text for a worker.
 * Roles and skills appear FIRST and are REPEATED to dominate the embedding.
 * This ensures a σερβιτόρος gets a very different vector from a μονταδόρος.
 */
function workerToText(p: any, roles: string[], langs: string[]): string {
  const parts: string[] = [];

  // ROLE-DOMINANT: put profession/roles first and repeat 3x for embedding weight
  if (roles.length) {
    parts.push(`PROFESSION: ${roles.join(', ')}`);
    parts.push(`JOB ROLES: ${roles.join(', ')}`);
    parts.push(`SPECIALIZATION: ${roles.join(', ')}`);
  }

  // Skills second (also high signal)
  if (p.skills) {
    try {
      const skills = JSON.parse(p.skills);
      if (Array.isArray(skills) && skills.length) {
        parts.push(`SKILLS: ${skills.join(', ')}`);
        parts.push(`EXPERTISE: ${skills.join(', ')}`);
      }
    } catch {}
  }

  // Bio (medium signal)
  if (p.bio) parts.push(`About: ${p.bio}`);

  // Experience
  if (p.years_of_experience && roles.length) {
    parts.push(`${p.years_of_experience} years experience as ${roles[0]}`);
  } else if (p.years_of_experience) {
    parts.push(`Experience: ${p.years_of_experience} years`);
  }

  // Lower-signal fields
  if (p.city) parts.push(`City: ${p.city}`);
  if (p.region) parts.push(`Region: ${p.region}`);
  if (langs.length) parts.push(`Languages: ${langs.join(', ')}`);
  if (p.employment_type) parts.push(`Type: ${p.employment_type}`);

  return parts.join('. ') || 'No profile data';
}

/**
 * Build ROLE-DOMINANT text for a job.
 * Job title and required roles appear first and are repeated.
 */
function jobToText(j: any, roles: string[]): string {
  const parts: string[] = [];

  // ROLE-DOMINANT: title + roles first, repeated for weight
  if (j.title) {
    parts.push(`JOB TITLE: ${j.title}`);
    parts.push(`POSITION: ${j.title}`);
  }
  if (roles.length) {
    parts.push(`REQUIRED ROLES: ${roles.join(', ')}`);
    parts.push(`LOOKING FOR: ${roles.join(', ')}`);
  }

  // Description (medium signal)
  if (j.description) parts.push(`Description: ${j.description}`);

  // Lower-signal fields
  if (j.city) parts.push(`City: ${j.city}`);
  if (j.region) parts.push(`Region: ${j.region}`);
  if (j.employment_type) parts.push(`Type: ${j.employment_type}`);
  if (j.salary_min || j.salary_max) {
    const sal = j.salary_min && j.salary_max ? `${j.salary_min}-${j.salary_max}€` : `${j.salary_min || j.salary_max}€`;
    parts.push(`Salary: ${sal}`);
  }
  if (j.languages) {
    try {
      const l = JSON.parse(j.languages);
      if (Array.isArray(l)) parts.push(`Languages: ${l.join(', ')}`);
    } catch {}
  }

  return parts.join('. ') || 'No job data';
}

/** Compute cosine similarity between two vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Map raw cosine similarity (typically 0.70–0.98 range for same-domain text)
 * to a human-readable 0–99 percentage with proper spread.
 *
 * Instead of everything being 85-99%, this maps:
 * - < 0.75  → 10-25%  (very poor match)
 * - 0.75-0.82 → 25-45% (weak match)
 * - 0.82-0.88 → 45-65% (moderate match)
 * - 0.88-0.93 → 65-80% (good match)
 * - 0.93-0.97 → 80-92% (very good match)
 * - > 0.97 → 92-99% (excellent match)
 */
function normalizeScore(rawSim: number): number {
  if (rawSim < 0.70) return Math.max(5, Math.round(rawSim * 30));
  if (rawSim < 0.75) return Math.round(10 + (rawSim - 0.70) / 0.05 * 15);
  if (rawSim < 0.82) return Math.round(25 + (rawSim - 0.75) / 0.07 * 20);
  if (rawSim < 0.88) return Math.round(45 + (rawSim - 0.82) / 0.06 * 20);
  if (rawSim < 0.93) return Math.round(65 + (rawSim - 0.88) / 0.05 * 15);
  if (rawSim < 0.97) return Math.round(80 + (rawSim - 0.93) / 0.04 * 12);
  return Math.min(99, Math.round(92 + (rawSim - 0.97) / 0.03 * 7));
}

/**
 * Check if worker roles overlap with job roles.
 * Returns: 1.0 if overlap, 0.5 if partial, 0.3 if none.
 */
function roleOverlapMultiplier(workerRoles: string[], jobRoles: string[]): number {
  if (!workerRoles.length || !jobRoles.length) return 0.7; // unknown → neutral
  const wSet = new Set(workerRoles.map((r) => r.toLowerCase()));
  const matches = jobRoles.filter((r) => wSet.has(r.toLowerCase()));
  if (matches.length > 0) return 1.0;  // direct match
  return 0.4; // no overlap → heavy penalty
}

/** Generate embedding using Workers AI */
async function embed(aiBinding: any, text: string): Promise<number[]> {
  const result = await aiBinding.run('@cf/baai/bge-base-en-v1.5', {
    text: [text],
  });
  return result.data[0]; // array of 768 floats
}

// =====================================================================
// POST /embed/worker/:id — generate + store embedding for a worker
// =====================================================================
ai.post('/embed/worker/:id', requireAuth, async (c) => {
  const workerId = c.req.param('id');
  const db = c.env.DB;

  const profile = await db
    .prepare('SELECT * FROM worker_profiles WHERE user_id = ?')
    .bind(workerId)
    .first();

  if (!profile) return error(c, 'Worker not found', 404);

  const roles = await db
    .prepare('SELECT role FROM worker_profile_roles WHERE worker_profile_id = ?')
    .bind((profile as any).id)
    .all();

  const langs = await db
    .prepare('SELECT language FROM worker_profile_languages WHERE worker_profile_id = ?')
    .bind((profile as any).id)
    .all();

  const text = workerToText(
    profile,
    (roles.results as any[]).map((r) => r.role),
    (langs.results as any[]).map((l) => l.language)
  );

  const vector = await embed(c.env.AI, text);

  await db
    .prepare('UPDATE worker_profiles SET embedding = ? WHERE user_id = ?')
    .bind(JSON.stringify(vector), workerId)
    .run();

  return success(c, { embedded: true, dimensions: vector.length, textLength: text.length });
});

// =====================================================================
// POST /embed/job/:id — generate + store embedding for a job
// =====================================================================
ai.post('/embed/job/:id', requireAuth, async (c) => {
  const jobId = c.req.param('id');
  const db = c.env.DB;

  const job = await db
    .prepare('SELECT * FROM job_listings WHERE id = ?')
    .bind(jobId)
    .first();

  if (!job) return error(c, 'Job not found', 404);

  const roles = await db
    .prepare('SELECT role FROM job_listing_roles WHERE job_listing_id = ?')
    .bind(jobId)
    .all();

  const text = jobToText(job, (roles.results as any[]).map((r) => r.role));
  const vector = await embed(c.env.AI, text);

  await db
    .prepare('UPDATE job_listings SET embedding = ? WHERE id = ?')
    .bind(JSON.stringify(vector), jobId)
    .run();

  return success(c, { embedded: true, dimensions: vector.length });
});

// =====================================================================
// POST /embed/backfill — embed ALL workers and jobs that don't have embeddings yet
// =====================================================================
ai.post('/embed/backfill', requireAuth, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return error(c, 'Admin only', 403);

  const db = c.env.DB;
  let workerCount = 0;
  let jobCount = 0;

  // Backfill workers (batch: max 20 per call to stay within CPU limits)
  const workers = await db
    .prepare('SELECT wp.*, wp.user_id FROM worker_profiles wp WHERE wp.embedding IS NULL LIMIT 20')
    .all();

  for (const wp of workers.results as any[]) {
    try {
      const roles = await db
        .prepare('SELECT role FROM worker_profile_roles WHERE worker_profile_id = ?')
        .bind(wp.id)
        .all();
      const langs = await db
        .prepare('SELECT language FROM worker_profile_languages WHERE worker_profile_id = ?')
        .bind(wp.id)
        .all();

      const text = workerToText(wp, roles.results.map((r: any) => r.role), langs.results.map((l: any) => l.language));
      const vector = await embed(c.env.AI, text);

      await db
        .prepare('UPDATE worker_profiles SET embedding = ? WHERE id = ?')
        .bind(JSON.stringify(vector), wp.id)
        .run();
      workerCount++;
    } catch (err) {
      console.error(`Failed to embed worker ${wp.id}:`, err);
    }
  }

  // Backfill jobs
  const jobs = await db
    .prepare("SELECT * FROM job_listings WHERE embedding IS NULL AND status = 'published' LIMIT 20")
    .all();

  for (const j of jobs.results as any[]) {
    try {
      const roles = await db
        .prepare('SELECT role FROM job_listing_roles WHERE job_listing_id = ?')
        .bind((j as any).id)
        .all();

      const text = jobToText(j, roles.results.map((r: any) => r.role));
      const vector = await embed(c.env.AI, text);

      await db
        .prepare('UPDATE job_listings SET embedding = ? WHERE id = ?')
        .bind(JSON.stringify(vector), (j as any).id)
        .run();
      jobCount++;
    } catch (err) {
      console.error(`Failed to embed job ${(j as any).id}:`, err);
    }
  }

  return success(c, {
    backfilled: { workers: workerCount, jobs: jobCount },
    remaining: {
      workers: (workers.results.length === 20 ? 'more pending' : 'done'),
      jobs: (jobs.results.length === 20 ? 'more pending' : 'done'),
    },
  });
});

// =====================================================================
// GET /match/workers — find best matching workers for a business (uses avg of all job embeddings)
// =====================================================================
ai.get('/match/workers', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);

  // Plan gate: AI Shortlist is for business plans (Starter+). Free businesses
  // do not get AI-ranked candidate suggestions.
  if (user.role === 'business' && !(await hasFeature(db, user.id, 'aiShortlist'))) {
    return c.json(
      {
        success: false,
        error: {
          code: 'AI_SHORTLIST_LOCKED',
          message: 'Το AI Shortlist είναι διαθέσιμο από το πλάνο Starter και πάνω.',
        },
      },
      403,
    );
  }

  // Get the business profile
  const bp = await db
    .prepare('SELECT id FROM business_profiles WHERE user_id = ?')
    .bind(user.id)
    .first<{ id: string }>();

  if (!bp) return success(c, { matches: [], message: 'No business profile' });

  // Get all published jobs for this business with embeddings + roles
  const jobs = await db
    .prepare(
      `SELECT j.id, j.embedding FROM job_listings j WHERE j.business_id = ? AND j.status = 'published' AND j.embedding IS NOT NULL`
    )
    .bind(bp.id)
    .all();

  if (jobs.results.length === 0) {
    return success(c, { matches: [], message: 'No job embeddings found. Create a job first.' });
  }

  // Collect all job roles for this business (for role overlap check)
  const allJobRoles: string[] = [];
  for (const j of jobs.results as any[]) {
    const jr = await db.prepare('SELECT role FROM job_listing_roles WHERE job_listing_id = ?').bind(j.id).all();
    allJobRoles.push(...jr.results.map((r: any) => r.role));
  }
  const uniqueJobRoles = [...new Set(allJobRoles)];

  // Compute average job embedding (centroid)
  const dim = 768;
  const avg = new Array(dim).fill(0);
  let count = 0;
  for (const j of jobs.results as any[]) {
    try {
      const vec: number[] = JSON.parse(j.embedding);
      for (let i = 0; i < dim; i++) avg[i] += vec[i];
      count++;
    } catch {}
  }
  if (count === 0) return success(c, { matches: [] });
  for (let i = 0; i < dim; i++) avg[i] /= count;

  // Get all workers with embeddings
  const workers = await db
    .prepare(
      `SELECT wp.user_id, wp.full_name, wp.photo_url, wp.city, wp.region,
         wp.years_of_experience, wp.availability, wp.employment_type,
         wp.expected_hourly_rate, wp.expected_monthly_salary,
         wp.profile_completeness, wp.verified, wp.embedding, wp.id as wp_id
       FROM worker_profiles wp
       JOIN users u ON u.id = wp.user_id
       WHERE u.status = 'active' AND wp.is_visible = 1 AND wp.embedding IS NOT NULL`
    )
    .all();

  const scored: any[] = [];
  for (const w of workers.results as any[]) {
    try {
      const wVec: number[] = JSON.parse(w.embedding);
      const rawSim = cosineSimilarity(avg, wVec);

      // Get worker roles for overlap check
      const wRoles = await db.prepare('SELECT role FROM worker_profile_roles WHERE worker_profile_id = ?').bind(w.wp_id).all();
      const workerRolesList = wRoles.results.map((r: any) => r.role);

      // Role overlap multiplier (0.4 if no match, 1.0 if match)
      const roleMult = roleOverlapMultiplier(workerRolesList, uniqueJobRoles);

      // Normalized score
      let score = normalizeScore(rawSim);
      score = Math.round(score * roleMult);

      // Small bonuses
      if (w.verified === 1) score = Math.min(99, score + 3);
      if (w.availability === 'immediate') score = Math.min(99, score + 2);

      scored.push({
        id: w.user_id,
        fullName: w.full_name,
        photoUrl: w.photo_url,
        city: w.city,
        region: w.region,
        yearsOfExperience: w.years_of_experience,
        availability: w.availability,
        verified: w.verified === 1,
        matchPercent: score,
      });
    } catch {}
  }

  scored.filter(Boolean)
    .sort((a: any, b: any) => b.matchPercent - a.matchPercent)
    .slice(0, limit);

  return success(c, { matches: scored });
});

// =====================================================================
// GET /match/jobs — find best matching jobs for the current worker
// =====================================================================
ai.get('/match/jobs', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);

  // Get worker embedding
  const wp = await db
    .prepare('SELECT embedding FROM worker_profiles WHERE user_id = ?')
    .bind(user.id)
    .first<{ embedding: string | null }>();

  if (!wp?.embedding) {
    return success(c, { matches: [], message: 'Profile not yet embedded. Please update your profile.' });
  }

  const workerVector: number[] = JSON.parse(wp.embedding);

  // Get all published jobs with embeddings
  const jobs = await db
    .prepare(
      `SELECT j.id, j.title, j.city, j.region, j.employment_type, j.salary_min, j.salary_max,
         j.salary_type, j.embedding, j.created_at,
         bp.company_name, bp.logo_url, bp.user_id as business_user_id
       FROM job_listings j
       LEFT JOIN business_profiles bp ON bp.id = j.business_id
       WHERE j.status = 'published' AND j.embedding IS NOT NULL`
    )
    .all();

  // Compute similarity and rank
  const scored = (jobs.results as any[])
    .map((job) => {
      try {
        const jobVector: number[] = JSON.parse(job.embedding);
        const similarity = cosineSimilarity(workerVector, jobVector);
        const matchPercent = Math.round(similarity * 100);
        return {
          id: job.id,
          title: job.title,
          city: job.city,
          region: job.region,
          employmentType: job.employment_type,
          salaryMin: job.salary_min,
          salaryMax: job.salary_max,
          salaryType: job.salary_type,
          companyName: job.company_name,
          companyLogo: job.logo_url,
          businessUserId: job.business_user_id,
          createdAt: job.created_at,
          matchPercent,
          matchScore: similarity,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return success(c, { matches: scored });
});

// =====================================================================
// GET /match/candidates/:jobId — find best matching workers for a job (employer view)
// =====================================================================
ai.get('/match/candidates/:jobId', requireAuth, async (c) => {
  const jobId = c.req.param('jobId');
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '10', 10), 50);

  // Plan gate: AI candidate ranking is for paying business plans (Starter+).
  const user = c.get('user');
  if (user.role === 'business' && !(await hasFeature(db, user.id, 'aiShortlist'))) {
    return c.json(
      {
        success: false,
        error: {
          code: 'AI_SHORTLIST_LOCKED',
          message: 'Το AI Shortlist είναι διαθέσιμο από το πλάνο Starter και πάνω.',
        },
      },
      403,
    );
  }

  // Get job embedding
  const job = await db
    .prepare('SELECT embedding, title FROM job_listings WHERE id = ?')
    .bind(jobId)
    .first<{ embedding: string | null; title: string }>();

  if (!job?.embedding) {
    return success(c, { candidates: [], message: 'Job not yet embedded.' });
  }

  const jobVector: number[] = JSON.parse(job.embedding);

  // Get all workers with embeddings
  const workers = await db
    .prepare(
      `SELECT wp.user_id, wp.full_name, wp.photo_url, wp.city, wp.region,
         wp.years_of_experience, wp.availability, wp.employment_type,
         wp.expected_hourly_rate, wp.expected_monthly_salary,
         wp.profile_completeness, wp.verified, wp.embedding
       FROM worker_profiles wp
       JOIN users u ON u.id = wp.user_id
       WHERE u.status = 'active' AND wp.is_visible = 1 AND wp.embedding IS NOT NULL`
    )
    .all();

  // Compute similarity and rank
  const scored = (workers.results as any[])
    .map((w) => {
      try {
        const wVector: number[] = JSON.parse(w.embedding);
        const similarity = cosineSimilarity(jobVector, wVector);
        const matchPercent = Math.round(similarity * 100);

        // Bonus scoring: verified (+5%), high completeness (+3%), immediate availability (+4%)
        let bonus = 0;
        if (w.verified === 1) bonus += 5;
        if ((w.profile_completeness || 0) >= 80) bonus += 3;
        if (w.availability === 'immediate') bonus += 4;

        return {
          userId: w.user_id,
          fullName: w.full_name,
          photoUrl: w.photo_url,
          city: w.city,
          region: w.region,
          yearsOfExperience: w.years_of_experience,
          availability: w.availability,
          employmentType: w.employment_type,
          hourlyRate: w.expected_hourly_rate,
          monthlySalary: w.expected_monthly_salary,
          profileCompleteness: w.profile_completeness,
          verified: w.verified === 1,
          matchPercent: Math.min(99, matchPercent + bonus),
          matchScore: similarity,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.matchPercent - a.matchPercent)
    .slice(0, limit);

  return success(c, { jobTitle: job.title, candidates: scored });
});

// =====================================================================
// GET /shortlist/:jobId — auto-shortlist with AI explanation
// =====================================================================
ai.get('/shortlist/:jobId', requireAuth, async (c) => {
  const jobId = c.req.param('jobId');
  const db = c.env.DB;

  // Plan gate: AI Top-5 Shortlist is for paying business plans.
  const user = c.get('user');
  if (user.role === 'business' && !(await hasFeature(db, user.id, 'aiShortlist'))) {
    return c.json(
      {
        success: false,
        error: {
          code: 'AI_SHORTLIST_LOCKED',
          message: 'Το AI Shortlist είναι διαθέσιμο από το πλάνο Starter και πάνω.',
        },
      },
      403,
    );
  }

  // Get job details
  const job = await db
    .prepare('SELECT * FROM job_listings WHERE id = ?')
    .bind(jobId)
    .first();

  if (!job) return error(c, 'Job not found', 404);

  const jobRoles = await db
    .prepare('SELECT role FROM job_listing_roles WHERE job_listing_id = ?')
    .bind(jobId)
    .all();

  // Use the matching endpoint internally
  const jobEmbedding = (job as any).embedding;
  if (!jobEmbedding) {
    return success(c, { shortlist: [], message: 'Job needs embedding first' });
  }

  const jobVector: number[] = JSON.parse(jobEmbedding);

  // Get top 5 workers
  const workers = await db
    .prepare(
      `SELECT wp.*, u.email
       FROM worker_profiles wp
       JOIN users u ON u.id = wp.user_id
       WHERE u.status = 'active' AND wp.is_visible = 1 AND wp.embedding IS NOT NULL`
    )
    .all();

  const scored = (workers.results as any[])
    .map((w) => {
      try {
        const wVector: number[] = JSON.parse(w.embedding);
        const sim = cosineSimilarity(jobVector, wVector);
        let bonus = 0;
        if (w.verified === 1) bonus += 5;
        if ((w.profile_completeness || 0) >= 80) bonus += 3;
        if (w.availability === 'immediate') bonus += 4;
        return { ...w, matchPercent: Math.min(99, Math.round(sim * 100) + bonus), matchScore: sim };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.matchPercent - a.matchPercent)
    .slice(0, 5);

  // Generate "why this candidate" explanations using Workers AI (Llama)
  const jobDesc = jobToText(job, jobRoles.results.map((r: any) => r.role));
  const shortlistWithExplanations = [];

  for (const candidate of scored) {
    const cRoles = await db
      .prepare('SELECT role FROM worker_profile_roles WHERE worker_profile_id = ?')
      .bind(candidate.id)
      .all();
    const cLangs = await db
      .prepare('SELECT language FROM worker_profile_languages WHERE worker_profile_id = ?')
      .bind(candidate.id)
      .all();

    const candidateDesc = workerToText(
      candidate,
      cRoles.results.map((r: any) => r.role),
      cLangs.results.map((l: any) => l.language)
    );

    let explanation = '';
    try {
      const prompt = `Job: ${jobDesc}\n\nCandidate: ${candidateDesc}\n\nMatch: ${candidate.matchPercent}%\n\nExplain in 2-3 short bullet points in Greek why this candidate matches this job. Be specific and practical. Format: bullet points starting with •`;

      const result = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: 'You are a Greek hiring assistant. Write concise bullet points in Greek.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 200,
      });
      explanation = result.response || '';
    } catch {
      // Fallback: rule-based explanation
      const reasons: string[] = [];
      if (candidate.years_of_experience) reasons.push(`• ${candidate.years_of_experience} χρόνια εμπειρίας`);
      if (candidate.city === (job as any).city) reasons.push(`• Στην ίδια πόλη (${candidate.city})`);
      if (candidate.availability === 'immediate') reasons.push('• Διαθέσιμος άμεσα');
      if (candidate.verified) reasons.push('• Επαληθευμένο προφίλ');
      explanation = reasons.join('\n') || '• Γενικά καλό ταίριασμα βάσει προφίλ';
    }

    shortlistWithExplanations.push({
      userId: candidate.user_id,
      fullName: candidate.full_name,
      photoUrl: candidate.photo_url,
      city: candidate.city,
      region: candidate.region,
      yearsOfExperience: candidate.years_of_experience,
      availability: candidate.availability,
      verified: candidate.verified === 1,
      profileCompleteness: candidate.profile_completeness,
      matchPercent: candidate.matchPercent,
      explanation,
    });
  }

  return success(c, {
    jobTitle: (job as any).title,
    shortlist: shortlistWithExplanations,
  });
});

// =====================================================================
// POST /hiring-chat — minimal AI Hiring Chat for businesses (Pro+ only)
// =====================================================================
// One-shot conversational helper for hiring managers. Takes a free-form Greek
// question (e.g. "πώς να γράψω αγγελία για σερβιτόρο εποχικά"), enriches with
// the user's business context, and returns a focused answer using Workers AI.
ai.post('/hiring-chat', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  // Plan gate: aiHiringChat is available on Pro and Elite plans only.
  if (user.role !== 'business' || !(await hasFeature(db, user.id, 'aiHiringChat'))) {
    return c.json(
      {
        success: false,
        error: {
          code: 'AI_HIRING_CHAT_LOCKED',
          message: 'Το AI Hiring Chat είναι διαθέσιμο από το πλάνο Pro και πάνω.',
        },
      },
      403,
    );
  }

  const body = await c.req.json<{
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }>().catch(() => null as any);

  if (!body?.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
    return error(c, 'BAD_REQUEST', 'Παρακαλώ στείλε μήνυμα.', 400);
  }
  if (body.message.length > 2000) {
    return error(c, 'BAD_REQUEST', 'Το μήνυμα είναι πολύ μεγάλο (max 2000 χαρακτήρες).', 400);
  }

  // Pull a tiny amount of business context to ground the assistant.
  // Note: business_profiles has no `city` column — city lives on business_branches.
  const bp = await db
    .prepare(
      `SELECT bp.company_name, bp.business_type, bp.region,
         (SELECT br.city FROM business_branches br WHERE br.user_id = bp.user_id LIMIT 1) as city,
         (SELECT COUNT(*) FROM job_listings WHERE business_id = bp.id AND status = 'published') as active_jobs
       FROM business_profiles bp
       WHERE bp.user_id = ?`,
    )
    .bind(user.id)
    .first<{ company_name: string; business_type: string; region: string; city: string | null; active_jobs: number }>();

  const businessContext = bp
    ? `Επιχείρηση: ${bp.company_name || '—'}, τύπος: ${bp.business_type || '—'}, τοποθεσία: ${[bp.city, bp.region].filter(Boolean).join(', ') || '—'}, ενεργές αγγελίες: ${bp.active_jobs ?? 0}.`
    : 'Άγνωστη επιχείρηση.';

  const systemPrompt = `Είσαι ο επίσημος hiring assistant του StaffNow.gr — ελληνική πλατφόρμα εύρεσης προσωπικού (κυρίως εστίαση/τουρισμός/φιλοξενία). Απαντάς πάντα στα Ελληνικά, σύντομα, πρακτικά, με 3-5 bullets όταν δίνεις βήματα.

ΠΛΑΤΦΟΡΜΑ — πώς δουλεύει:
• Επιχειρήσεις δημιουργούν λογαριασμό → συμπληρώνουν προφίλ επιχείρησης (όνομα, τύπος, περιοχή, λογότυπο, cover photo) → ανεβάζουν αγγελίες → κάνουν swipe σε εργαζόμενους → όταν και η/ο εργαζόμενος δείξει ενδιαφέρον δημιουργείται match και ξεκινά συνομιλία.
• Εργαζόμενοι: εγγραφή → προφίλ (ονοματεπώνυμο, πόλη/περιοχή, ειδικότητες, εμπειρία) → swipe σε αγγελίες → match → chat. Δωρεάν για πάντα.

ΔΟΜΗ DASHBOARD ΕΠΙΧΕΙΡΗΣΗΣ (paths):
• /dashboard — αρχική με stats, onboarding checklist, κάρτα AI Hiring Chat
• /dashboard/profile — προφίλ επιχείρησης (απαιτείται: company_name + (business_type ή τοποθεσία))
• /dashboard/jobs — λίστα αγγελιών + κουμπί "Νέα αγγελία" (φόρμα: τίτλος, πόλη υποχρεωτική, employment type, μισθός, παροχές, περιγραφή, ειδικότητες/roles, branch)
• /dashboard/jobs/edit — επεξεργασία/δημοσίευση/παύση/αρχειοθέτηση
• /dashboard/discover — swipe σε εργαζόμενους με tabs: Εύρεση/Αποθηκευμένα/Αιτήματα/Matched
• /dashboard/matches — ενεργά matches
• /dashboard/messages — chat με matched workers
• /dashboard/billing — συνδρομή, τιμολόγια, αναβάθμιση πλάνου, Founding Members CTA

ΠΛΑΝΑ (μηνιαία τιμή | όριο αγγελιών | features):
• Δωρεάν 0€ | 1 αγγελία | 5 αναζητήσεις/ημέρα, AI Shortlist OFF, Boost OFF, Verified OFF
• Starter 29€ | 3 αγγελίες | AI Top-5 Shortlist ON, Boost OFF
• Pro 79€ (popular) | 10 αγγελίες | + AI Hiring Chat, Boost αγγελίας, Verified Badge, Priority support 24h
• Founding Pro 39€/μήνα (πρώτοι 100 πελάτες — lifetime grandfathered) | ίδιες λειτουργίες με Pro
• Elite 149€ | απεριόριστες αγγελίες & matches | + API access
• Όλα τα πλάνα έχουν -25% στην ετήσια χρέωση.

ΣΥΧΝΕΣ ΑΠΑΝΤΗΣΕΙΣ — πάντα δίνε συγκεκριμένα βήματα/paths:
• "Πώς ανεβάζω αγγελία;" → 1) Πήγαινε στο /dashboard/jobs 2) Πάτησε "Νέα αγγελία" 3) Συμπλήρωσε τίτλο, πόλη, employment type, μισθό, παροχές 4) Πρόσθεσε ειδικότητες (roles) 5) Πάτα "Δημοσίευση". (Προσοχή: αν δεν έχεις ακόμα προφίλ επιχείρησης, πρώτα /dashboard/profile.)
• "Πώς αναβαθμίζω;" → /dashboard/billing → "Επιλέξτε πλάνο" → διάλεξε Pro/Elite + Πληρωμή με κάρτα ή Κατάθεση τραπέζης.
• "Δεν εμφανίζεται η αγγελία στους workers" → έλεγξε status (πρέπει να είναι "published"), branch_id, και αν έχεις φτάσει το όριο του πλάνου σου.
• "Πώς γίνεται match;" → όταν και η επιχείρηση και ο εργαζόμενος κάνουν "ενδιαφέρομαι" → αυτόματα δημιουργείται match και conversation στο /dashboard/messages.

Δεν συστήνεις άλλες πλατφόρμες. Δεν επινοείς features που δεν υπάρχουν παραπάνω. Αν δεν ξέρεις, λες "θα στο διευκρινίσω από info@staffnow.gr".

CONTEXT ΧΡΗΣΤΗ: ${businessContext}`;

  // Bound the history so we don't blow up the prompt.
  const history = (body.history || []).slice(-6);
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 1500) })),
    { role: 'user', content: body.message.trim() },
  ];

  try {
    const result = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages,
      max_tokens: 400,
    });
    const answer = (result as any)?.response || '';
    if (!answer) {
      return error(c, 'AI_EMPTY', 'Δεν επέστρεψε απάντηση η AI υπηρεσία. Δοκίμασε ξανά.', 500);
    }
    return success(c, { answer });
  } catch (err: any) {
    return error(c, 'AI_ERROR', `Σφάλμα AI υπηρεσίας: ${err?.message || 'unknown'}`, 500);
  }
});

export default ai;
