import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import https from 'https';
import * as dotenv from 'dotenv';
import { and, asc, desc, eq } from 'drizzle-orm';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import {
  activityLogs,
  classOfficers,
  classes,
  competitionCategories,
  feedPosts,
  libraryResources,
  participants,
  platformSettings,
  posters,
  students,
  users,
  weeklyResults,
} from './src/db/schema.ts';
import {
  CATEGORY_LIMITS,
  CLASS_OFFICER_ROLES,
  LIBRARY_CATEGORIES,
  RESULT_CATEGORIES,
  VALID_CATEGORIES,
  VALID_CLASSES,
  createParticipantWithPoster,
  createSessionToken,
  deleteParticipantWithPoster,
  ensureInitialSeedData,
  getUserByEmail,
  hashPassword,
  isValidClass,
  logActivity,
  regeneratePosterForClassCategory,
  updateParticipantWithPoster,
} from './src/db/repository.ts';
import {
  AuthRequest,
  canAccessClass,
  requireAuth,
  requireGlobalControl,
  requireSuperAdmin,
} from './src/middleware/auth.ts';
import {
  getSupabaseClient,
  testSupabaseConnection,
  syncToSupabaseTable,
  getSupabaseConfig,
  setSupabaseCredentials,
} from './src/lib/supabase.ts';
import { uploadToImgBB, DEFAULT_IMGBB_API_KEY } from './src/lib/imgbb.ts';

dotenv.config();

export const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// Enable CORS for API requests
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Accept, X-Requested-With'
  );
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Ensure uploads directory exists (safely handle read-only serverless filesystems)
const uploadsDir = path.join(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn('Uploads directory creation skipped (read-only filesystem):', err);
}

