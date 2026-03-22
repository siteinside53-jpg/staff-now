import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import { success, error } from '../lib/response';
import { generateId } from '../lib/id';

const uploads = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// Allowed MIME types and their extensions
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// POST / — multipart file upload to R2
uploads.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const r2 = c.env.R2;

  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return error(c, 'Μη έγκυρα δεδομένα φόρμας', 400);
  }

  const file = formData.get('file') as File | null;
  const category = (formData.get('category') as string) || 'general';

  if (!file) {
    return error(c, 'Δεν βρέθηκε αρχείο', 400);
  }

  // Validate MIME type
  const mimeType = file.type;
  if (!ALLOWED_TYPES[mimeType]) {
    return error(
      c,
      `Μη αποδεκτός τύπος αρχείου. Επιτρέπονται: ${Object.keys(ALLOWED_TYPES).join(', ')}`,
      400
    );
  }

  // Validate file size
  const isImage = mimeType.startsWith('image/');
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;

  if (file.size > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    return error(c, `Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: ${maxMB}MB`, 400);
  }

  // Generate unique key
  const ext = ALLOWED_TYPES[mimeType];
  const fileId = generateId();
  const key = `${category}/${user.id}/${fileId}.${ext}`;

  // Upload to R2
  const arrayBuffer = await file.arrayBuffer();

  await r2.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: mimeType,
    },
    customMetadata: {
      userId: user.id,
      originalName: file.name,
      category,
      uploadedAt: new Date().toISOString(),
    },
  });

  // Construct the public URL
  // This assumes R2 is configured with a custom domain or public access
  const url = `https://${c.env.R2_PUBLIC_DOMAIN || 'cdn.staffnow.app'}/${key}`;

  return success(
    c,
    {
      url,
      key,
      fileName: file.name,
      fileSize: file.size,
      mimeType,
      category,
    },
    201
  );
});

// POST /presign — return a presigned upload URL for direct client uploads
uploads.post('/presign', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    fileName: string;
    mimeType: string;
    fileSize: number;
    category?: string;
  }>();

  const { fileName, mimeType, fileSize, category = 'general' } = body;

  if (!fileName || !mimeType) {
    return error(c, 'Λείπουν απαιτούμενα πεδία (fileName, mimeType)', 400);
  }

  // Validate MIME type
  if (!ALLOWED_TYPES[mimeType]) {
    return error(
      c,
      `Μη αποδεκτός τύπος αρχείου. Επιτρέπονται: ${Object.keys(ALLOWED_TYPES).join(', ')}`,
      400
    );
  }

  // Validate file size
  const isImage = mimeType.startsWith('image/');
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;

  if (fileSize > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    return error(c, `Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: ${maxMB}MB`, 400);
  }

  // Generate unique key
  const ext = ALLOWED_TYPES[mimeType];
  const fileId = generateId();
  const key = `${category}/${user.id}/${fileId}.${ext}`;

  // Create a presigned URL for multipart upload
  // R2 supports creating multipart uploads
  const multipartUpload = await c.env.R2.createMultipartUpload(key, {
    httpMetadata: {
      contentType: mimeType,
    },
    customMetadata: {
      userId: user.id,
      originalName: fileName,
      category,
      uploadedAt: new Date().toISOString(),
    },
  });

  const url = `https://${c.env.R2_PUBLIC_DOMAIN || 'cdn.staffnow.app'}/${key}`;

  return success(c, {
    uploadId: multipartUpload.uploadId,
    key,
    url,
    maxSize,
    allowedType: mimeType,
  });
});

export default uploads;
