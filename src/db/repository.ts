import crypto from 'crypto';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db, ensureDbReady } from './index.ts';
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
} from './schema.ts';
import { buildIlmPosterSvg, svgToDataUrl } from '../lib/posterSvg.ts';

export const VALID_CLASSES = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6'] as const;
export type ValidClassCode = (typeof VALID_CLASSES)[number];

export const CATEGORY_LIMITS: Record<string, number> = {
  Qirat: 1,
  Naat: 5,
  Speech: 5,
  'Table Topic': 5,
  'Aah Counter': 1,
  Evolution: 5,
  Marshal: 1,
  Grammarian: 1,
};

export const VALID_CATEGORIES = Object.keys(CATEGORY_LIMITS);

export const CLASS_OFFICER_ROLES = [
  'Class Teacher',
  'President',
  'Vice President of Membership',
  'Vice President of Education',
  'Vice President of Public Relations',
  'Secretary',
  'Treasurer',
] as const;

export const LIBRARY_CATEGORIES = [
  'Books',
  'Articles',
  'Journals',
  'Research Papers',
  'Notes',
  'Presentations',
  'Videos',
  'Images',
  'Audio',
  'Code Snippets',
  'Bookmarks',
] as const;

export const RESULT_CATEGORIES = ['Best Speaker', 'Best Naat'] as const;

export function isValidClass(code: string): code is ValidClassCode {
  return VALID_CLASSES.includes(code as ValidClassCode);
}

export function hashPassword(password: string): string {
  const salt = 'ilm_integrated_learning_master_v1_salt';
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

const TOKEN_SECRET =
  process.env.SESSION_SECRET ||
  crypto
    .createHash('sha256')
    .update(process.env.SQL_PASSWORD || 'ilm_session_key_2026')
    .digest('hex');

export function createSessionToken(payload: {
  uid: string;
  email: string;
  role: string;
  assignedClass: string | null;
}): string {
  const exp = Date.now() + 1000 * 60 * 60 * 12; // 12 hours expiration
  const data = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return `ilm.${data}.${sig}`;
}

export function verifySessionToken(token: string): {
  uid: string;
  email: string;
  role: string;
  assignedClass: string | null;
} | null {
  try {
    if (!token.startsWith('ilm.')) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [, data, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(data)
      .digest('base64url');
    if (sig !== expectedSig) return null;
    const decoded = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!decoded.exp || Date.now() > decoded.exp) return null;
    return {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
      assignedClass: decoded.assignedClass || null,
    };
  } catch {
    return null;
  }
}

export async function logActivity(params: {
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string;
  classCode?: string;
  details: string;
}) {
  try {
    await db.insert(activityLogs).values({
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId || null,
      classCode: params.classCode || null,
      details: params.details,
    });
  } catch (error) {
    console.error('Failed to write activity log:', error);
  }
}

export async function getOrCreateFirebaseAdminUser(
  uid: string,
  email: string,
  displayName?: string
) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existingByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (existingByEmail.length > 0) {
      const existing = existingByEmail[0];
      if (existing.uid !== uid) {
        const updated = await db
          .update(users)
          .set({ uid, updatedAt: new Date() })
          .where(eq(users.id, existing.id))
          .returning();
        return updated[0];
      }
      return existing;
    }

    // Bootstrap owner email as SUPER_ADMIN
    if (
      normalizedEmail === 'nasirhussain12489@gmail.com' ||
      normalizedEmail === 'nasirhussin12489@gmail.com'
    ) {
      const inserted = await db
        .insert(users)
        .values({
          uid,
          email: normalizedEmail,
          name: displayName || 'Nasir Hussain (Super Admin)',
          role: 'SUPER_ADMIN',
          assignedClass: null,
          status: 'ACTIVE',
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: { email: normalizedEmail, updatedAt: new Date() },
        })
        .returning();
      return inserted[0];
    }

    return null;
  } catch (error) {
    console.error('Database query failed in getOrCreateFirebaseAdminUser:', error);
    throw new Error('Failed to verify administrator account.', { cause: error });
  }
}

export async function getUserByEmailOrUsername(identifier: string) {
  try {
    const raw = String(identifier || '').trim();
    const normalized = raw.toLowerCase();

    // 1. Shorthand alias mappings for seamless login
    if (['admin', 'u1', 'u1admin', 'admin@gmail.com'].includes(normalized)) {
      const u1 = await db.select().from(users).where(eq(users.email, 'admin@gmail.com'));
      if (u1[0]) return u1[0];
    }
    if (['teacher', 'faculty', 'teacher@gmail.com'].includes(normalized)) {
      const tch = await db.select().from(users).where(eq(users.email, 'teacher@gmail.com'));
      if (tch[0]) return tch[0];
    }
    if (['nasir', 'nasirhussin', 'nasirhussain', 'superadmin', 'super', 'nasirhussin12489@gmail.com', 'nasirhussain12489@gmail.com'].includes(normalized)) {
      const sa = await db.select().from(users).where(eq(users.email, 'nasirhussin12489@gmail.com'));
      if (sa[0]) return sa[0];
      const sa2 = await db.select().from(users).where(eq(users.email, 'nasirhussain12489@gmail.com'));
      if (sa2[0]) return sa2[0];
    }
    for (const cls of ['u2', 'u3', 'u4', 'u5', 'u6']) {
      if (normalized === cls || normalized === `${cls}admin`) {
        const classAdm = await db.select().from(users).where(
          and(eq(users.role, 'CLASS_ADMIN'), eq(users.assignedClass, cls.toUpperCase()), eq(users.status, 'ACTIVE'))
        );
        if (classAdm[0]) return classAdm[0];
      }
    }

    // 2. Exact email lookup
    const rows = await db.select().from(users).where(eq(users.email, normalized));
    if (rows[0]) return rows[0];

    // 3. Name lookup (case-insensitive)
    const allUsers = await db.select().from(users);
    const byName = allUsers.find(u => u.name.trim().toLowerCase() === normalized);
    if (byName) return byName;

    return null;
  } catch (error) {
    console.error('Database query failed in getUserByEmailOrUsername:', error);
    throw new Error('Database query failed.', { cause: error });
  }
}

export const getUserByEmail = getUserByEmailOrUsername;

export async function regeneratePosterForClassCategory(
  classCode: string,
  _categoryName?: string
) {
  try {
    if (!isValidClass(classCode)) {
      throw new Error(`Invalid class code: ${classCode}`);
    }

    // Fetch ALL published participants in this class across all 8 competition categories
    const allClassParticipants = await db
      .select()
      .from(participants)
      .where(
        and(
          eq(participants.classCode, classCode),
          eq(participants.publicationStatus, 'PUBLISHED')
        )
      )
      .orderBy(asc(participants.id));

    const classSnapshot = allClassParticipants.map((p) => ({
      id: p.id,
      admissionNo: p.admissionNo || null,
      fullName: p.fullName,
      photoUrl: p.photoUrl,
      classCode: p.classCode,
      categoryName: p.categoryName,
      ownTopic: p.ownTopic || null,
    }));

    const unifiedCategoryLabel = 'All Categories';
    const classTitle = `${classCode} Class Competition Lineup`;
    const classSubtitle = `Unified Class Poster • ${allClassParticipants.length} / 24 Registered Candidates Across Qirat, Naat, Speech, Table Topic, Evolution, Aah Counter, Marshal & Grammarian`;

    const classSvg = buildIlmPosterSvg({
      classCode,
      categoryName: unifiedCategoryLabel,
      title: classTitle,
      subtitle: classSubtitle,
      participants: classSnapshot,
    });
    const classDataUrl = svgToDataUrl(classSvg);

    const existingClassPosters = await db
      .select()
      .from(posters)
      .where(eq(posters.classCode, classCode))
      .orderBy(asc(posters.id));

    let updatedPoster;
    if (existingClassPosters.length > 0) {
      const primaryId = existingClassPosters[0].id;
      const res = await db
        .update(posters)
        .set({
          categoryName: unifiedCategoryLabel,
          title: classTitle,
          subtitle: classSubtitle,
          posterImageUrl: classDataUrl,
          participantsSnapshot: JSON.stringify(classSnapshot),
          participantCount: allClassParticipants.length,
          generationStatus: 'COMPLETED',
          generationError: null,
          updatedAt: new Date(),
        })
        .where(eq(posters.id, primaryId))
        .returning();
      updatedPoster = res[0];

      // Remove any extra split category posters for this class so there is 1 unified poster per class
      for (let i = 1; i < existingClassPosters.length; i++) {
        await db
          .delete(posters)
          .where(eq(posters.id, existingClassPosters[i].id));
      }
    } else {
      const res = await db
        .insert(posters)
        .values({
          classCode,
          categoryName: unifiedCategoryLabel,
          title: classTitle,
          subtitle: classSubtitle,
          posterImageUrl: classDataUrl,
          participantsSnapshot: JSON.stringify(classSnapshot),
          participantCount: allClassParticipants.length,
          generationStatus: 'COMPLETED',
          generationError: null,
          publicationStatus: 'PUBLISHED',
          isFeatured: true,
        })
        .returning();
      updatedPoster = res[0];
    }

    return updatedPoster;
  } catch (error) {
    console.error('Poster generation failed:', error);
    throw new Error('Failed to generate unified class poster.', {
      cause: error,
    });
  }
}