export function safeSaveUploadedBuffer(
  fileName: string,
  buffer: Buffer,
  mimeType: string = 'image/png'
): string {
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${fileName}`;
  } catch {
    try {
      const tmpPath = path.join(os.tmpdir(), fileName);
      fs.writeFileSync(tmpPath, buffer);
      return `/uploads/${fileName}`;
    } catch {
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    }
  }
}

// Serve generated scholar portraits from src/assets/images
const generatedImagesDir = path.join(process.cwd(), 'src/assets/images');
if (fs.existsSync(generatedImagesDir)) {
  app.use(
    '/assets/images',
    express.static(generatedImagesDir, {
      setHeaders: (res, filePath) => {
        try {
          const sample = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' }).slice(0, 60);
          if (sample.includes('<svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
          }
        } catch {}
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'public, max-age=86400');
      },
    })
  );
}

// Serve uploaded files safely with nosniff to prevent script execution
if (fs.existsSync(uploadsDir)) {
  app.use(
    '/uploads',
    express.static(uploadsDir, {
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'");
      },
    })
  );
}

app.use(
  '/uploads',
  express.static(os.tmpdir(), {
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'");
    },
  })
);

// Simple in-memory rate limiter for authentication endpoints
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (record.count >= 20) {
    return false;
  }
  record.count += 1;
  return true;
}

// ============================================================================
// 0. IMGBB IMAGE STORAGE ENDPOINTS (API KEY: 7443bf294f338b5a0c690e7de1fc2acd)
// ============================================================================

app.post('/api/public/upload-poster', async (req: Request, res: Response) => {
  try {
    const { fileName, base64Data } = req.body || {};
    if (!base64Data) {
      return res.status(400).json({ error: 'Image base64 data is required.' });
    }

    const cleanName = String(fileName || `poster_${Date.now()}.png`);
    const imgbbRes = await uploadToImgBB(base64Data, cleanName);

    if (imgbbRes.success && imgbbRes.displayUrl) {
      return res.json({
        fileUrl: imgbbRes.displayUrl,
        url: imgbbRes.displayUrl,
        displayUrl: imgbbRes.displayUrl,
        provider: 'imgbb',
        fileName: cleanName,
      });
    }

    // Fallback if ImgBB fails
    let buffer: Buffer;
    let mimeType = 'image/png';
    if (base64Data.includes('data:') && base64Data.includes(';base64,')) {
      mimeType = base64Data.split(';')[0].replace('data:', '');
      buffer = Buffer.from(base64Data.split(';base64,')[1], 'base64');
    } else {
      buffer = Buffer.from(base64Data, 'base64');
    }
    const localUrl = safeSaveUploadedBuffer(cleanName, buffer, mimeType);
    return res.json({
      fileUrl: localUrl,
      url: localUrl,
      displayUrl: localUrl,
      provider: 'local',
      fileName: cleanName,
      warning: imgbbRes.error,
    });
  } catch (err: any) {
    console.error('Error in /api/public/upload-poster:', err);
    return res.status(500).json({ error: err.message || 'Poster upload failed.' });
  }
});

app.post('/api/admin/upload', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { fileName, base64Data } = req.body || {};
    if (!base64Data) {
      return res.status(400).json({ error: 'Image data is required.' });
    }

    const cleanName = String(fileName || `ilm_upload_${Date.now()}.png`);
    const imgbbRes = await uploadToImgBB(base64Data, cleanName);

    if (imgbbRes.success && imgbbRes.displayUrl) {
      return res.json({
        fileUrl: imgbbRes.displayUrl,
        url: imgbbRes.displayUrl,
        displayUrl: imgbbRes.displayUrl,
        provider: 'imgbb',
        fileName: cleanName,
        fileType: 'image',
        fileSize: imgbbRes.size ? `${Math.round(imgbbRes.size / 1024)} KB` : 'Hosted on ImgBB',
      });
    }

    // Fallback if ImgBB fails
    let buffer: Buffer;
    let mimeType = 'image/png';
    if (base64Data.includes('data:') && base64Data.includes(';base64,')) {
      mimeType = base64Data.split(';')[0].replace('data:', '');
      buffer = Buffer.from(base64Data.split(';base64,')[1], 'base64');
    } else {
      buffer = Buffer.from(base64Data, 'base64');
    }
    const localUrl = safeSaveUploadedBuffer(cleanName, buffer, mimeType);
    return res.json({
      fileUrl: localUrl,
      url: localUrl,
      displayUrl: localUrl,
      provider: 'local',
      fileName: cleanName,
      fileType: mimeType,
      fileSize: `${Math.round(buffer.length / 1024)} KB`,
      warning: imgbbRes.error,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/upload:', err);
    return res.status(500).json({ error: err.message || 'Upload failed.' });
  }
});

// ============================================================================
// 1. PUBLIC WEBSITE ENDPOINTS (NO LOGIN REQUIRED, SANITIZED PUBLIC FIELDS)
// ============================================================================
app.get('/api/public/bootstrap', async (_req: Request, res: Response) => {
  try {
    await ensureInitialSeedData();
    const [
      allClasses,
      allCategories,
      allStudents,
      allOfficers,
      allParticipants,
      allPosters,
      allFeedPosts,
      allResults,
      allLibrary,
      allSettings,
    ] = await Promise.all([
      db.select().from(classes).orderBy(asc(classes.code)),
      db
        .select()
        .from(competitionCategories)
        .orderBy(asc(competitionCategories.displayOrder)),
      db
        .select()
        .from(students)
        .orderBy(asc(students.classCode), asc(students.admissionNo)),
      db
        .select()
        .from(classOfficers)
        .orderBy(asc(classOfficers.classCode), asc(classOfficers.id)),
      db
        .select()
        .from(participants)
        .where(eq(participants.publicationStatus, 'PUBLISHED'))
        .orderBy(asc(participants.classCode), asc(participants.id)),
      db
        .select()
        .from(posters)
        .where(eq(posters.publicationStatus, 'PUBLISHED'))
        .orderBy(desc(posters.isFeatured), desc(posters.updatedAt), asc(posters.id)),
      db
        .select()
        .from(feedPosts)
        .orderBy(desc(feedPosts.createdAt)),
      db
        .select()
        .from(weeklyResults)
        .where(eq(weeklyResults.publicationStatus, 'PUBLISHED'))
        .orderBy(desc(weeklyResults.resultDate), desc(weeklyResults.id)),
      db
        .select()
        .from(libraryResources)
        .where(eq(libraryResources.publicationStatus, 'PUBLISHED'))
        .orderBy(desc(libraryResources.createdAt)),
      db.select().from(platformSettings),
    ]);

    const publicParticipants = allParticipants.map((p) => ({
      id: p.id,
      admissionNo: p.admissionNo,
      fullName: p.fullName,
      photoUrl: p.photoUrl,
      classCode: p.classCode,
      categoryName: p.categoryName,
      ownTopic: p.ownTopic,
      shortDescription: p.shortDescription,
    }));

    // Sanitize public feed posts (include all non-rejected feed posts so anything posted to feed shows on public Home)
    const publicFeed = allFeedPosts
      .filter((fp) => fp.status !== 'REJECTED')
      .map((fp) => ({
        id: fp.id,
        classCode: fp.classCode,
        title: fp.title,
        caption: fp.caption,
        mediaUrl: fp.mediaUrl,
        mediaType: fp.mediaType,
        submittedByName: fp.submittedByName,
        createdAt: fp.createdAt,
      }));

    // Sanitize public weekly results (no admin emails)
    const publicResults = allResults.map((r) => ({
      id: r.id,
      resultCategory: r.resultCategory,
      winnerName: r.winnerName,
      winnerPhotoUrl: r.winnerPhotoUrl,
      winnerClass: r.winnerClass,
      weekLabel: r.weekLabel,
      resultDate: r.resultDate,
      remarks: r.remarks,
      createdAt: r.createdAt,
    }));

    // Sanitize public library resources
    const publicLibrary = allLibrary.map((lr) => ({
      id: lr.id,
      title: lr.title,
      description: lr.description,
      author: lr.author,
      category: lr.category,
      libraryScope: lr.libraryScope,
      fileUrl: lr.fileUrl,
      fileType: lr.fileType,
      fileSize: lr.fileSize,
      contentPreview: lr.contentPreview,
      createdAt: lr.createdAt,
    }));

    const settingsMap: Record<string, string> = {};
    for (const s of allSettings) {
      settingsMap[s.settingKey] = s.settingValue;
    }

    res.json({
      classes: allClasses.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description,
      })),
      categories: allCategories,
      students: allStudents.map((s) => ({
        id: s.id,
        admissionNo: s.admissionNo,
        fullName: s.fullName,
        classCode: s.classCode,
        photoUrl: s.photoUrl,
        bio: s.bio,
      })),
      classOfficers: allOfficers.map((o) => ({
        id: o.id,
        classCode: o.classCode,
        roleTitle: o.roleTitle,
        holderName: o.holderName,
        admissionNo: o.admissionNo,
        photoUrl: o.photoUrl,
        responsibilities: o.responsibilities,
      })),
      participants: publicParticipants,
      posters: allPosters,
      feedPosts: publicFeed,
      weeklyResults: publicResults,
      libraryResources: publicLibrary,
      settings: settingsMap,
    });
  } catch (error: any) {
    console.error('Error in /api/public/bootstrap:', error);
    res
      .status(500)
      .json({ error: 'Failed to load public platform content. Please try again.' });
  }
});

// ============================================================================
// 2. ADMINISTRATOR AUTHENTICATION ENDPOINTS
// ============================================================================
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(ip)) {
      return res.status(429).json({
        error: 'Too many login attempts. Please wait a minute before trying again.',
      });
    }
    await ensureInitialSeedData();
    const { email, username, identifier, password } = req.body || {};
    const userIdentifier = String(email || username || identifier || '').trim();
    if (!userIdentifier || !password) {
      return res
        .status(400)
        .json({ error: 'Username or email and password are required.' });
    }
    const dbUser = await getUserByEmail(userIdentifier);
    if (!dbUser || !dbUser.passwordHash) {
      return res
        .status(401)
        .json({ error: 'Invalid username/email or password.' });
    }
    if (dbUser.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'This administrator account has been deactivated by the Super Admin.',
      });
    }
    const incomingHash = hashPassword(String(password));
    if (incomingHash !== dbUser.passwordHash) {
      return res
        .status(401)
        .json({ error: 'Invalid username/email or password.' });
    }
    const token = createSessionToken({
      uid: dbUser.uid,
      email: dbUser.email,
      role: dbUser.role,
      assignedClass: dbUser.assignedClass,
    });
    await logActivity({
      actorEmail: dbUser.email,
      actorRole: dbUser.role,
      action: 'ADMIN_LOGIN',
      targetType: 'AUTH',
      classCode: dbUser.assignedClass || undefined,
      details: `${dbUser.name} (${dbUser.role}) signed in to the administration portal.`,
    });
    return res.json({
      token,
      user: {
        id: dbUser.id,
        uid: dbUser.uid,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        assignedClass: dbUser.assignedClass,
        status: dbUser.status,
      },
    });
  } catch (error: any) {
    console.error('Login failed:', error);
    return res.status(500).json({ error: 'Authentication service failed.' });
  }
});

app.post('/api/auth/password-reset', async (req: Request, res: Response) => {
  try {
    const ip = req.ip || 'unknown';
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please wait.' });
    }
    const { email, currentPassword, newPassword } = req.body || {};
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Email, current password, and new password (min 8 chars) are required.',
      });
    }
    if (String(newPassword).length < 8) {
      return res
        .status(400)
        .json({ error: 'New password must be at least 8 characters long.' });
    }
    const dbUser = await getUserByEmail(String(email));
    if (!dbUser || dbUser.passwordHash !== hashPassword(String(currentPassword))) {
      return res
        .status(401)
        .json({ error: 'Invalid email or current password verification.' });
    }
    await db
      .update(users)
      .set({
        passwordHash: hashPassword(String(newPassword)),
        passwordPlain: String(newPassword),
        updatedAt: new Date(),
      })
      .where(eq(users.id, dbUser.id));

    await logActivity({
      actorEmail: dbUser.email,
      actorRole: dbUser.role,
      action: 'PASSWORD_RESET',
      targetType: 'USER',
      targetId: String(dbUser.id),
      details: `Administrator ${dbUser.email} updated their account password.`,
    });

    return res.json({ message: 'Password updated successfully. You may now log in.' });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'Failed to update password.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res: Response) => {
  return res.json({ user: req.adminUser });
});

// ============================================================================
// 3. PROTECTED ADMIN DASHBOARD DATA ENDPOINT (STRICT CLASS ISOLATION)
// ============================================================================
app.get(
  '/api/admin/dashboard',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      await ensureInitialSeedData();
      const admin = req.adminUser!;

      const allCategories = await db
        .select()
        .from(competitionCategories)
        .orderBy(asc(competitionCategories.displayOrder));

      const allResults = await db
        .select()
        .from(weeklyResults)
        .orderBy(desc(weeklyResults.resultDate), desc(weeklyResults.id));

      if (admin.role === 'SUPER_ADMIN' || admin.role === 'TEACHER') {
        const [
          allClasses,
          allStudents,
          allOfficers,
          allParticipants,
          allPosters,
          allFeed,
          allLibrary,
          allUsers,
          allLogs,
          allSettings,
        ] = await Promise.all([
          db.select().from(classes).orderBy(asc(classes.code)),
          db
            .select()
            .from(students)
            .orderBy(asc(students.classCode), asc(students.admissionNo)),
          db
            .select()
            .from(classOfficers)
            .orderBy(asc(classOfficers.classCode), asc(classOfficers.id)),
          db
            .select()
            .from(participants)
            .orderBy(asc(participants.classCode), desc(participants.id)),
          db
            .select()
            .from(posters)
            .orderBy(asc(posters.classCode), desc(posters.updatedAt)),
          db.select().from(feedPosts).orderBy(desc(feedPosts.createdAt)),
          db
            .select()
            .from(libraryResources)
            .orderBy(desc(libraryResources.createdAt)),
          admin.role === 'SUPER_ADMIN'
            ? db.select().from(users).orderBy(asc(users.role), asc(users.assignedClass))
            : Promise.resolve([]),
          db
            .select()
            .from(activityLogs)
            .orderBy(desc(activityLogs.createdAt))
            .limit(100),
          db.select().from(platformSettings),
        ]);

        const settingsMap: Record<string, string> = {};
        for (const s of allSettings) {
          settingsMap[s.settingKey] = s.settingValue;
        }

        return res.json({
          user: admin,
          classes: allClasses,
          categories: allCategories,
          students: allStudents,
          classOfficers: allOfficers,
          participants: allParticipants,
          posters: allPosters,
          feedPosts: allFeed,
          weeklyResults: allResults,
          libraryResources: allLibrary,
          users:
            admin.role === 'SUPER_ADMIN'
              ? allUsers.map((u) => ({
                  id: u.id,
                  uid: u.uid,
                  email: u.email,
                  name: u.name,
                  role: u.role,
                  assignedClass: u.assignedClass,
                  status: u.status,
                  passwordPlain: u.passwordPlain || '',
                  createdAt: u.createdAt,
                  updatedAt: u.updatedAt,
                }))
              : [],
          activityLogs: allLogs,
          settings: settingsMap,
        });
      }

      // CLASS_ADMIN: Strictly isolate all data to admin.assignedClass
      const assignedClass = admin.assignedClass;
      if (!assignedClass || !isValidClass(assignedClass)) {
        return res.status(403).json({
          error: 'Class Admin account does not have a valid assigned class (U1–U6).',
        });
      }

      const [
        assignedClassRows,
        classStudents,
        classOfficersRows,
        classParticipants,
        classPosters,
        classFeed,
        classLibrary,
        classLogs,
      ] = await Promise.all([
        db.select().from(classes).where(eq(classes.code, assignedClass)),
        db
          .select()
          .from(students)
          .where(eq(students.classCode, assignedClass))
          .orderBy(asc(students.admissionNo)),
        db
          .select()
          .from(classOfficers)
          .where(eq(classOfficers.classCode, assignedClass))
          .orderBy(asc(classOfficers.id)),
        db
          .select()
          .from(participants)
          .where(eq(participants.classCode, assignedClass))
          .orderBy(desc(participants.id)),
        db
          .select()
          .from(posters)
          .where(eq(posters.classCode, assignedClass))
          .orderBy(desc(posters.updatedAt)),
        db
          .select()
          .from(feedPosts)
          .where(eq(feedPosts.classCode, assignedClass))
          .orderBy(desc(feedPosts.createdAt)),
        db
          .select()
          .from(libraryResources)
          .where(eq(libraryResources.libraryScope, assignedClass))
          .orderBy(desc(libraryResources.createdAt)),
        db
          .select()
          .from(activityLogs)
          .where(eq(activityLogs.classCode, assignedClass))
          .orderBy(desc(activityLogs.createdAt))
          .limit(50),
      ]);

      return res.json({
        user: admin,
        classes: assignedClassRows,
        categories: allCategories,
        students: classStudents,
        classOfficers: classOfficersRows,
        participants: classParticipants,
        posters: classPosters,
        feedPosts: classFeed,
        weeklyResults: allResults.filter(
          (r) => r.publicationStatus === 'PUBLISHED'
        ),
        libraryResources: classLibrary,
        users: [],
        activityLogs: classLogs,
        settings: {},
      });
    } catch (error: any) {
      console.error('Error loading admin dashboard:', error);
      return res
        .status(500)
        .json({ error: 'Failed to load administrator dashboard data.' });
    }
  }
);

// ============================================================================
// 4. PARTICIPANT MANAGEMENT & AUTOMATIC POSTER GENERATION
// ============================================================================
app.post(
  '/api/admin/participants',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const admin = req.adminUser!;
      const {
        admissionNo,
        fullName,
        photoUrl,
        classCode,
        categoryName,
        ownTopic,
        shortDescription,
        publicationStatus,
      } = req.body || {};

      const targetClass =
        admin.role === 'CLASS_ADMIN' ? admin.assignedClass! : String(classCode || '');

      if (
        admin.role === 'CLASS_ADMIN' &&
        classCode &&
        classCode !== admin.assignedClass
      ) {
        return res.status(403).json({
          error: `Forbidden: Class Admin for ${admin.assignedClass} cannot add participants to class ${classCode}.`,
        });
      }

      if (!canAccessClass(admin, targetClass)) {
        return res.status(403).json({
          error: 'Forbidden: You do not have permission to manage this class.',
        });
      }

      const result = await createParticipantWithPoster({
        admissionNo: admissionNo ? String(admissionNo) : undefined,
        fullName: String(fullName || ''),
        photoUrl: String(photoUrl || ''),
        classCode: targetClass,
        categoryName: String(categoryName || ''),
        ownTopic: ownTopic ? String(ownTopic) : undefined,
        shortDescription: shortDescription ? String(shortDescription) : undefined,
        publicationStatus: publicationStatus || 'PUBLISHED',
        actorEmail: admin.email,
        actorRole: admin.role,
      });

      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || 'Failed to register participant.',
      });
    }
  }
);

app.put(
  '/api/admin/participants/:id',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const admin = req.adminUser!;
      const participantId = Number(req.params.id);
      if (!participantId) {
        return res.status(400).json({ error: 'Valid participant ID is required.' });
      }

      const existingRows = await db
        .select()
        .from(participants)
        .where(eq(participants.id, participantId));

      if (existingRows.length === 0) {
        return res.status(404).json({ error: 'Participant not found.' });
      }
      const existing = existingRows[0];

      if (!canAccessClass(admin, existing.classCode)) {
        return res.status(403).json({
          error: `Forbidden: You cannot modify participants in class ${existing.classCode}.`,
        });
      }

      const {
        admissionNo,
        fullName,
        photoUrl,
        classCode,
        categoryName,
        ownTopic,
        shortDescription,
        publicationStatus,
      } = req.body || {};

      if (classCode && !canAccessClass(admin, String(classCode))) {
        return res.status(403).json({
          error: `Forbidden: You cannot transfer participants to class ${classCode}.`,
        });
      }

      const result = await updateParticipantWithPoster({
        id: participantId,
        admissionNo,
        fullName,
        photoUrl,
        classCode,
        categoryName,
        ownTopic,
        shortDescription,
        publicationStatus,
        actorEmail: admin.email,
        actorRole: admin.role,
      });

      return res.json(result);
    } catch (error: any) {
      return res
        .status(400)
        .json({ error: error.message || 'Failed to update participant.' });
    }
  }
);

app.delete(
  '/api/admin/participants/:id',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const admin = req.adminUser!;
      const participantId = Number(req.params.id);
      if (!participantId) {
        return res.status(400).json({ error: 'Valid participant ID is required.' });
      }

      const existingRows = await db
        .select()
        .from(participants)
        .where(eq(participants.id, participantId));

      if (existingRows.length === 0) {
        return res.status(404).json({ error: 'Participant not found.' });
      }
      const existing = existingRows[0];

      if (!canAccessClass(admin, existing.classCode)) {
        return res.status(403).json({
          error: `Forbidden: You cannot remove participants from class ${existing.classCode}.`,
        });
      }

      const result = await deleteParticipantWithPoster({
        id: participantId,
        actorEmail: admin.email,
        actorRole: admin.role,
      });

      return res.json(result);
    } catch (error: any) {
      return res
        .status(400)
        .json({ error: error.message || 'Failed to delete participant.' });
    }
  }
);

// ============================================================================
// 4B. STUDENTS ROSTER ENDPOINTS
// ============================================================================
app.post(
  '/api/admin/students',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const admin = req.adminUser!;
      const { admissionNo, fullName, classCode, photoUrl, bio } = req.body || {};
      const targetClass =
        admin.role === 'CLASS_ADMIN'
          ? admin.assignedClass!
          : String(classCode || '');

      if (!isValidClass(targetClass)) {
        return res
          .status(400)
          .json({ error: 'Valid class (U1–U6) is required for student registration.' });
      }

      const cleanAdm = String(admissionNo || '').trim();
      if (!cleanAdm) {
        return res
          .status(400)
          .json({ error: 'Student Admission Number is required.' });
      }

      const inserted = await db
        .insert(students)
        .values({
          admissionNo: cleanAdm,
          fullName: String(fullName || '').trim(),
          classCode: targetClass,
          photoUrl: String(photoUrl || '/assets/images/scholar_portrait_ahmed_1791787523001.jpg'),
          bio: bio ? String(bio).trim() : null,
          createdByEmail: admin.email,
        })
        .returning();

      return res.status(201).json({ student: inserted[0] });
    } catch (error: any) {
      return res
        .status(400)
        .json({ error: error.message || 'Failed to register student.' });
    }
  }
);

app.put(
  '/api/admin/students/:id',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const studentId = Number(req.params.id);
      const { admissionNo, fullName, classCode, photoUrl, bio } = req.body || {};

      const updated = await db
        .update(students)
        .set({
          admissionNo: admissionNo ? String(admissionNo).trim() : undefined,
          fullName: fullName ? String(fullName).trim() : undefined,
          classCode: classCode || undefined,
          photoUrl: photoUrl ? String(photoUrl).trim() : undefined,
          bio: bio !== undefined ? String(bio).trim() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(students.id, studentId))
        .returning();

      return res.json({ student: updated[0] });
    } catch (error: any) {
      return res
        .status(400)
        .json({ error: error.message || 'Failed to update student.' });
    }
  }
);

app.delete(
  '/api/admin/students/:id',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const studentId = Number(req.params.id);
      await db.delete(students).where(eq(students.id, studentId));
      return res.json({ deletedId: studentId });
    } catch (error: any) {
      return res
        .status(400)
        .json({ error: error.message || 'Failed to delete student.' });
    }
  }
);

// ============================================================================
// 5. POSTERS MANAGEMENT ENDPOINTS
// ============================================================================
app.post(
  '/api/admin/posters/regenerate',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const admin = req.adminUser!;
      const { classCode, categoryName } = req.body || {};
      const targetClass =
        admin.role === 'CLASS_ADMIN' ? admin.assignedClass! : String(classCode || '');

      const poster = await regeneratePosterForClassCategory(
        targetClass,
        String(categoryName || 'All Categories')
      );

      return res.json({ poster });
    } catch (error: any) {
      return res
        .status(400)
        .json({ error: error.message || 'Failed to regenerate poster.' });
    }
  }
);

app.patch(
  '/api/admin/posters/:id',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const posterId = Number(req.params.id);
      const {
        publicationStatus,
        isFeatured,
        title,
        subtitle,
        posterImageUrl,
        participantsSnapshot,
      } = req.body || {};

      const updated = await db
        .update(posters)
        .set({
          publicationStatus: publicationStatus || undefined,
          isFeatured: typeof isFeatured === 'boolean' ? isFeatured : undefined,
          title: title ? String(title).trim() : undefined,
          subtitle: subtitle ? String(subtitle).trim() : undefined,
          posterImageUrl: posterImageUrl || undefined,
          participantsSnapshot: participantsSnapshot || undefined,
          updatedAt: new Date(),
        })
        .where(eq(posters.id, posterId))
        .returning();

      return res.json({ poster: updated[0] });
    } catch (error: any) {
      return res
        .status(400)
        .json({ error: error.message || 'Failed to update poster.' });
    }
  }
);

app.patch(
  '/api/public/posters/:id',
  async (req: Request, res: Response) => {
    try {
      const posterId = Number(req.params.id);
      const {
        title,
        subtitle,
        posterImageUrl,
        participantsSnapshot,
        resetToAuto,
      } = req.body || {};

      const existingRows = await db.select().from(posters).where(eq(posters.id, posterId));
      if (existingRows.length === 0) {
        return res.status(404).json({ error: 'Poster not found.' });
      }
      const existing = existingRows[0];

      if (resetToAuto) {
        const regenerated = await regeneratePosterForClassCategory(
          existing.classCode,
          existing.categoryName
        );
        return res.json({ poster: regenerated });
      }

      const updated = await db
        .update(posters)
        .set({
          title: title ? String(title).trim() : existing.title,
          subtitle: subtitle ? String(subtitle).trim() : existing.subtitle,
          posterImageUrl: posterImageUrl || existing.posterImageUrl,
          participantsSnapshot: participantsSnapshot || existing.participantsSnapshot,
          publicationStatus: 'PUBLISHED',
          updatedAt: new Date(),
        })
        .where(eq(posters.id, posterId))
        .returning();

      return res.json({ poster: updated[0] });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to update poster.' });
    }
  }
);

app.post(
  '/api/public/posters/:id/share-to-feed',
  async (req: Request, res: Response) => {
    try {
      const posterId = Number(req.params.id);
      const existingRows = await db.select().from(posters).where(eq(posters.id, posterId));
      if (existingRows.length === 0) {
        return res.status(404).json({ error: 'Poster not found.' });
      }
      const poster = existingRows[0];
      const { title, caption, mediaUrl, submittedByName } = req.body || {};

      const inserted = await db
        .insert(feedPosts)
        .values({
          classCode: poster.classCode,
          title: String(title || `Class ${poster.classCode} Official Poster`).trim(),
          caption: String(caption || `Official Class ${poster.classCode} Competition Poster`).trim(),
          mediaUrl: mediaUrl || poster.posterImageUrl,
          mediaType: 'POSTER',
          status: 'APPROVED',
          submittedByEmail: 'nasirhussin12489@gmail.com',
          submittedByName: String(submittedByName || `Class ${poster.classCode} Poster Studio`).trim(),
        })
        .returning();

      return res.status(201).json({ post: inserted[0] });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to share poster to feed.' });
    }
  }
);

// ============================================================================
// 6. FEED POSTS ENDPOINTS
// ============================================================================
app.post(
  '/api/admin/feed',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const admin = req.adminUser!;
      const { classCode, title, caption, mediaUrl, mediaType } = req.body || {};
      const targetClass =
        admin.role === 'CLASS_ADMIN' ? admin.assignedClass! : String(classCode || '');

      const inserted = await db
        .insert(feedPosts)
        .values({
          classCode: targetClass as any,
          title: String(title || '').trim(),
          caption: String(caption || '').trim(),
          mediaUrl: String(mediaUrl || ''),
          mediaType: mediaType || 'PHOTO',
          status: 'APPROVED',
          submittedByEmail: admin.email,
          submittedByName: admin.name,
        })
        .returning();

      return res.status(201).json({ post: inserted[0] });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to submit feed post.' });
    }
  }
);

app.delete(
  '/api/admin/feed/:id',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const postId = Number(req.params.id);
      await db.delete(feedPosts).where(eq(feedPosts.id, postId));
      return res.json({ deletedId: postId });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to delete feed post.' });
    }
  }
);

app.put(
  '/api/admin/feed/:id',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const postId = Number(req.params.id);
      const { classCode, title, caption, mediaUrl, mediaType, status } = req.body || {};
      const updated = await db
        .update(feedPosts)
        .set({
          classCode: classCode || undefined,
          title: title ? String(title).trim() : undefined,
          caption: caption ? String(caption).trim() : undefined,
          mediaUrl: mediaUrl || undefined,
          mediaType: mediaType || undefined,
          status: status || undefined,
          updatedAt: new Date(),
        })
        .where(eq(feedPosts.id, postId))
        .returning();

      if (updated.length > 0) {
        syncToSupabaseTable('feed_posts', [updated[0]], 'id').catch(() => {});
      }

      return res.json({ post: updated[0] });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to update feed post.' });
    }
  }
);

// ============================================================================
// 7. CLASS OFFICERS MANAGEMENT ENDPOINTS
// ============================================================================
app.post(
  '/api/admin/class-officers',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const admin = req.adminUser!;
      const {
        classCode,
        roleTitle,
        holderName,
        admissionNo,
        photoUrl,
        responsibilities,
      } = req.body || {};

      const targetClass =
        admin.role === 'CLASS_ADMIN' ? admin.assignedClass! : String(classCode || '');

      if (!canAccessClass(admin, targetClass)) {
        return res.status(403).json({
          error: 'Forbidden: You do not have permission to manage officers for this class.',
        });
      }

      const cleanRole = String(roleTitle || '').trim();
      const cleanName = String(holderName || '').trim();
      if (!cleanRole || !cleanName) {
        return res.status(400).json({ error: 'Role title and holder name are required.' });
      }

      // Check if this role already exists in the class
      const existing = await db
        .select()
        .from(classOfficers)
        .where(
          and(
            eq(classOfficers.classCode, targetClass),
            eq(classOfficers.roleTitle, cleanRole)
          )
        );

      let savedOfficer;
      if (existing.length > 0) {
        const updated = await db
          .update(classOfficers)
          .set({
            holderName: cleanName,
            admissionNo: admissionNo ? String(admissionNo).trim() : null,
            photoUrl: String(photoUrl || '/assets/images/scholar_portrait_ahmed_1791787523001.jpg'),
            responsibilities: responsibilities ? String(responsibilities).trim() : null,
            updatedByEmail: admin.email,
            updatedAt: new Date(),
          })
          .where(eq(classOfficers.id, existing[0].id))
          .returning();
        savedOfficer = updated[0];
      } else {
        const inserted = await db
          .insert(classOfficers)
          .values({
            classCode: targetClass,
            roleTitle: cleanRole,
            holderName: cleanName,
            admissionNo: admissionNo ? String(admissionNo).trim() : null,
            photoUrl: String(photoUrl || '/assets/images/scholar_portrait_ahmed_1791787523001.jpg'),
            responsibilities: responsibilities ? String(responsibilities).trim() : null,
            updatedByEmail: admin.email,
          })
          .returning();
        savedOfficer = inserted[0];
      }

      await logActivity({
        actorEmail: admin.email,
        actorRole: admin.role,
        action: 'UPDATE_OFFICER',
        targetType: 'OFFICER',
        targetId: String(savedOfficer.id),
        classCode: targetClass,
        details: `Updated ${cleanRole} for Class ${targetClass}: ${cleanName}`,
      });

      syncToSupabaseTable('class_officers', [savedOfficer], 'id').catch(() => {});

      return res.status(200).json({ officer: savedOfficer });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to save class officer.' });
    }
  }
);

app.delete(
  '/api/admin/class-officers/:id',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const officerId = Number(req.params.id);
      await db.delete(classOfficers).where(eq(classOfficers.id, officerId));
      return res.json({ deletedId: officerId });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to delete class officer.' });
    }
  }
);

// ============================================================================
// 8. WEEKLY COMPETITION RESULTS ENDPOINTS
// ============================================================================
app.post(
  '/api/admin/results',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const admin = req.adminUser!;
      const {
        resultCategory,
        winnerName,
        winnerClass,
        winnerPhotoUrl,
        weekLabel,
        resultDate,
        remarks,
        publicationStatus,
      } = req.body || {};

      if (!resultCategory || !winnerName || !winnerClass) {
        return res.status(400).json({ error: 'Category, winner name, and winner class are required.' });
      }

      const inserted = await db
        .insert(weeklyResults)
        .values({
          resultCategory: String(resultCategory).trim(),
          winnerName: String(winnerName).trim(),
          winnerClass: String(winnerClass).trim(),
          winnerPhotoUrl: String(winnerPhotoUrl || '/assets/images/scholar_portrait_ahmed_1791787523001.jpg'),
          weekLabel: String(weekLabel || 'Week 13').trim(),
          resultDate: String(resultDate || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })),
          remarks: remarks ? String(remarks).trim() : null,
          publicationStatus: publicationStatus || 'PUBLISHED',
          publishedByEmail: admin.email,
        })
        .returning();

      await logActivity({
        actorEmail: admin.email,
        actorRole: admin.role,
        action: 'PUBLISH_RESULT',
        targetType: 'RESULT',
        targetId: String(inserted[0].id),
        classCode: String(winnerClass),
        details: `Published ${resultCategory} result: ${winnerName} (${winnerClass})`,
      });

      syncToSupabaseTable('weekly_results', [inserted[0]], 'id').catch(() => {});

      return res.status(201).json({ result: inserted[0] });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to publish weekly result.' });
    }
  }
);

app.delete(
  '/api/admin/results/:id',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const resultId = Number(req.params.id);
      await db.delete(weeklyResults).where(eq(weeklyResults.id, resultId));
      return res.json({ deletedId: resultId });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to delete result.' });
    }
  }
);

// ============================================================================
// 9. DIGITAL LIBRARY RESOURCES ENDPOINTS
// ============================================================================
app.post(
  '/api/admin/library',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const admin = req.adminUser!;
      const {
        title,
        author,
        category,
        libraryScope,
        description,
        fileUrl,
        fileType,
        fileSize,
        contentPreview,
        publicationStatus,
      } = req.body || {};

      if (!title || !category || !libraryScope) {
        return res.status(400).json({ error: 'Title, category, and library scope are required.' });
      }

      const inserted = await db
        .insert(libraryResources)
        .values({
          title: String(title).trim(),
          author: String(author || admin.name).trim(),
          category: String(category).trim(),
          libraryScope: String(libraryScope).trim(),
          description: String(description || '').trim(),
          fileUrl: String(fileUrl || `#resource-${Date.now()}`),
          fileType: String(fileType || 'PDF Document'),
          fileSize: String(fileSize || '1.0 MB'),
          contentPreview: contentPreview ? String(contentPreview).trim() : null,
          publicationStatus: publicationStatus || 'PUBLISHED',
          uploadedByEmail: admin.email,
        })
        .returning();

      await logActivity({
        actorEmail: admin.email,
        actorRole: admin.role,
        action: 'ADD_LIBRARY_RESOURCE',
        targetType: 'LIBRARY',
        targetId: String(inserted[0].id),
        details: `Uploaded library resource "${title}" (${libraryScope})`,
      });

      syncToSupabaseTable('library_resources', [inserted[0]], 'id').catch(() => {});

      return res.status(201).json({ resource: inserted[0] });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to save library resource.' });
    }
  }
);

