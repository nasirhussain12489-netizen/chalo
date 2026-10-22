import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull(), // 'SUPER_ADMIN' | 'TEACHER' | 'CLASS_ADMIN'
  assignedClass: text('assigned_class'), // 'U1' | 'U2' | 'U3' | 'U4' | 'U5' | 'U6' | null
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'DEACTIVATED'
  passwordHash: text('password_hash'),
  passwordPlain: text('password_plain'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const classes = pgTable('classes', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // 'U1' | 'U2' | 'U3' | 'U4' | 'U5' | 'U6'
  name: text('name').notNull(),
  description: text('description').notNull(),
  adminEmail: text('admin_email'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  admissionNo: text('admission_no').notNull().unique(),
  fullName: text('full_name').notNull(),
  classCode: text('class_code').notNull(), // 'U1'..'U6'
  photoUrl: text('photo_url').notNull(),
  bio: text('bio'),
  createdByEmail: text('created_by_email'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const classOfficers = pgTable('class_officers', {
  id: serial('id').primaryKey(),
  classCode: text('class_code').notNull(), // 'U1'..'U6'
  roleTitle: text('role_title').notNull(), // 'Class Teacher' | 'President' | 'Vice President of Membership' | 'Vice President of Education' | 'Vice President of Public Relations' | 'Secretary' | 'Treasurer'
  holderName: text('holder_name').notNull(),
  admissionNo: text('admission_no'),
  photoUrl: text('photo_url').notNull(),
  responsibilities: text('responsibilities'),
  updatedByEmail: text('updated_by_email'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const competitionCategories = pgTable('competition_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // 'Qirat' | 'Naat' | 'Speech' | 'Table Topic' | 'Aah Counter' | 'Evolution' | 'Marshal' | 'Grammarian'
  maxParticipantsPerClass: integer('max_participants_per_class').notNull(),
  description: text('description').notNull(),
  displayOrder: integer('display_order').notNull(),
});

export const participants = pgTable('participants', {
  id: serial('id').primaryKey(),
  admissionNo: text('admission_no'),
  fullName: text('full_name').notNull(),
  photoUrl: text('photo_url').notNull(),
  classCode: text('class_code').notNull(), // 'U1'..'U6'
  categoryName: text('category_name').notNull(), // 'Qirat' | 'Naat' | 'Speech' | 'Table Topic' | 'Aah Counter' | 'Evolution' | 'Marshal' | 'Grammarian'
  ownTopic: text('own_topic'),
  shortDescription: text('short_description'),
  publicationStatus: text('publication_status').notNull().default('PUBLISHED'), // 'PUBLISHED' | 'DRAFT'
  createdByEmail: text('created_by_email'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const posters = pgTable('posters', {
  id: serial('id').primaryKey(),
  classCode: text('class_code').notNull(), // 'U1'..'U6'
  categoryName: text('category_name').notNull(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  posterImageUrl: text('poster_image_url').notNull(),
  participantsSnapshot: text('participants_snapshot').notNull(), // JSON string of participant array
  participantCount: integer('participant_count').notNull().default(0),
  generationStatus: text('generation_status').notNull().default('COMPLETED'), // 'COMPLETED' | 'FAILED'
  generationError: text('generation_error'),
  publicationStatus: text('publication_status').notNull().default('PUBLISHED'), // 'PUBLISHED' | 'HIDDEN'
  isFeatured: boolean('is_featured').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const feedPosts = pgTable('feed_posts', {
  id: serial('id').primaryKey(),
  classCode: text('class_code').notNull(), // 'U1'..'U6'
  title: text('title').notNull(),
  caption: text('caption').notNull(),
  mediaUrl: text('media_url').notNull(),
  mediaType: text('media_type').notNull().default('PHOTO'), // 'PHOTO' | 'POSTER' | 'ANNOUNCEMENT'
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason: text('rejection_reason'),
  submittedByEmail: text('submitted_by_email').notNull(),
  submittedByName: text('submitted_by_name').notNull(),
  reviewedByEmail: text('reviewed_by_email'),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const weeklyResults = pgTable('weekly_results', {
  id: serial('id').primaryKey(),
  resultCategory: text('result_category').notNull(), // 'Best Speaker' | 'Best Naat'
  winnerName: text('winner_name').notNull(),
  winnerPhotoUrl: text('winner_photo_url').notNull(),
  winnerClass: text('winner_class').notNull(), // 'U1'..'U6'
  weekLabel: text('week_label').notNull(),
  resultDate: text('result_date').notNull(),
  remarks: text('remarks'),
  publicationStatus: text('publication_status').notNull().default('PUBLISHED'), // 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'
  publishedByEmail: text('published_by_email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const libraryResources = pgTable('library_resources', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  author: text('author').notNull(),
  category: text('category').notNull(), // 11 exact categories
  libraryScope: text('library_scope').notNull(), // 'COMMON' | 'U1'..'U6'
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: text('file_size').notNull(),
  contentPreview: text('content_preview'),
  publicationStatus: text('publication_status').notNull().default('PUBLISHED'), // 'PUBLISHED' | 'PRIVATE'
  uploadedByEmail: text('uploaded_by_email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  actorEmail: text('actor_email').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id'),
  classCode: text('class_code'),
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const platformSettings = pgTable('platform_settings', {
  id: serial('id').primaryKey(),
  settingKey: text('setting_key').notNull().unique(),
  settingValue: text('setting_value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