export async function createParticipantWithPoster(params: {
  admissionNo?: string;
  fullName: string;
  photoUrl: string;
  classCode: string;
  categoryName: string;
  ownTopic?: string;
  shortDescription?: string;
  publicationStatus?: string;
  actorEmail: string;
  actorRole: string;
}) {
  const {
    admissionNo,
    fullName,
    photoUrl,
    classCode,
    categoryName,
    ownTopic,
    shortDescription,
    publicationStatus = 'PUBLISHED',
    actorEmail,
    actorRole,
  } = params;

  if (!isValidClass(classCode)) {
    throw new Error(
      `Invalid class '${classCode}'. Only classes U1, U2, U3, U4, U5, and U6 are permitted.`
    );
  }

  const maxAllowed = CATEGORY_LIMITS[categoryName];
  if (!maxAllowed) {
    throw new Error(
      `Invalid competition category '${categoryName}'. Allowed categories: ${VALID_CATEGORIES.join(
        ', '
      )}.`
    );
  }

  if (!fullName || !fullName.trim()) {
    throw new Error('Participant full name is required.');
  }
  if (!photoUrl || !photoUrl.trim()) {
    throw new Error('Participant photograph is required.');
  }

  let createdParticipant;
  try {
    createdParticipant = await db.transaction(async (tx) => {
      // Lock class record to serialize simultaneous capacity checks per class
      await tx.select().from(classes).where(eq(classes.code, classCode));

      const currentInCategory = await tx
        .select()
        .from(participants)
        .where(
          and(
            eq(participants.classCode, classCode),
            eq(participants.categoryName, categoryName)
          )
        );

      if (currentInCategory.length >= maxAllowed) {
        throw new Error(
          `Capacity reached: ${categoryName} in class ${classCode} allows a maximum of ${maxAllowed} participant(s) (${currentInCategory.length}/${maxAllowed} registered).`
        );
      }

      const duplicate = currentInCategory.find(
        (p) => p.fullName.trim().toLowerCase() === fullName.trim().toLowerCase()
      );
      if (duplicate) {
        throw new Error(
          `Duplicate assignment prevented: '${fullName.trim()}' is already registered in ${categoryName} for class ${classCode}.`
        );
      }

      const cleanAdm = admissionNo?.trim() || null;

      // Also sync into students table if admissionNo is provided
      if (cleanAdm) {
        await tx
          .insert(students)
          .values({
            admissionNo: cleanAdm,
            fullName: fullName.trim(),
            classCode,
            photoUrl: photoUrl.trim(),
            bio: shortDescription?.trim() || null,
            createdByEmail: actorEmail,
          })
          .onConflictDoNothing();
      }

      const inserted = await tx
        .insert(participants)
        .values({
          admissionNo: cleanAdm,
          fullName: fullName.trim(),
          photoUrl: photoUrl.trim(),
          classCode,
          categoryName,
          ownTopic: ownTopic?.trim() || null,
          shortDescription: shortDescription?.trim() || null,
          publicationStatus,
          createdByEmail: actorEmail,
        })
        .returning();

      return inserted[0];
    });
  } catch (error: any) {
    console.error('Transaction failed in createParticipantWithPoster:', error);
    throw new Error(error.message || 'Failed to register participant.', {
      cause: error,
    });
  }

  // Automatically generate/update unified class poster
  const poster = await regeneratePosterForClassCategory(classCode, categoryName);

  await logActivity({
    actorEmail,
    actorRole,
    action: 'ADD_PARTICIPANT_AND_GENERATE_POSTER',
    targetType: 'PARTICIPANT',
    targetId: String(createdParticipant.id),
    classCode,
    details: `Registered ${createdParticipant.fullName}${
      createdParticipant.admissionNo ? ` (${createdParticipant.admissionNo})` : ''
    } in ${classCode} (${categoryName}) and auto-updated ${classCode} class poster.`,
  });

  return { participant: createdParticipant, poster };
}

export async function updateParticipantWithPoster(params: {
  id: number;
  admissionNo?: string;
  fullName?: string;
  photoUrl?: string;
  classCode?: string;
  categoryName?: string;
  ownTopic?: string;
  shortDescription?: string;
  publicationStatus?: string;
  actorEmail: string;
  actorRole: string;
}) {
  try {
    const existingRows = await db
      .select()
      .from(participants)
      .where(eq(participants.id, params.id));

    if (existingRows.length === 0) {
      throw new Error('Participant record not found.');
    }
    const existing = existingRows[0];
    const targetClass = params.classCode || existing.classCode;
    const targetCategory = params.categoryName || existing.categoryName;
    const targetName = (params.fullName ?? existing.fullName).trim();

    if (!isValidClass(targetClass)) {
      throw new Error(`Invalid class '${targetClass}'. Only U1–U6 are allowed.`);
    }

    const maxAllowed = CATEGORY_LIMITS[targetCategory];
    if (!maxAllowed) {
      throw new Error(`Invalid competition category '${targetCategory}'.`);
    }

    const updated = await db.transaction(async (tx) => {
      const currentInTarget = await tx
        .select()
        .from(participants)
        .where(
          and(
            eq(participants.classCode, targetClass),
            eq(participants.categoryName, targetCategory)
          )
        );

      const othersInTarget = currentInTarget.filter((p) => p.id !== existing.id);
      if (othersInTarget.length >= maxAllowed) {
        throw new Error(
          `Capacity reached: ${targetCategory} in class ${targetClass} allows a maximum of ${maxAllowed} participant(s).`
        );
      }

      const duplicate = othersInTarget.find(
        (p) => p.fullName.trim().toLowerCase() === targetName.toLowerCase()
      );
      if (duplicate) {
        throw new Error(
          `Duplicate assignment prevented: '${targetName}' is already registered in ${targetCategory} for class ${targetClass}.`
        );
      }

      const res = await tx
        .update(participants)
        .set({
          admissionNo:
            params.admissionNo !== undefined
              ? params.admissionNo.trim() || null
              : existing.admissionNo,
          fullName: targetName,
          photoUrl: (params.photoUrl ?? existing.photoUrl).trim(),
          classCode: targetClass,
          categoryName: targetCategory,
          ownTopic:
            params.ownTopic !== undefined
              ? params.ownTopic.trim() || null
              : existing.ownTopic,
          shortDescription:
            params.shortDescription !== undefined
              ? params.shortDescription
              : existing.shortDescription,
          publicationStatus: params.publicationStatus ?? existing.publicationStatus,
          updatedAt: new Date(),
        })
        .where(eq(participants.id, existing.id))
        .returning();

      return res[0];
    });

    if (
      existing.classCode !== targetClass ||
      existing.categoryName !== targetCategory
    ) {
      await regeneratePosterForClassCategory(
        existing.classCode,
        existing.categoryName
      );
    }

    const poster = await regeneratePosterForClassCategory(
      targetClass,
      targetCategory
    );

    await logActivity({
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      action: 'UPDATE_PARTICIPANT_AND_REGENERATE_POSTER',
      targetType: 'PARTICIPANT',
      targetId: String(updated.id),
      classCode: targetClass,
      details: `Updated participant ${updated.fullName} (${targetClass} • ${targetCategory}) and regenerated poster.`,
    });

    return { participant: updated, poster };
  } catch (error: any) {
    console.error('Failed to update participant:', error);
    throw new Error(error.message || 'Failed to update participant.', {
      cause: error,
    });
  }
}

export async function deleteParticipantWithPoster(params: {
  id: number;
  actorEmail: string;
  actorRole: string;
}) {
  try {
    const existingRows = await db
      .select()
      .from(participants)
      .where(eq(participants.id, params.id));

    if (existingRows.length === 0) {
      throw new Error('Participant record not found.');
    }
    const existing = existingRows[0];

    await db.delete(participants).where(eq(participants.id, existing.id));

    const poster = await regeneratePosterForClassCategory(
      existing.classCode,
      existing.categoryName
    );

    await logActivity({
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      action: 'REMOVE_PARTICIPANT_AND_REGENERATE_POSTER',
      targetType: 'PARTICIPANT',
      targetId: String(existing.id),
      classCode: existing.classCode,
      details: `Removed participant ${existing.fullName} from ${existing.classCode} (${existing.categoryName}) and regenerated poster.`,
    });

    return { removed: existing, poster };
  } catch (error: any) {
    console.error('Failed to delete participant:', error);
    throw new Error(error.message || 'Failed to delete participant.', {
      cause: error,
    });
  }
}