app.delete(
  '/api/admin/library/:id',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const resourceId = Number(req.params.id);
      await db.delete(libraryResources).where(eq(libraryResources.id, resourceId));
      return res.json({ deletedId: resourceId });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to delete library resource.' });
    }
  }
);

// ============================================================================
// 10. ADMINISTRATOR USER MANAGEMENT ENDPOINTS (SUPER ADMIN ONLY)
// ============================================================================
app.post(
  '/api/admin/users',
  requireSuperAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const superAdmin = req.adminUser!;
      const {
        name,
        email,
        role,
        assignedClass,
        password,
        replaceExistingClassAdmin,
      } = req.body || {};

      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanName = String(name || '').trim();
      const cleanRole = String(role || 'CLASS_ADMIN').trim();
      const targetClass = cleanRole === 'CLASS_ADMIN' ? String(assignedClass || '').trim() : null;

      if (!cleanEmail || !cleanName || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
      }

      // Check existing email
      const existingByEmail = await db.select().from(users).where(eq(users.email, cleanEmail));
      if (existingByEmail.length > 0) {
        return res.status(400).json({ error: `User with email ${cleanEmail} already exists.` });
      }

      // If Class Admin, handle existing class admin
      if (cleanRole === 'CLASS_ADMIN' && targetClass) {
        const existingClassAdmin = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.role, 'CLASS_ADMIN'),
              eq(users.assignedClass, targetClass),
              eq(users.status, 'ACTIVE')
            )
          );

        if (existingClassAdmin.length > 0) {
          if (!replaceExistingClassAdmin) {
            return res.status(409).json({
              error: `Class ${targetClass} already has an active administrator (${existingClassAdmin[0].name}). Check "Replace existing administrator" to reassign.`,
            });
          }
          await db
            .update(users)
            .set({ status: 'DEACTIVATED', updatedAt: new Date() })
            .where(eq(users.id, existingClassAdmin[0].id));
        }
      }

      const pwHash = hashPassword(String(password));
      const uid = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const inserted = await db
        .insert(users)
        .values({
          uid,
          email: cleanEmail,
          name: cleanName,
          role: cleanRole,
          assignedClass: targetClass,
          status: 'ACTIVE',
          passwordHash: pwHash,
          passwordPlain: String(password),
        })
        .returning();

      await logActivity({
        actorEmail: superAdmin.email,
        actorRole: superAdmin.role,
        action: 'CREATE_USER',
        targetType: 'USER',
        targetId: String(inserted[0].id),
        details: `Created new ${cleanRole} account for ${cleanName} (${cleanEmail})`,
      });

      syncToSupabaseTable('users', [inserted[0]], 'id').catch(() => {});

      return res.status(201).json({ user: inserted[0] });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to create user.' });
    }
  }
);

