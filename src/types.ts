export type ClassCode = 'U1' | 'U2' | 'U3' | 'U4' | 'U5' | 'U6';

export type CompetitionCategoryName =
  | 'Qirat'
  | 'Naat'
  | 'Speech'
  | 'Table Topic'
  | 'Aah Counter'
  | 'Evolution'
  | 'Marshal'
  | 'Grammarian';

export type ClassOfficerRole =
  | 'Class Teacher'
  | 'President'
  | 'Vice President of Membership'
  | 'Vice President of Education'
  | 'Vice President of Public Relations'
  | 'Secretary'
  | 'Treasurer';

export type LibraryCategoryName =
  | 'Books'
  | 'Articles'
  | 'Journals'
  | 'Research Papers'
  | 'Notes'
  | 'Presentations'
  | 'Videos'
  | 'Images'
  | 'Audio'
  | 'Code Snippets'
  | 'Bookmarks';

export interface ClassRecord {
  id: number;
  code: ClassCode;
  name: string;
  description: string;
  adminEmail?: string | null;
}

export interface StudentRecord {
  id: number;
  admissionNo: string;
  fullName: string;
  classCode: ClassCode;
  photoUrl: string;
  bio?: string | null;
  createdByEmail?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassOfficerRecord {
  id: number;
  classCode: ClassCode;
  roleTitle: ClassOfficerRole;
  holderName: string;
  admissionNo?: string | null;
  photoUrl: string;
  responsibilities?: string | null;
  updatedByEmail?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryRecord {
  id: number;
  name: CompetitionCategoryName;
  maxParticipantsPerClass: number;
  description: string;
  displayOrder: number;
}

export interface ParticipantRecord {
  id: number;
  admissionNo?: string | null;
  fullName: string;
  photoUrl: string;
  classCode: ClassCode;
  categoryName: CompetitionCategoryName;
  ownTopic?: string | null;
  shortDescription?: string | null;
  publicationStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PosterRecord {
  id: number;
  classCode: ClassCode;
  categoryName: string;
  title: string;
  subtitle: string;
  posterImageUrl: string;
  participantsSnapshot: string;
  participantCount: number;
  generationStatus: string;
  generationError?: string | null;
  publicationStatus: string;
  isFeatured: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeedPostRecord {
  id: number;
  classCode: ClassCode;
  title: string;
  caption: string;
  mediaUrl: string;
  mediaType: 'PHOTO' | 'POSTER' | 'ANNOUNCEMENT';
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  submittedByEmail?: string;
  submittedByName: string;
  reviewedByEmail?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface WeeklyResultRecord {
  id: number;
  resultCategory: 'Best Speaker' | 'Best Naat';
  winnerName: string;
  winnerPhotoUrl: string;
  winnerClass: ClassCode;
  weekLabel: string;
  resultDate: string;
  remarks?: string | null;
  publicationStatus?: string;
  createdAt?: string;
}

export interface LibraryResourceRecord {
  id: number;
  title: string;
  description: string;
  author: string;
  category: LibraryCategoryName;
  libraryScope: 'COMMON' | ClassCode;
  fileUrl: string;
  fileType: string;
  fileSize: string;
  contentPreview?: string | null;
  publicationStatus?: string;
  uploadedByEmail?: string;
  createdAt: string;
}

export interface AdminUser {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'TEACHER' | 'CLASS_ADMIN';
  assignedClass: ClassCode | null;
  status: 'ACTIVE' | 'DEACTIVATED';
  passwordPlain?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityLogRecord {
  id: number;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  classCode?: string | null;
  details: string;
  createdAt: string;
}

export interface PublicBootstrapData {
  classes: ClassRecord[];
  categories: CategoryRecord[];
  students: StudentRecord[];
  classOfficers: ClassOfficerRecord[];
  participants: ParticipantRecord[];
  posters: PosterRecord[];
  feedPosts: FeedPostRecord[];
  weeklyResults: WeeklyResultRecord[];
  libraryResources: LibraryResourceRecord[];
  settings: Record<string, string>;
}