let isSeeding = false;
let seedCompleted = false;
let credentialsSynced = false;

export async function ensureRequestedAdminCredentials(force = false) {
  await ensureDbReady();
  if (credentialsSynced && !force) {
    const existingParts = await db.select().from(participants).limit(1);
    if (existingParts.length > 0) return;
  }
  try {
    const superAdminPwHash = hashPassword('9934886605dilD@');
    const teacherPwHash = hashPassword('123456789teacher');
    const u1AdminPwHash = hashPassword('123456789admin');

    // 1. Ensure both spellings of Super Admin email are active with password 9934886605dilD@
    for (const [uidKey, emailVal] of [
      ['superadmin-nasir-1', 'nasirhussin12489@gmail.com'],
      ['superadmin-owner-uid', 'nasirhussain12489@gmail.com'],
    ] as const) {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, emailVal));

      if (existing.length > 0) {
        await db
          .update(users)
          .set({
            role: 'SUPER_ADMIN',
            assignedClass: null,
            status: 'ACTIVE',
            passwordHash: existing[0].passwordHash || superAdminPwHash,
            passwordPlain: existing[0].passwordPlain || '9934886605dilD@',
            updatedAt: new Date(),
          })
          .where(eq(users.id, existing[0].id));
      } else {
        await db
          .insert(users)
          .values({
            uid: uidKey,
            email: emailVal,
            name: 'Nasir Hussain (Super Admin)',
            role: 'SUPER_ADMIN',
            assignedClass: null,
            status: 'ACTIVE',
            passwordHash: superAdminPwHash,
            passwordPlain: '9934886605dilD@',
          })
          .onConflictDoNothing();
      }
    }

    // 1b. Ensure primary Teacher account (teacher@gmail.com) is active with full control except user management
    const existingTeacher = await db
      .select()
      .from(users)
      .where(eq(users.email, 'teacher@gmail.com'));

    if (existingTeacher.length > 0) {
      await db
        .update(users)
        .set({
          name: existingTeacher[0].name || 'ILM Faculty Teacher',
          role: 'TEACHER',
          assignedClass: null,
          status: 'ACTIVE',
          passwordHash: existingTeacher[0].passwordHash || teacherPwHash,
          passwordPlain: existingTeacher[0].passwordPlain || '123456789teacher',
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingTeacher[0].id));
    } else {
      await db
        .insert(users)
        .values({
          uid: 'teacher-primary-faculty',
          email: 'teacher@gmail.com',
          name: 'ILM Faculty Teacher',
          role: 'TEACHER',
          assignedClass: null,
          status: 'ACTIVE',
          passwordHash: teacherPwHash,
          passwordPlain: '123456789teacher',
        })
        .onConflictDoNothing();
    }

    // 2. Ensure admin@gmail.com is the sole active Class Admin for U1 with password 123456789admin
    const currentU1Admins = await db
      .select()
      .from(users)
      .where(
        and(eq(users.role, 'CLASS_ADMIN'), eq(users.assignedClass, 'U1'))
      );

    for (const adm of currentU1Admins) {
      if (adm.email !== 'admin@gmail.com' && adm.status === 'ACTIVE') {
        await db
          .update(users)
          .set({ status: 'DEACTIVATED', updatedAt: new Date() })
          .where(eq(users.id, adm.id));
      }
    }

    const existingU1 = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@gmail.com'));

    if (existingU1.length > 0) {
      await db
        .update(users)
        .set({
          name: 'U1 Class Admin',
          role: 'CLASS_ADMIN',
          assignedClass: 'U1',
          status: 'ACTIVE',
          passwordHash: existingU1[0].passwordHash || u1AdminPwHash,
          passwordPlain: existingU1[0].passwordPlain || '123456789admin',
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingU1[0].id));
    } else {
      await db
        .insert(users)
        .values({
          uid: 'class-admin-u1-primary',
          email: 'admin@gmail.com',
          name: 'U1 Class Admin',
          role: 'CLASS_ADMIN',
          assignedClass: 'U1',
          status: 'ACTIVE',
          passwordHash: u1AdminPwHash,
          passwordPlain: '123456789admin',
        })
        .onConflictDoNothing();
    }

    // Ensure U2-U6 class admins exist
    for (const cls of ['U2', 'U3', 'U4', 'U5', 'U6'] as const) {
      const clsEmail = `${cls.toLowerCase()}.admin@ilm.edu.pk`;
      const existingCls = await db.select().from(users).where(eq(users.email, clsEmail));
      if (!existingCls.length) {
        await db.insert(users).values({
          uid: `class-admin-${cls.toLowerCase()}-primary`,
          email: clsEmail,
          name: `${cls} Class Admin`,
          role: 'CLASS_ADMIN',
          assignedClass: cls,
          status: 'ACTIVE',
          passwordHash: u1AdminPwHash,
          passwordPlain: '123456789admin',
        }).onConflictDoNothing();
      }
    }

    // Backfill passwordPlain on any other existing admin user if empty
    const allAdminUsers = await db.select().from(users);
    for (const u of allAdminUsers) {
      if (!u.passwordPlain) {
        const defaultPlain =
          u.email === 'nasirhussin12489@gmail.com' ||
          u.email === 'nasirhussain12489@gmail.com'
            ? '9934886605dilD@'
            : u.email === 'teacher@gmail.com'
            ? '123456789teacher'
            : '123456789admin';
        await db
          .update(users)
          .set({ passwordPlain: defaultPlain })
          .where(eq(users.id, u.id));
      }
    }

    await db
      .update(classes)
      .set({ adminEmail: 'admin@gmail.com', updatedAt: new Date() })
      .where(eq(classes.code, 'U1'));

    // 3. Sync exact 8 competition categories & limits
    const categoryMeta = [
      {
        name: 'Qirat',
        maxParticipantsPerClass: 1,
        description: 'Sacred Quranic recitation with Tajweed and spiritual reverence (Max 1 per class).',
        displayOrder: 1,
      },
      {
        name: 'Naat',
        maxParticipantsPerClass: 5,
        description: 'Classical & contemporary Naat recitation honoring poetic cadence and spiritual devotion (Max 5 per class).',
        displayOrder: 2,
      },
      {
        name: 'Speech',
        maxParticipantsPerClass: 5,
        description: 'Prepared public oratory demonstrating persuasive rhetoric, structure, and leadership (Max 5 per class).',
        displayOrder: 3,
      },
      {
        name: 'Table Topic',
        maxParticipantsPerClass: 5,
        description: 'Impromptu speaking challenge testing quick analytical thinking and vocal poise (Max 5 per class).',
        displayOrder: 4,
      },
      {
        name: 'Aah Counter',
        maxParticipantsPerClass: 1,
        description: 'Precision auditory tracking of filler pauses, verbal crutches, and spoken fluency (Max 1 per class).',
        displayOrder: 5,
      },
      {
        name: 'Evolution',
        maxParticipantsPerClass: 5,
        description: 'Constructive analytical feedback and growth synthesis for fellow class speakers (Max 5 per class).',
        displayOrder: 6,
      },
      {
        name: 'Marshal',
        maxParticipantsPerClass: 1,
        description: 'Session protocol officer maintaining parliamentary order, timing discipline, and decorum (Max 1 per class).',
        displayOrder: 7,
      },
      {
        name: 'Grammarian',
        maxParticipantsPerClass: 1,
        description: 'Linguistic steward introducing the Word of the Week and evaluating rhetorical syntax (Max 1 per class).',
        displayOrder: 8,
      },
    ];

    for (const cat of categoryMeta) {
      const existingCat = await db
        .select()
        .from(competitionCategories)
        .where(eq(competitionCategories.name, cat.name));
      if (existingCat.length > 0) {
        await db
          .update(competitionCategories)
          .set({
            maxParticipantsPerClass: cat.maxParticipantsPerClass,
            description: cat.description,
            displayOrder: cat.displayOrder,
          })
          .where(eq(competitionCategories.id, existingCat[0].id));
      } else {
        await db.insert(competitionCategories).values(cat);
      }
    }

    // 4. Seed initial Students & Class Officers if empty
    const pAyesha = '/assets/images/scholar_portrait_ayesha_1791787508872.jpg';
    const pAhmed = '/assets/images/scholar_portrait_ahmed_1791787523001.jpg';
    const pZainab = '/assets/images/scholar_portrait_zainab_1791787533783.jpg';
    const pFaizan = '/assets/images/scholar_portrait_faizan_1791787544478.jpg';

    const existingStudents = await db.select().from(students);
    if (existingStudents.length === 0) {
      const sampleStudents = [
        { admissionNo: 'ADM-U1-101', fullName: 'Areeba Khan', classCode: 'U1', photoUrl: pAyesha, bio: 'Foundation cohort lead speaker.' },
        { admissionNo: 'ADM-U1-102', fullName: 'Usman Farooq', classCode: 'U1', photoUrl: pAhmed, bio: 'Foundation Naat & Qirat scholar.' },
        { admissionNo: 'ADM-U2-201', fullName: 'Ahmed Khan', classCode: 'U2', photoUrl: pAhmed, bio: 'Keynote speaker on ethical leadership.' },
        { admissionNo: 'ADM-U2-202', fullName: 'Faizan Ali', classCode: 'U2', photoUrl: pFaizan, bio: 'Orator focusing on historical synthesis.' },
        { admissionNo: 'ADM-U2-203', fullName: 'Zainab Fatima', classCode: 'U2', photoUrl: pZainab, bio: 'Lead Naat reciter for U2.' },
        { admissionNo: 'ADM-U3-301', fullName: 'Ayesha Khan', classCode: 'U3', photoUrl: pAyesha, bio: 'Distinguished U3 orator.' },
        { admissionNo: 'ADM-U4-401', fullName: 'Hira Suleman', classCode: 'U4', photoUrl: pZainab, bio: 'Senior Evolution lead in Class U4.' },
        { admissionNo: 'ADM-U5-501', fullName: 'Ahmed Raza', classCode: 'U5', photoUrl: pAhmed, bio: 'Honors Naat laureate in Class U5.' },
        { admissionNo: 'ADM-U6-601', fullName: 'Junaid Ahmed', classCode: 'U6', photoUrl: pFaizan, bio: 'Senior Aah Counter & Capstone Scholar in Class U6.' },
      ];
      for (const st of sampleStudents) {
        await db.insert(students).values({ ...st, createdByEmail: 'nasirhussin12489@gmail.com' as any }).onConflictDoNothing();
      }
    }

    const existingOfficers = await db.select().from(classOfficers);
    const officerDefaultsByClass: Record<
      string,
      Array<{
        roleTitle: string;
        holderName: string;
        admissionNo: string;
        photoUrl: string;
        responsibilities: string;
      }>
    > = {
      U1: [
        { roleTitle: 'Class Teacher', holderName: 'Prof. Maulana Tariq Jameel', admissionNo: 'FAC-U1-01', photoUrl: pAhmed, responsibilities: 'Senior Class Teacher & Academic Mentor for Class U1 Foundation Cohort.' },
        { roleTitle: 'President', holderName: 'Areeba Khan', admissionNo: 'ADM-U1-101', photoUrl: pAyesha, responsibilities: 'Presides over Class U1 assemblies and executive council.' },
        { roleTitle: 'Vice President of Membership', holderName: 'Usman Farooq', admissionNo: 'ADM-U1-102', photoUrl: pAhmed, responsibilities: 'Coordinates student onboarding and cohort roster.' },
        { roleTitle: 'Vice President of Education', holderName: 'Sara Maryam', admissionNo: 'ADM-U1-103', photoUrl: pZainab, responsibilities: 'Oversees speech curriculum and weekly category assignments.' },
        { roleTitle: 'Vice President of Public Relations', holderName: 'Bilal Raza', admissionNo: 'ADM-U1-104', photoUrl: pFaizan, responsibilities: 'Manages Class U1 posters, announcements, and showcase.' },
        { roleTitle: 'Secretary', holderName: 'Hafsa Noor', admissionNo: 'ADM-U1-105', photoUrl: pAyesha, responsibilities: 'Maintains official session minutes and attendance records.' },
        { roleTitle: 'Treasurer', holderName: 'Zaid Siddiqui', admissionNo: 'ADM-U1-106', photoUrl: pAhmed, responsibilities: 'Stewards class resources, awards, and event logistics.' },
      ],
      U2: [
        { roleTitle: 'Class Teacher', holderName: 'Dr. Salman Nadvi', admissionNo: 'FAC-U2-01', photoUrl: pFaizan, responsibilities: 'Class Teacher & Rhetorical Advisor for Class U2 Emerging Orators.' },
        { roleTitle: 'President', holderName: 'Ahmed Khan', admissionNo: 'ADM-U2-201', photoUrl: pAhmed, responsibilities: 'Presides over Class U2 assemblies and executive leadership.' },
        { roleTitle: 'Vice President of Membership', holderName: 'Faizan Ali', admissionNo: 'ADM-U2-202', photoUrl: pFaizan, responsibilities: 'Leads scholar induction and membership engagement.' },
        { roleTitle: 'Vice President of Education', holderName: 'Zainab Fatima', admissionNo: 'ADM-U2-203', photoUrl: pZainab, responsibilities: 'Directs weekly Speech, Naat, and Evolution tracks.' },
        { roleTitle: 'Vice President of Public Relations', holderName: 'Owais Raza', admissionNo: 'ADM-U2-204', photoUrl: pAhmed, responsibilities: 'Curates Class U2 media feed and competition posters.' },
        { roleTitle: 'Secretary', holderName: 'Ayesha Siddiqua', admissionNo: 'ADM-U2-205', photoUrl: pAyesha, responsibilities: 'Records session evaluations and parliamentary minutes.' },
        { roleTitle: 'Treasurer', holderName: 'Taha Khan', admissionNo: 'ADM-U2-206', photoUrl: pFaizan, responsibilities: 'Manages Class U2 academic materials and logistics.' },
      ],
      U3: [
        { roleTitle: 'Class Teacher', holderName: 'Prof. Bushra Ansar', admissionNo: 'FAC-U3-01', photoUrl: pAyesha, responsibilities: 'Class Teacher & Senior Oratory Guide for Class U3 Intermediate Scholars.' },
        { roleTitle: 'President', holderName: 'Ayesha Khan', admissionNo: 'ADM-U3-301', photoUrl: pAyesha, responsibilities: 'Presides over Class U3 weekly sessions and student council.' },
        { roleTitle: 'Vice President of Membership', holderName: 'Hamza Tariq', admissionNo: 'ADM-U3-302', photoUrl: pAhmed, responsibilities: 'Manages Class U3 student roster and participation.' },
        { roleTitle: 'Vice President of Education', holderName: 'Mariam Noor', admissionNo: 'ADM-U3-303', photoUrl: pZainab, responsibilities: 'Coordinates Class U3 Qirat, Naat, Speech, and Table Topic tracks.' },
        { roleTitle: 'Vice President of Public Relations', holderName: 'Saadullah Baig', admissionNo: 'ADM-U3-304', photoUrl: pFaizan, responsibilities: 'Leads Class U3 poster design and public feed updates.' },
        { roleTitle: 'Secretary', holderName: 'Fatima Zahra', admissionNo: 'ADM-U3-305', photoUrl: pAyesha, responsibilities: 'Maintains Class U3 session records and speaker schedules.' },
        { roleTitle: 'Treasurer', holderName: 'Danish Ali', admissionNo: 'ADM-U3-306', photoUrl: pAhmed, responsibilities: 'Oversees Class U3 academic supplies and event planning.' },
      ],
      U4: [
        { roleTitle: 'Class Teacher', holderName: 'Prof. Imran Qureshi', admissionNo: 'FAC-U4-01', photoUrl: pAhmed, responsibilities: 'Class Teacher & Debate Coach for Class U4 Senior Debaters.' },
        { roleTitle: 'President', holderName: 'Hira Suleman', admissionNo: 'ADM-U4-401', photoUrl: pZainab, responsibilities: 'Presides over Class U4 parliamentary debates and council.' },
        { roleTitle: 'Vice President of Membership', holderName: 'Hassan Javed', admissionNo: 'ADM-U4-402', photoUrl: pFaizan, responsibilities: 'Directs Class U4 cohort membership and scholar mentoring.' },
        { roleTitle: 'Vice President of Education', holderName: 'Khadija Tariq', admissionNo: 'ADM-U4-403', photoUrl: pAyesha, responsibilities: 'Supervises Class U4 Evolution and thematic speech curriculum.' },
        { roleTitle: 'Vice President of Public Relations', holderName: 'Rayyan Siddiqui', admissionNo: 'ADM-U4-404', photoUrl: pAhmed, responsibilities: 'Manages Class U4 competition posters and community feed.' },
        { roleTitle: 'Secretary', holderName: 'Amna Farooq', admissionNo: 'ADM-U4-405', photoUrl: pZainab, responsibilities: 'Compiles Class U4 evaluation logs and weekly minutes.' },
        { roleTitle: 'Treasurer', holderName: 'Waleed Iqbal', admissionNo: 'ADM-U4-406', photoUrl: pFaizan, responsibilities: 'Manages Class U4 awards and competition resources.' },
      ],
      U5: [
        { roleTitle: 'Class Teacher', holderName: 'Dr. Ruqayyah Hashmi', admissionNo: 'FAC-U5-01', photoUrl: pZainab, responsibilities: 'Class Teacher & Honors Fellowship Director for Class U5.' },
        { roleTitle: 'President', holderName: 'Ahmed Raza', admissionNo: 'ADM-U5-501', photoUrl: pAhmed, responsibilities: 'Presides over Class U5 Honors Fellowship executive board.' },
        { roleTitle: 'Vice President of Membership', holderName: 'Yusuf Mahmood', admissionNo: 'ADM-U5-502', photoUrl: pFaizan, responsibilities: 'Coordinates Class U5 scholar induction and peer support.' },
        { roleTitle: 'Vice President of Education', holderName: 'Sumayyah Aziz', admissionNo: 'ADM-U5-503', photoUrl: pAyesha, responsibilities: 'Leads Class U5 advanced speech synthesis and Naat programs.' },
        { roleTitle: 'Vice President of Public Relations', holderName: 'Haris Zubair', admissionNo: 'ADM-U5-504', photoUrl: pAhmed, responsibilities: 'Directs Class U5 showcase posters and feed publications.' },
        { roleTitle: 'Secretary', holderName: 'Iqra Mansoor', admissionNo: 'ADM-U5-505', photoUrl: pZainab, responsibilities: 'Maintains Class U5 fellowship documentation and agendas.' },
        { roleTitle: 'Treasurer', holderName: 'Noman Sheikh', admissionNo: 'ADM-U5-506', photoUrl: pFaizan, responsibilities: 'Stewards Class U5 honors fellowship logistics.' },
      ],
      U6: [
        { roleTitle: 'Class Teacher', holderName: 'Prof. Allama Khalid Masood', admissionNo: 'FAC-U6-01', photoUrl: pFaizan, responsibilities: 'Senior Class Teacher & Master Laureates Advisor for Class U6.' },
        { roleTitle: 'President', holderName: 'Junaid Ahmed', admissionNo: 'ADM-U6-601', photoUrl: pFaizan, responsibilities: 'Presides over Class U6 Master Laureates executive assembly.' },
        { roleTitle: 'Vice President of Membership', holderName: 'Talha Bin Zubair', admissionNo: 'ADM-U6-602', photoUrl: pAhmed, responsibilities: 'Oversees Class U6 senior cohort roster and leadership.' },
        { roleTitle: 'Vice President of Education', holderName: 'Mahira Sultan', admissionNo: 'ADM-U6-603', photoUrl: pAyesha, responsibilities: 'Directs Class U6 capstone speeches and evaluation standards.' },
        { roleTitle: 'Vice President of Public Relations', holderName: 'Huzaifa Anwar', admissionNo: 'ADM-U6-604', photoUrl: pFaizan, responsibilities: 'Curates Class U6 official posters and public gallery.' },
        { roleTitle: 'Secretary', holderName: 'Noor-ul-Ain', admissionNo: 'ADM-U6-605', photoUrl: pZainab, responsibilities: 'Keeps official Class U6 parliamentary and competition records.' },
        { roleTitle: 'Treasurer', holderName: 'Arsalan Shah', admissionNo: 'ADM-U6-606', photoUrl: pAhmed, responsibilities: 'Manages Class U6 graduation showcase and awards.' },
      ],
    };

    for (const [clsCode, templates] of Object.entries(officerDefaultsByClass)) {
      for (const tpl of templates) {
        const match = existingOfficers.find(
          (o) =>
            o.classCode === clsCode &&
            o.roleTitle.trim().toLowerCase() === tpl.roleTitle.trim().toLowerCase()
        );
        if (!match) {
          await db.insert(classOfficers).values({
            classCode: clsCode as any,
            roleTitle: tpl.roleTitle as any,
            holderName: tpl.holderName,
            admissionNo: tpl.admissionNo,
            photoUrl: tpl.photoUrl,
            responsibilities: tpl.responsibilities,
            updatedByEmail: 'nasirhussin12489@gmail.com',
          });
        } else if (!match.holderName || !match.photoUrl) {
          await db
            .update(classOfficers)
            .set({
              holderName: match.holderName || tpl.holderName,
              photoUrl: match.photoUrl || tpl.photoUrl,
              admissionNo: match.admissionNo || tpl.admissionNo,
              responsibilities: match.responsibilities || tpl.responsibilities,
              updatedAt: new Date(),
            })
            .where(eq(classOfficers.id, match.id));
        }
      }
    }

    // Seed initial approved feed posts if none exist so the Home Page Feed section is populated out of the box
    const existingFeed = await db.select().from(feedPosts);
    if (existingFeed.length === 0) {
      const sampleFeed = [
        {
          classCode: 'U1' as any,
          title: 'Class U1 Weekly Competition Lineup & Highlights',
          caption: 'Our Class U1 scholars delivered inspiring Qirat, Naat, Speech, and Table Topic performances in this week’s ILM stage session.',
          mediaUrl: pAyesha,
          mediaType: 'POSTER' as any,
          status: 'APPROVED' as any,
          submittedByEmail: 'nasirhussin12489@gmail.com',
          submittedByName: 'Class U1 Official',
        },
        {
          classCode: 'U2' as any,
          title: 'Class U2 Emerging Orators Stage Session',
          caption: 'Snapshots and official poster announcement from the Class U2 Speech, Naat, and Evolution evaluation session.',
          mediaUrl: pAhmed,
          mediaType: 'PHOTO' as any,
          status: 'APPROVED' as any,
          submittedByEmail: 'nasirhussin12489@gmail.com',
          submittedByName: 'Class U2 Official',
        },
        {
          classCode: 'U3' as any,
          title: 'Class U3 Intermediate Scholars Oratory Showcase',
          caption: 'Celebrating excellence in classical Naat recitation and impromptu Table Topics across Class U3.',
          mediaUrl: pZainab,
          mediaType: 'ANNOUNCEMENT' as any,
          status: 'APPROVED' as any,
          submittedByEmail: 'nasirhussin12489@gmail.com',
          submittedByName: 'Class U3 Official',
        },
      ];
      for (const fp of sampleFeed) {
        await db.insert(feedPosts).values(fp);
      }
    }

    // 5. Seed initial Participants across U1-U6 if empty so classes and posters are rich and fully populated
    const existingParticipants = await db.select().from(participants);
    if (existingParticipants.length === 0) {
      const sampleParticipants = [
        // Class U1
        { admissionNo: 'ADM-U1-101', fullName: 'Areeba Khan', photoUrl: pAyesha, classCode: 'U1', categoryName: 'Qirat', ownTopic: 'Surah Al-Rahman with Tajweed', shortDescription: 'Melodic tartil recitation with classical pause cadence.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U1-102', fullName: 'Usman Farooq', photoUrl: pAhmed, classCode: 'U1', categoryName: 'Naat', ownTopic: 'Faslon Ko Takalluf Hai Humse Agar', shortDescription: 'Traditional Urdu Naat rendition honoring prophetic devotion.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U1-103', fullName: 'Sara Maryam', photoUrl: pZainab, classCode: 'U1', categoryName: 'Naat', ownTopic: 'Madine Ka Safar Hai', shortDescription: 'Poetic reflection on spiritual longing.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U1-104', fullName: 'Bilal Raza', photoUrl: pFaizan, classCode: 'U1', categoryName: 'Speech', ownTopic: 'The Power of Sincerity in Speech', shortDescription: 'Exploring foundational rhetoric and moral clarity.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U1-105', fullName: 'Hafsa Noor', photoUrl: pAyesha, classCode: 'U1', categoryName: 'Speech', ownTopic: 'Virtues of Knowledge and Patience', shortDescription: 'Persuasive address on academic discipline.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U1-106', fullName: 'Zaid Siddiqui', photoUrl: pAhmed, classCode: 'U1', categoryName: 'Table Topic', ownTopic: 'How Small Habits Shape Destiny', shortDescription: 'Impromptu oratory with fast conceptual synthesis.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U1-107', fullName: 'Hamza Tariq', photoUrl: pFaizan, classCode: 'U1', categoryName: 'Evolution', ownTopic: 'Constructive Vocal Feedback', shortDescription: 'Analytical review of speaker tone and stage poise.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U1-108', fullName: 'Amna Farooq', photoUrl: pZainab, classCode: 'U1', categoryName: 'Aah Counter', ownTopic: 'Auditory Pause Tracking', shortDescription: 'Detailed recording of verbal crutches and pauses.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U1-109', fullName: 'Waleed Iqbal', photoUrl: pAhmed, classCode: 'U1', categoryName: 'Grammarian', ownTopic: 'Word of the Week: Istiqamah', shortDescription: 'Linguistic stewardship and syntactic analysis.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U1-110', fullName: 'Rayyan Siddiqui', photoUrl: pFaizan, classCode: 'U1', categoryName: 'Marshal', ownTopic: 'Assembly Parliamentary Decorum', shortDescription: 'Session protocol and speaker countdown management.', createdByEmail: 'nasirhussin12489@gmail.com' },

        // Class U2
        { admissionNo: 'ADM-U2-201', fullName: 'Ahmed Khan', photoUrl: pAhmed, classCode: 'U2', categoryName: 'Qirat', ownTopic: 'Surah Al-Mulk with Tartil', shortDescription: 'Reverent recitation demonstrating Tajweed mastery.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U2-202', fullName: 'Zainab Fatima', photoUrl: pZainab, classCode: 'U2', categoryName: 'Naat', ownTopic: 'Habibi Ya Rasoolallah', shortDescription: 'Soulful Arabic & Urdu poetic eulogy.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U2-203', fullName: 'Owais Raza', photoUrl: pFaizan, classCode: 'U2', categoryName: 'Naat', ownTopic: 'Meri Baat Ban Gayi Hai', shortDescription: 'Classical devotional melody.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U2-204', fullName: 'Faizan Ali', photoUrl: pFaizan, classCode: 'U2', categoryName: 'Speech', ownTopic: 'Ethical Leadership in the Digital Era', shortDescription: 'Award-winning keynote analyzing integrity and tech.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U2-205', fullName: 'Ayesha Siddiqua', photoUrl: pAyesha, classCode: 'U2', categoryName: 'Speech', ownTopic: 'The Legacy of Classical Scholars', shortDescription: 'Historical oration on scientific curiosity.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U2-206', fullName: 'Taha Khan', photoUrl: pAhmed, classCode: 'U2', categoryName: 'Table Topic', ownTopic: 'Courage Under Adversity', shortDescription: '2-minute spontaneous delivery.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U2-207', fullName: 'Saadullah Baig', photoUrl: pFaizan, classCode: 'U2', categoryName: 'Evolution', ownTopic: 'Synthesizing Constructive Evaluation', shortDescription: 'Speaker growth recommendations.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U2-208', fullName: 'Fatima Zahra', photoUrl: pAyesha, classCode: 'U2', categoryName: 'Aah Counter', ownTopic: 'Pacing & Cadence Analytics', shortDescription: 'Fluency monitoring across speeches.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U2-209', fullName: 'Danish Ali', photoUrl: pAhmed, classCode: 'U2', categoryName: 'Grammarian', ownTopic: 'Word of the Week: Hikmah', shortDescription: 'Vocabulary evaluation and rhetorical elegance.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U2-210', fullName: 'Hira Suleman', photoUrl: pZainab, classCode: 'U2', categoryName: 'Marshal', ownTopic: 'Chamber Protocols & Time Limits', shortDescription: 'Parliamentary session stewardship.', createdByEmail: 'nasirhussin12489@gmail.com' },

        // Class U3
        { admissionNo: 'ADM-U3-301', fullName: 'Ayesha Khan', photoUrl: pAyesha, classCode: 'U3', categoryName: 'Speech', ownTopic: 'Rhetorical Architecture of Classical Speeches', shortDescription: 'Keynote oration on classical arguments.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U3-302', fullName: 'Mariam Noor', photoUrl: pZainab, classCode: 'U3', categoryName: 'Naat', ownTopic: 'Tajdar-e-Haram Ae Shehenshah-e-Deen', shortDescription: 'Classical devotional qawwali meter.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U3-303', fullName: 'Hamza Tariq', photoUrl: pAhmed, classCode: 'U3', categoryName: 'Qirat', ownTopic: 'Surah Yasin Recitation', shortDescription: 'Tartil recitation with pristine Tajweed.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U3-304', fullName: 'Saadullah Baig', photoUrl: pFaizan, classCode: 'U3', categoryName: 'Speech', ownTopic: 'Echoes of Justice in World History', shortDescription: 'Persuasive analysis of social equity.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U3-305', fullName: 'Fatima Zahra', photoUrl: pAyesha, classCode: 'U3', categoryName: 'Table Topic', ownTopic: 'The Wisdom of Gratitude', shortDescription: 'Impromptu speaking on mindfulness.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U3-306', fullName: 'Danish Ali', photoUrl: pAhmed, classCode: 'U3', categoryName: 'Evolution', ownTopic: 'Analytical Speech Diagnostics', shortDescription: 'Advanced evaluation matrix for intermediate scholars.', createdByEmail: 'nasirhussin12489@gmail.com' },

        // Class U4
        { admissionNo: 'ADM-U4-401', fullName: 'Hira Suleman', photoUrl: pZainab, classCode: 'U4', categoryName: 'Speech', ownTopic: 'Parliamentary Debate & Global Ethics', shortDescription: 'Comprehensive debate keynote.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U4-402', fullName: 'Hassan Javed', photoUrl: pFaizan, classCode: 'U4', categoryName: 'Naat', ownTopic: 'Karam Ke Badal Baras Rahe Hain', shortDescription: 'Lyrical rendition with melodic precision.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U4-403', fullName: 'Khadija Tariq', photoUrl: pAyesha, classCode: 'U4', categoryName: 'Qirat', ownTopic: 'Surah Maryam Recitation', shortDescription: 'Aesthetic vocal modulation.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U4-404', fullName: 'Rayyan Siddiqui', photoUrl: pAhmed, classCode: 'U4', categoryName: 'Table Topic', ownTopic: 'Empathy in Leadership', shortDescription: 'Analytical impromptu response.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U4-405', fullName: 'Amna Farooq', photoUrl: pZainab, classCode: 'U4', categoryName: 'Evolution', ownTopic: 'Cross-Examination Feedback', shortDescription: 'Evaluator report for senior debaters.', createdByEmail: 'nasirhussin12489@gmail.com' },

        // Class U5
        { admissionNo: 'ADM-U5-501', fullName: 'Ahmed Raza', photoUrl: pAhmed, classCode: 'U5', categoryName: 'Naat', ownTopic: 'Ya Nabi Salam Alaika', shortDescription: 'Honors fellowship master Naat presentation.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U5-502', fullName: 'Yusuf Mahmood', photoUrl: pFaizan, classCode: 'U5', categoryName: 'Speech', ownTopic: 'Diplomatic Discourse & Civilizational Dialogue', shortDescription: 'Keynote address for honors symposium.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U5-503', fullName: 'Sumayyah Aziz', photoUrl: pAyesha, classCode: 'U5', categoryName: 'Qirat', ownTopic: 'Surah Al-Kahf with Maqam Nahawand', shortDescription: 'Sacred classical melodic rendition.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U5-504', fullName: 'Haris Zubair', photoUrl: pAhmed, classCode: 'U5', categoryName: 'Table Topic', ownTopic: 'The Stewardship of Collective Wisdom', shortDescription: 'Senior impromptu presentation.', createdByEmail: 'nasirhussin12489@gmail.com' },

        // Class U6
        { admissionNo: 'ADM-U6-601', fullName: 'Junaid Ahmed', photoUrl: pFaizan, classCode: 'U6', categoryName: 'Speech', ownTopic: 'Master Laureates Capstone: Architecture of Vision', shortDescription: 'Graduation capstone leadership oration.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U6-602', fullName: 'Mahira Sultan', photoUrl: pAyesha, classCode: 'U6', categoryName: 'Naat', ownTopic: 'Main To Panjtan Ka Ghulam Hoon', shortDescription: 'Master laureate devotional recitation.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U6-603', fullName: 'Talha Bin Zubair', photoUrl: pAhmed, classCode: 'U6', categoryName: 'Qirat', ownTopic: 'Surah Al-Hashr Recitation', shortDescription: 'Capstone recitation with classical Tajweed.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U6-604', fullName: 'Huzaifa Anwar', photoUrl: pFaizan, classCode: 'U6', categoryName: 'Evolution', ownTopic: 'Senior Evaluator Capstone Synthesis', shortDescription: 'Master review and institutional recommendations.', createdByEmail: 'nasirhussin12489@gmail.com' },
        { admissionNo: 'ADM-U6-605', fullName: 'Noor-ul-Ain', photoUrl: pZainab, classCode: 'U6', categoryName: 'Table Topic', ownTopic: 'The Enduring Impact of Mentorship', shortDescription: 'Senior impromptu reflections.', createdByEmail: 'nasirhussin12489@gmail.com' },
      ];

      for (const p of sampleParticipants) {
        await db.insert(participants).values({
          admissionNo: p.admissionNo,
          fullName: p.fullName,
          photoUrl: p.photoUrl,
          classCode: p.classCode as any,
          categoryName: p.categoryName as any,
          ownTopic: p.ownTopic,
          shortDescription: p.shortDescription,
          publicationStatus: 'PUBLISHED',
          createdByEmail: p.createdByEmail,
        });
      }
    }

    // 6. Seed initial Weekly Results across classes if empty
    const existingResults = await db.select().from(weeklyResults);
    if (existingResults.length === 0) {
      const sampleResults = [
        {
          resultCategory: 'Best Speaker' as any,
          winnerName: 'Faizan Ali',
          winnerPhotoUrl: pFaizan,
          winnerClass: 'U2' as any,
          weekLabel: 'Week 4 • Season Finale',
          resultDate: 'October 14, 2026',
          remarks: 'Awarded Gold Trophy (Score 98/100) for stellar delivery on "Ethical Leadership in Modern Era".',
          publicationStatus: 'PUBLISHED' as any,
          publishedByEmail: 'nasirhussin12489@gmail.com',
        },
        {
          resultCategory: 'Best Naat' as any,
          winnerName: 'Zainab Fatima',
          winnerPhotoUrl: pZainab,
          winnerClass: 'U2' as any,
          weekLabel: 'Week 4 • Season Finale',
          resultDate: 'October 14, 2026',
          remarks: 'Awarded Gold Trophy (Score 99/100) for breathtaking classical cadence and emotional reverence.',
          publicationStatus: 'PUBLISHED' as any,
          publishedByEmail: 'nasirhussin12489@gmail.com',
        },
        {
          resultCategory: 'Best Speaker' as any,
          winnerName: 'Ayesha Khan',
          winnerPhotoUrl: pAyesha,
          winnerClass: 'U3' as any,
          weekLabel: 'Week 3 • Intermediate Orators',
          resultDate: 'October 07, 2026',
          remarks: 'Exceptional rhetorical structure and vocal variety (Score 97/100).',
          publicationStatus: 'PUBLISHED' as any,
          publishedByEmail: 'nasirhussin12489@gmail.com',
        },
        {
          resultCategory: 'Best Naat' as any,
          winnerName: 'Usman Farooq',
          winnerPhotoUrl: pAhmed,
          winnerClass: 'U1' as any,
          weekLabel: 'Week 3 • Foundation Cohort',
          resultDate: 'October 07, 2026',
          remarks: 'Masterful poetic meter and resonant vocal delivery (Score 96/100).',
          publicationStatus: 'PUBLISHED' as any,
          publishedByEmail: 'nasirhussin12489@gmail.com',
        },
        {
          resultCategory: 'Best Speaker' as any,
          winnerName: 'Hira Suleman',
          winnerPhotoUrl: pZainab,
          winnerClass: 'U4' as any,
          weekLabel: 'Week 2 • Senior Debates',
          resultDate: 'September 30, 2026',
          remarks: 'Outstanding analytical rebuttal and parliamentary poise (Score 95/100).',
          publicationStatus: 'PUBLISHED' as any,
          publishedByEmail: 'nasirhussin12489@gmail.com',
        },
        {
          resultCategory: 'Best Naat' as any,
          winnerName: 'Ahmed Raza',
          winnerPhotoUrl: pAhmed,
          winnerClass: 'U5' as any,
          weekLabel: 'Week 2 • Honors Fellowship',
          resultDate: 'September 30, 2026',
          remarks: 'Pure spiritual melody with authentic classical maqam (Score 97/100).',
          publicationStatus: 'PUBLISHED' as any,
          publishedByEmail: 'nasirhussin12489@gmail.com',
        },
        {
          resultCategory: 'Best Speaker' as any,
          winnerName: 'Junaid Ahmed',
          winnerPhotoUrl: pFaizan,
          winnerClass: 'U6' as any,
          weekLabel: 'Week 1 • Master Laureates',
          resultDate: 'September 23, 2026',
          remarks: 'Masterful capstone address establishing institutional benchmarks (Score 99/100).',
          publicationStatus: 'PUBLISHED' as any,
          publishedByEmail: 'nasirhussin12489@gmail.com',
        },
        {
          resultCategory: 'Best Naat' as any,
          winnerName: 'Mahira Sultan',
          winnerPhotoUrl: pAyesha,
          winnerClass: 'U6' as any,
          weekLabel: 'Week 1 • Master Laureates',
          resultDate: 'September 23, 2026',
          remarks: 'Transcendent recitation honoring classical tradition (Score 98/100).',
          publicationStatus: 'PUBLISHED' as any,
          publishedByEmail: 'nasirhussin12489@gmail.com',
        },
      ];

      for (const res of sampleResults) {
        await db.insert(weeklyResults).values(res);
      }
    }

    // 7. Seed initial Digital Library Resources if empty
    const existingLibrary = await db.select().from(libraryResources);
    if (existingLibrary.length === 0) {
      const sampleLibrary = [
        {
          title: 'The Art of Public Speaking & Rhetorical Mastery',
          description: 'A comprehensive classical manual covering speech structure, persuasive rhetoric, opening hooks, and vocal modulation.',
          author: 'Prof. Dale Carnegie & ILM Faculty',
          category: 'Books' as any,
          libraryScope: 'COMMON' as any,
          fileUrl: '/uploads/ilm_public_speaking_handbook.pdf',
          fileType: 'PDF Document',
          fileSize: '4.2 MB',
          contentPreview: 'Chapter 1: The Psychology of Audience Engagement. Public speaking is not mere vocalization; it is the deliberate transfer of conviction...',
          publicationStatus: 'PUBLISHED' as any,
          uploadedByEmail: 'nasirhussin12489@gmail.com',
        },
        {
          title: 'Tajweed Rules & Melodic Tartil Cadence Reference',
          description: 'Phonetic precision guide detailing Makharij, Sifaat, and breath regulation for sacred Quranic recitation.',
          author: 'Qari Abdul Basit Academy',
          category: 'Notes' as any,
          libraryScope: 'U1' as any,
          fileUrl: '/uploads/tajweed_cadence_reference.pdf',
          fileType: 'PDF Document',
          fileSize: '1.8 MB',
          contentPreview: 'Makharij al-Huruf: Five primary points of articulation. Regulation of Madd, Ghunnah, and Ikhfa in oratorical recitation...',
          publicationStatus: 'PUBLISHED' as any,
          uploadedByEmail: 'nasirhussin12489@gmail.com',
        },
        {
          title: 'Classical Urdu & English Naat Meter Anthology',
          description: 'Curated compilation of poetic forms, Bahr (metres), and spiritual motifs across centuries of classical devotional poetry.',
          author: 'Allama Iqbal Oratorical Guild',
          category: 'Books' as any,
          libraryScope: 'U2' as any,
          fileUrl: '/uploads/classical_naat_anthology.pdf',
          fileType: 'PDF Document',
          fileSize: '3.6 MB',
          contentPreview: 'Understanding poetic metre (Bahr): A study of Mutadarik and Ramal metres in devotional poetry with cadence annotations...',
          publicationStatus: 'PUBLISHED' as any,
          uploadedByEmail: 'nasirhussin12489@gmail.com',
        },
        {
          title: 'Table Topic Reflexes & 2-Minute Speech Framework',
          description: 'Structured methodologies for impromptu speaking: PREP (Point, Reason, Example, Point) and Past-Present-Future models.',
          author: 'ILM Executive Council',
          category: 'Research Papers' as any,
          libraryScope: 'COMMON' as any,
          fileUrl: '/uploads/table_topics_handbook.pdf',
          fileType: 'PDF Document',
          fileSize: '950 KB',
          contentPreview: 'When called to speak spontaneously, master the 3-second pause. Structure thoughts using the PREP method...',
          publicationStatus: 'PUBLISHED' as any,
          uploadedByEmail: 'nasirhussin12489@gmail.com',
        },
        {
          title: 'Analytical Speech Evolution & Constructive Feedback Matrix',
          description: 'Standardized evaluation guidelines for Evolution speakers to deliver uplifting, measurable feedback to peers.',
          author: 'Dr. Salman Nadvi',
          category: 'Articles' as any,
          libraryScope: 'COMMON' as any,
          fileUrl: '/uploads/speech_evolution_rubric.pdf',
          fileType: 'PDF Document',
          fileSize: '1.2 MB',
          contentPreview: 'The Sandwich Evaluation Method: Commendation, Specific Recommendation for Growth, and Inspiring Conclusion...',
          publicationStatus: 'PUBLISHED' as any,
          uploadedByEmail: 'nasirhussin12489@gmail.com',
        },
        {
          title: 'Parliamentary Procedure & Marshal Protocol Manual',
          description: 'Official session timing standards, protocol discipline, and stage etiquette for class sessions.',
          author: 'ILM Parliamentary Board',
          category: 'Presentations' as any,
          libraryScope: 'U4' as any,
          fileUrl: '/uploads/marshal_protocol_manual.pdf',
          fileType: 'PPTX Slides',
          fileSize: '5.1 MB',
          contentPreview: 'Standard time limits: Speeches (5-7 mins), Table Topics (1-2 mins), Evolution (2-3 mins). Color timing card cues...',
          publicationStatus: 'PUBLISHED' as any,
          uploadedByEmail: 'nasirhussin12489@gmail.com',
        },
        {
          title: 'Aah Counter Frequency Tracking Sheet & Guide',
          description: 'Auditory tracking sheets and vocal fluency techniques for minimizing filler words like um, ah, you know, and like.',
          author: 'Fluency Research Lab',
          category: 'Notes' as any,
          libraryScope: 'U2' as any,
          fileUrl: '/uploads/aah_counter_sheets.pdf',
          fileType: 'PDF Worksheet',
          fileSize: '620 KB',
          contentPreview: 'Filler pause psychology: Silence is more authoritative than sound. Replacing unconscious filler words with deliberate pauses...',
          publicationStatus: 'PUBLISHED' as any,
          uploadedByEmail: 'nasirhussin12489@gmail.com',
        },
        {
          title: 'The Grammarian’s Rhetorical Lexicon (100 Oratorical Words)',
          description: 'Elevated vocabulary, rhetorical figures of speech (anaphora, antithesis, chiasmus), and grammatical elegance guide.',
          author: 'Prof. Allama Khalid Masood',
          category: 'Articles' as any,
          libraryScope: 'COMMON' as any,
          fileUrl: '/uploads/grammarians_lexicon.pdf',
          fileType: 'PDF Document',
          fileSize: '2.1 MB',
          contentPreview: '1. Istiqamah: Steadfast perseverance under trial. Example in speech: True leadership requires unshakable istiqamah...',
          publicationStatus: 'PUBLISHED' as any,
          uploadedByEmail: 'nasirhussin12489@gmail.com',
        },
        {
          title: 'Diaphragmatic Breathing & Vocal Warmup Audio Drills',
          description: '15-minute guided vocal warmups for resonance, pitch range, articulation clarity, and diaphragmatic control.',
          author: 'Master Vocal Coaches',
          category: 'Audio' as any,
          libraryScope: 'COMMON' as any,
          fileUrl: '/uploads/vocal_drills_audio.mp3',
          fileType: 'MP3 Audio',
          fileSize: '14.8 MB',
          contentPreview: 'Track 1: Diaphragmatic breathing intervals. Track 2: Lip trills and resonance humming. Track 3: Articulation drills...',
          publicationStatus: 'PUBLISHED' as any,
          uploadedByEmail: 'nasirhussin12489@gmail.com',
        },
        {
          title: 'Master Orators Video Demonstration Archive',
          description: 'Video recordings of national and international champion orations with annotated rhetorical breakdowns.',
          author: 'ILM Media Archives',
          category: 'Videos' as any,
          libraryScope: 'COMMON' as any,
          fileUrl: '/uploads/master_orators_archive.mp4',
          fileType: 'MP4 Video',
          fileSize: '48.5 MB',
          contentPreview: 'Session 1: Body language and eye contact on a large stage. Session 2: Modulation between quiet intensity and thunderous conviction...',
          publicationStatus: 'PUBLISHED' as any,
          uploadedByEmail: 'nasirhussin12489@gmail.com',
        },
        {
          title: 'Speech Structure Boilerplate: Opening, Body, Climax',
          description: 'Modular script outlines for informative, persuasive, commemorative, and entertaining speeches.',
          author: 'ILM Curriculum Team',
          category: 'Code Snippets' as any,
          libraryScope: 'COMMON' as any,
          fileUrl: '/uploads/speech_templates.md',
          fileType: 'Markdown Text',
          fileSize: '120 KB',
          contentPreview: '# Persuasive Speech Blueprint\n1. Hook: Provocative question or striking statistic\n2. The Core Problem\n3. Evidence\n4. Call to Action...',
          publicationStatus: 'PUBLISHED' as any,
          uploadedByEmail: 'nasirhussin12489@gmail.com',
        },
        {
          title: 'Curated Bibliography of Classical Oratory Literature',
          description: 'Annotated collection of primary source texts, books, and articles on Islamic rhetoric and classical eloquence.',
          author: 'ILM Academic Council',
          category: 'Bookmarks' as any,
          libraryScope: 'COMMON' as any,
          fileUrl: '/uploads/oratory_bibliography.html',
          fileType: 'HTML Archive',
          fileSize: '340 KB',
          contentPreview: 'Curated reading list for scholars pursuing advanced oratorical certifications and honors fellowships...',
          publicationStatus: 'PUBLISHED' as any,
          uploadedByEmail: 'nasirhussin12489@gmail.com',
        },
      ];

      for (const res of sampleLibrary) {
        await db.insert(libraryResources).values(res);
      }
    }

    // 8. Ensure each class (U1-U6) has its unified 1-page Master Class Poster combining all categories
    for (const clsCode of VALID_CLASSES) {
      await regeneratePosterForClassCategory(clsCode, 'All Categories');
    }

    // 6. Ensure default ImgBB API key is initialized in platformSettings if not set
    const existingImgbb = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.settingKey, 'imgbbApiKey'))
      .limit(1);
    if (!existingImgbb.length || !existingImgbb[0].settingValue?.trim()) {
      await db
        .insert(platformSettings)
        .values({
          settingKey: 'imgbbApiKey',
          settingValue: '9551c6c91a49c0c4b17819b26554d812',
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: platformSettings.settingKey,
          set: {
            settingValue: '9551c6c91a49c0c4b17819b26554d812',
            updatedAt: new Date(),
          },
        });
    }

    credentialsSynced = true;
  } catch (error) {
    console.error('Error syncing requested admin credentials:', error);
  }
}