app.patch(
  '/api/admin/users/:id',
  requireSuperAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const superAdmin = req.adminUser!;
      const userId = Number(req.params.id);
      const {
        email,
        name,
        newPassword,
        status,
        assignedClass,
        role,
      } = req.body || {};

      const updates: any = { updatedAt: new Date() };
      if (email) updates.email = String(email).trim().toLowerCase();
      if (name) updates.name = String(name).trim();
      if (status) updates.status = status;
      if (role) updates.role = role;
      if (assignedClass !== undefined) updates.assignedClass = assignedClass || null;
      if (newPassword) {
        updates.passwordHash = hashPassword(String(newPassword));
        updates.passwordPlain = String(newPassword);
      }

      const updated = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, userId))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }

      await logActivity({
        actorEmail: superAdmin.email,
        actorRole: superAdmin.role,
        action: 'UPDATE_USER',
        targetType: 'USER',
        targetId: String(userId),
        details: `Updated administrator account ${updated[0].email}`,
      });

      syncToSupabaseTable('users', [updated[0]], 'id').catch(() => {});

      return res.json({ user: updated[0] });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to update user.' });
    }
  }
);

app.delete(
  '/api/admin/users/:id',
  requireSuperAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = Number(req.params.id);
      await db.delete(users).where(eq(users.id, userId));
      return res.json({ deletedId: userId });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to delete user.' });
    }
  }
);