export async function ensureInitialSeedData() {
  await ensureRequestedAdminCredentials();
  if (seedCompleted || isSeeding) return;
  isSeeding = true;
  try {
    const existingClasses = await db.select().from(classes);
    if (existingClasses.length > 0) {
      seedCompleted = true;
      isSeeding = false;
      return;
    }

    // Seed classes (U1 to U6) if brand new DB
    const classDefs = [
      {
        code: 'U1' as any,
        name: 'Class U1 • Foundation Cohort',
        description: 'Primary oratorical foundation, phonetic clarity, and introductory Naat & Speech.',
        adminEmail: 'admin@gmail.com',
      },
      {
        code: 'U2' as any,
        name: 'Class U2 • Emerging Orators',
        description: 'Structured public speaking, classical Naat delivery, and peer Evolution sessions.',
        adminEmail: 'u2.admin@ilm.edu.pk',
      },
      {
        code: 'U3' as any,
        name: 'Class U3 • Intermediate Scholars',
        description: 'Rhetorical composition, analytical Evolution, and parliamentary session leadership.',
        adminEmail: 'u3.admin@ilm.edu.pk',
      },
      {
        code: 'U4' as any,
        name: 'Class U4 • Senior Debaters',
        description: 'Advanced thematic speeches, grammatical mastery, and executive session moderation.',
        adminEmail: 'u4.admin@ilm.edu.pk',
      },
      {
        code: 'U5' as any,
        name: 'Class U5 • Honors Fellowship',
        description: 'Distinguished Naat recitation, keynote speech synthesis, and critical evaluation.',
        adminEmail: 'u5.admin@ilm.edu.pk',
      },
      {
        code: 'U6' as any,
        name: 'Class U6 • Master Laureates',
        description: 'Capstone leadership cohort preparing senior scholars for institutional excellence.',
        adminEmail: 'u6.admin@ilm.edu.pk',
      },
    ];

    for (const cls of classDefs) {
      await db.insert(classes).values(cls).onConflictDoNothing();
    }

    seedCompleted = true;
  } catch (error) {
    console.error('Error seeding initial ILM database records:', error);
  } finally {
    isSeeding = false;
  }
}