// ============================================================================
// 11. PLATFORM SETTINGS & DATABASE MANAGEMENT
// ============================================================================
app.put(
  '/api/admin/settings',
  requireGlobalControl,
  async (req: AuthRequest, res: Response) => {
    try {
      const admin = req.adminUser!;
      const { settings, classDescriptions } = req.body || {};

      if (settings && typeof settings === 'object') {
        for (const [key, val] of Object.entries(settings)) {
          await db
            .insert(platformSettings)
            .values({
              settingKey: key,
              settingValue: String(val ?? ''),
            })
            .onConflictDoUpdate({
              target: platformSettings.settingKey,
              set: {
                settingValue: String(val ?? ''),
                updatedAt: new Date(),
              },
            });
        }
      }

      if (Array.isArray(classDescriptions)) {
        for (const cls of classDescriptions) {
          if (cls.code && cls.description) {
            await db
              .update(classes)
              .set({
                description: String(cls.description).trim(),
                updatedAt: new Date(),
              })
              .where(eq(classes.code, cls.code));
          }
        }
      }

      await logActivity({
        actorEmail: admin.email,
        actorRole: admin.role,
        action: 'UPDATE_SETTINGS',
        targetType: 'SETTINGS',
        details: 'Platform settings and class descriptions updated.',
      });

      return res.json({ message: 'Platform settings saved successfully.' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to save platform settings.' });
    }
  }
);

// ============================================================================
// 12. SUPABASE INTEGRATION ENDPOINTS
// ============================================================================

app.get(
  '/api/admin/supabase-status',
  requireAuth,
  async (_req: AuthRequest, res: Response) => {
    try {
      const cfg = getSupabaseConfig();
      if (!cfg.url || !cfg.key) {
        return res.json({
          configured: false,
          url: cfg.url,
          message: 'Supabase URL or Key not set. Enter your credentials or run supabase_schema.sql in Supabase SQL editor.',
        });
      }
      const test = await testSupabaseConnection(cfg.url, cfg.key);
      return res.json({
        configured: true,
        url: cfg.url,
        success: test.success,
        writeCapable: test.writeCapable,
        message: test.message,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to check Supabase status.' });
    }
  }
);

app.post(
  '/api/admin/supabase-config',
  requireSuperAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { supabaseUrl, supabaseKey } = req.body || {};
      const cleanUrl = String(supabaseUrl || '').trim();
      const cleanKey = String(supabaseKey || '').trim();

      if (!cleanUrl || !cleanKey) {
        return res.status(400).json({ error: 'Supabase URL and Key are required.' });
      }

      const test = await testSupabaseConnection(cleanUrl, cleanKey);
      if (!test.success) {
        return res.status(400).json({ error: test.message });
      }

      // Persist in environment and database settings
      process.env.SUPABASE_URL = cleanUrl;
      process.env.SUPABASE_ANON_KEY = cleanKey;
      process.env.SUPABASE_SERVICE_ROLE_KEY = cleanKey;
      setSupabaseCredentials(cleanUrl, cleanKey);

      await db
        .insert(platformSettings)
        .values({ settingKey: 'SUPABASE_URL', settingValue: cleanUrl })
        .onConflictDoUpdate({
          target: platformSettings.settingKey,
          set: { settingValue: cleanUrl, updatedAt: new Date() },
        });

      await db
        .insert(platformSettings)
        .values({ settingKey: 'SUPABASE_KEY', settingValue: cleanKey })
        .onConflictDoUpdate({
          target: platformSettings.settingKey,
          set: { settingValue: cleanKey, updatedAt: new Date() },
        });

      return res.json({
        success: true,
        message: test.message,
        writeCapable: test.writeCapable,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to configure Supabase.' });
    }
  }
);

app.post(
  '/api/admin/supabase-sync-all',
  requireGlobalControl,
  async (req: AuthRequest, res: Response) => {
    try {
      const cfg = getSupabaseConfig();
      if (!cfg.url || !cfg.key) {
        return res.status(400).json({
          error: 'Supabase credentials are not configured. Please enter your Supabase URL & Key in Settings.',
        });
      }

      const [
        allClasses,
        allCategories,
        allUsers,
        allStudents,
        allOfficers,
        allParticipants,
        allPosters,
        allFeed,
        allResults,
        allLibrary,
        allSettings,
      ] = await Promise.all([
        db.select().from(classes),
        db.select().from(competitionCategories),
        db.select().from(users),
        db.select().from(students),
        db.select().from(classOfficers),
        db.select().from(participants),
        db.select().from(posters),
        db.select().from(feedPosts),
        db.select().from(weeklyResults),
        db.select().from(libraryResources),
        db.select().from(platformSettings),
      ]);

      const results = {
        classes: await syncToSupabaseTable('classes', allClasses, 'code'),
        categories: await syncToSupabaseTable('competition_categories', allCategories, 'name'),
        users: await syncToSupabaseTable('users', allUsers, 'email'),
        students: await syncToSupabaseTable('students', allStudents, 'admission_no'),
        classOfficers: await syncToSupabaseTable('class_officers', allOfficers, 'id'),
        participants: await syncToSupabaseTable('participants', allParticipants, 'id'),
        posters: await syncToSupabaseTable('posters', allPosters, 'id'),
        feedPosts: await syncToSupabaseTable('feed_posts', allFeed, 'id'),
        weeklyResults: await syncToSupabaseTable('weekly_results', allResults, 'id'),
        libraryResources: await syncToSupabaseTable('library_resources', allLibrary, 'id'),
        platformSettings: await syncToSupabaseTable('platform_settings', allSettings, 'setting_key'),
      };

      return res.json({
        success: true,
        message: 'Synchronized all application tables to Supabase.',
        results,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Supabase full sync failed.' });
    }
  }
);

app.get(
  '/api/admin/supabase-schema',
  requireAuth,
  async (_req: AuthRequest, res: Response) => {
    try {
      const schemaPath = path.join(process.cwd(), 'supabase_schema.sql');
      if (!fs.existsSync(schemaPath)) {
        return res.status(404).json({ error: 'supabase_schema.sql file not found.' });
      }
      const sql = fs.readFileSync(schemaPath, 'utf8');
      return res.json({ sql, fileName: 'supabase_schema.sql' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to read Supabase schema.' });
    }
  }
);

// ============================================================================
// 13. IMGBB STORAGE TEST ENDPOINT
// ============================================================================
app.post(
  '/api/admin/imgbb-test',
  requireAuth,
  async (_req: AuthRequest, res: Response) => {
    try {
      // Test upload of a lightweight test image to ImgBB
      const sampleBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9QzwAEjDAGYzAAAO9+CQ9tFhVnAAAAAElFTkSuQmCC';
      const result = await uploadToImgBB(sampleBase64, 'ilm_test_ping.png');
      return res.json({
        success: result.success,
        url: result.url || result.displayUrl,
        message: result.success
          ? '✓ ImgBB API is active and functioning properly with your API key!'
          : `ImgBB returned an error: ${result.error}`,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'ImgBB test failed.' });
    }
  }
);

// ============================================================================
// VITE DEV MIDDLEWARE OR PRODUCTION STATIC ASSETS
// ============================================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`     Local:   http://localhost:${PORT}/`);
    console.log(`     Network: http://0.0.0.0:${PORT}/`);
    console.log(`ILM - Integrated Learning Master server running on port ${PORT}`);
  });

  const cleanup = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
