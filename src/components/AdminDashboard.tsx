import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Crown,
  Download,
  Edit3,
  Eye,
  FileText,
  FolderKanban,
  GraduationCap,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  Sliders,
  Trash2,
  Trophy,
  Upload,
  UserCheck,
  Users,
  X,
  XCircle,
  Globe,
  Database,
  Copy,
  Check,
  ExternalLink,
  Camera,
} from 'lucide-react';
import {
  ActivityLogRecord,
  AdminUser,
  CategoryRecord,
  ClassCode,
  ClassOfficerRecord,
  ClassOfficerRole,
  ClassRecord,
  CompetitionCategoryName,
  FeedPostRecord,
  LibraryCategoryName,
  LibraryResourceRecord,
  ParticipantRecord,
  PosterRecord,
  StudentRecord,
  WeeklyResultRecord,
} from '../types.ts';
import { formatErrorMessage, safeFetchJson } from '../lib/api.ts';
import { IlmLogo, downloadPosterAsPng } from './IlmLogo.tsx';
import { PosterStageCard } from './PosterStageCard.tsx';
import { PosterPhotoshopStudio } from './PosterPhotoshopStudio.tsx';
import {
  CompetitionStageAndTimer,
  getProgramRoleLabel,
} from './CompetitionStageAndTimer.tsx';

const VALID_CLASSES: ClassCode[] = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6'];

const COMPETITION_CATEGORIES: CompetitionCategoryName[] = [
  'Qirat',
  'Naat',
  'Speech',
  'Table Topic',
  'Aah Counter',
  'Evolution',
  'Marshal',
  'Grammarian',
];

const CATEGORY_MAX: Record<CompetitionCategoryName, number> = {
  Qirat: 1,
  Naat: 5,
  Speech: 5,
  'Table Topic': 5,
  'Aah Counter': 1,
  Evolution: 5,
  Marshal: 1,
  Grammarian: 1,
};

const TOTAL_CLASS_CAPACITY = Object.values(CATEGORY_MAX).reduce(
  (sum, count) => sum + count,
  0
);

const CLASS_OFFICER_ROLES: ClassOfficerRole[] = [
  'Class Teacher',
  'President',
  'Vice President of Membership',
  'Vice President of Education',
  'Vice President of Public Relations',
  'Secretary',
  'Treasurer',
];

const LIBRARY_CATEGORIES: LibraryCategoryName[] = [
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
];

const STUDIO_PORTRAIT_PRESETS = [
  {
    label: 'Portrait A (Scholar Female 1)',
    url: '/assets/images/scholar_portrait_ayesha_1791787508872.jpg',
  },
  {
    label: 'Portrait B (Scholar Male 1)',
    url: '/assets/images/scholar_portrait_ahmed_1791787523001.jpg',
  },
  {
    label: 'Portrait C (Scholar Female 2)',
    url: '/assets/images/scholar_portrait_zainab_1791787533783.jpg',
  },
  {
    label: 'Portrait D (Scholar Male 2)',
    url: '/assets/images/scholar_portrait_faizan_1791787544478.jpg',
  },
];

type AdminSection =
  | 'overview'
  | 'classes'
  | 'students'
  | 'officers'
  | 'participants'
  | 'categories'
  | 'posters'
  | 'feed'
  | 'results'
  | 'common-library'
  | 'class-libraries'
  | 'users'
  | 'logs'
  | 'settings';

interface AdminDashboardProps {
  token: string;
  currentUser: AdminUser;
  onLogout: () => void;
  onSwitchToPublic: () => void;
  onPublicDataChanged: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  token,
  currentUser,
  onLogout,
  onSwitchToPublic,
  onPublicDataChanged,
}) => {
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const isTeacher = currentUser.role === 'TEACHER';
  const hasGlobalControl = isSuperAdmin || isTeacher;
  const lockedClass = currentUser.assignedClass as ClassCode | null;

  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [banner, setBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Dashboard state loaded from backend
  const [classesList, setClassesList] = useState<ClassRecord[]>([]);
  const [categoriesList, setCategoriesList] = useState<CategoryRecord[]>([]);
  const [studentsList, setStudentsList] = useState<StudentRecord[]>([]);
  const [classOfficersList, setClassOfficersList] = useState<ClassOfficerRecord[]>([]);
  const [participantsList, setParticipantsList] = useState<ParticipantRecord[]>([]);
  const [postersList, setPostersList] = useState<PosterRecord[]>([]);
  const [feedList, setFeedList] = useState<FeedPostRecord[]>([]);
  const [resultsList, setResultsList] = useState<WeeklyResultRecord[]>([]);
  const [libraryList, setLibraryList] = useState<LibraryResourceRecord[]>([]);
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [logsList, setLogsList] = useState<ActivityLogRecord[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});

  // Filter states
  const [selectedClassFilter, setSelectedClassFilter] = useState<'ALL' | ClassCode>(
    hasGlobalControl ? 'ALL' : lockedClass || 'U1'
  );
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    'ALL' | CompetitionCategoryName
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Participant Form & Modal State
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<ParticipantRecord | null>(null);
  const [pAdmissionNo, setPAdmissionNo] = useState('');
  const [pName, setPName] = useState('');
  const [pClass, setPClass] = useState<ClassCode>(lockedClass || 'U1');
  const [pCategory, setPCategory] = useState<CompetitionCategoryName>('Naat');
  const [pPhotoUrl, setPPhotoUrl] = useState(STUDIO_PORTRAIT_PRESETS[0].url);
  const [pOwnTopic, setPOwnTopic] = useState('');
  const [pDescription, setPDescription] = useState('');
  const [latestGeneratedPoster, setLatestGeneratedPoster] = useState<PosterRecord | null>(null);

  // Student Form State (Admission No + Name + Class)
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [stAdmissionNo, setStAdmissionNo] = useState('');
  const [stName, setStName] = useState('');
  const [stClass, setStClass] = useState<ClassCode>(lockedClass || 'U1');
  const [stPhotoUrl, setStPhotoUrl] = useState(STUDIO_PORTRAIT_PRESETS[1].url);
  const [stBio, setStBio] = useState('');

  // Class Officer Form State
  const [offClass, setOffClass] = useState<ClassCode>(lockedClass || 'U1');
  const [offRole, setOffRole] = useState<ClassOfficerRole>('President');
  const [offName, setOffName] = useState('');
  const [offAdmissionNo, setOffAdmissionNo] = useState('');
  const [offPhotoUrl, setOffPhotoUrl] = useState(STUDIO_PORTRAIT_PRESETS[0].url);
  const [offResponsibilities, setOffResponsibilities] = useState('');

  // Photoshop Studio Modal State
  const [studioPoster, setStudioPoster] = useState<PosterRecord | null>(null);

  // Feed Form State
  const [editingFeedPost, setEditingFeedPost] = useState<FeedPostRecord | null>(null);
  const [fClass, setFClass] = useState<ClassCode>(lockedClass || 'U2');
  const [fTitle, setFTitle] = useState('');
  const [fCaption, setFCaption] = useState('');
  const [fMediaUrl, setFMediaUrl] = useState(STUDIO_PORTRAIT_PRESETS[1].url);
  const [fMediaType, setFMediaType] = useState<'PHOTO' | 'POSTER' | 'ANNOUNCEMENT'>('PHOTO');
  const [rejectionNotes, setRejectionNotes] = useState<Record<number, string>>({});

  // Weekly Result Form State
  const [rCategory, setRCategory] = useState<'Best Speaker' | 'Best Naat'>('Best Speaker');
  const [rWinnerName, setRWinnerName] = useState('');
  const [rWinnerClass, setRWinnerClass] = useState<ClassCode>('U3');
  const [rWinnerPhoto, setRWinnerPhoto] = useState(STUDIO_PORTRAIT_PRESETS[0].url);
  const [rWeekLabel, setRWeekLabel] = useState('Week 13 • 27 Apr 2025');
  const [rDate, setRDate] = useState('2025-04-27');
  const [rRemarks, setRRemarks] = useState('');

  // Digital Library Form State
  const [lTitle, setLTitle] = useState('');
  const [lAuthor, setLAuthor] = useState(currentUser.name);
  const [lCategory, setLCategory] = useState<LibraryCategoryName>('Books');
  const [lScope, setLScope] = useState<'COMMON' | ClassCode>(
    hasGlobalControl ? 'COMMON' : lockedClass || 'U2'
  );
  const [lDescription, setLDescription] = useState('');
  const [lFileUrl, setLFileUrl] = useState('');
  const [lFileType, setLFileType] = useState('PDF');
  const [lFileSize, setLFileSize] = useState('1.2 MB');
  const [lContentPreview, setLContentPreview] = useState('');

  // User Management Form State
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uRole, setURole] = useState<'SUPER_ADMIN' | 'TEACHER' | 'CLASS_ADMIN'>('CLASS_ADMIN');
  const [uAssignedClass, setUAssignedClass] = useState<ClassCode>('U1');
  const [uPassword, setUPassword] = useState('IlmAdmin#2026');
  const [uReplaceExisting, setUReplaceExisting] = useState(true);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserRole, setEditUserRole] = useState<'SUPER_ADMIN' | 'TEACHER' | 'CLASS_ADMIN'>('CLASS_ADMIN');
  const [editUserClass, setEditUserClass] = useState<ClassCode>('U1');

  // Confirm delete dialog state
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'participant' | 'feed' | 'result' | 'library' | 'student' | 'officer' | 'user';
    id: number;
    label: string;
  } | null>(null);

  // Supabase & ImgBB Cloud Integration State
  const [sbUrl, setSbUrl] = useState('https://sdwohzszgondniptbktd.supabase.co');
  const [sbKey, setSbKey] = useState('sb_publishable_-jvbyMvuut2G0m2HNfjUYQ_ly3Tk6aj');
  const [sbStatus, setSbStatus] = useState<{ configured?: boolean; success?: boolean; message?: string } | null>(null);
  const [testingSb, setTestingSb] = useState(false);
  const [syncingSb, setSyncingSb] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlContent, setSqlContent] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [testingImgbb, setTestingImgbb] = useState(false);
  const [imgbbStatus, setImgbbStatus] = useState<string | null>(null);

  const authHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const { ok, status, data, error } = await safeFetchJson<any>('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (status === 401 || status === 403) {
        onLogout();
        return;
      }
      if (!ok || !data) {
        throw new Error(error || 'Failed to load dashboard data.');
      }
      setClassesList(data.classes || []);
      setCategoriesList(data.categories || []);
      setStudentsList(data.students || []);
      setClassOfficersList(data.classOfficers || []);
      setParticipantsList(data.participants || []);
      setPostersList(data.posters || []);
      setFeedList(data.feedPosts || []);
      setResultsList(data.weeklyResults || []);
      setLibraryList(data.libraryResources || []);
      setUsersList(data.users || []);
      setLogsList(data.activityLogs || []);
      setSettingsMap(data.settings || {});
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        text: formatErrorMessage(err, 'Failed to load dashboard data.'),
      });
    } finally {
      setLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-populate officer form fields when role/class changes
  useEffect(() => {
    const targetClass = hasGlobalControl ? offClass : lockedClass || offClass;
    const found = classOfficersList.find(
      (o) =>
        o.classCode === targetClass &&
        o.roleTitle.trim().toLowerCase() === offRole.trim().toLowerCase()
    );
    if (found) {
      setOffName(found.holderName || '');
      setOffAdmissionNo(found.admissionNo || '');
      setOffPhotoUrl(found.photoUrl || STUDIO_PORTRAIT_PRESETS[0].url);
      setOffResponsibilities(found.responsibilities || '');
    } else {
      setOffName('');
      setOffAdmissionNo('');
      setOffPhotoUrl(STUDIO_PORTRAIT_PRESETS[0].url);
      setOffResponsibilities('');
    }
  }, [offClass, offRole, classOfficersList, hasGlobalControl, lockedClass]);

  const handleFileUpload = async (
    file: File,
    onUploaded: (res: { fileUrl: string; fileType: string; fileSize: string }) => void
  ) => {
    setActionBusy(true);
    setBanner(null);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read local file'));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          fileName: file.name,
          base64Data,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'File upload failed.');
      }
      onUploaded(data);
      setBanner({
        type: 'success',
        text: `Uploaded ${file.name} successfully.`,
      });
    } catch (err: any) {
      setBanner({
        type: 'error',
        text: err.message || 'File upload failed.',
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionBusy(true);
    setBanner(null);
    try {
      const targetClass = hasGlobalControl ? pClass : lockedClass!;
      const endpoint = editingParticipant
        ? `/api/admin/participants/${editingParticipant.id}`
        : '/api/admin/participants';
      const method = editingParticipant ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({
          admissionNo: pAdmissionNo.trim(),
          fullName: pName.trim(),
          photoUrl: pPhotoUrl,
          classCode: targetClass,
          categoryName: pCategory,
          ownTopic: pCategory === 'Speech' ? pOwnTopic.trim() : null,
          shortDescription: pDescription.trim(),
          publicationStatus: 'PUBLISHED',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save participant.');
      }
      setPAdmissionNo('');
      setPName('');
      setPOwnTopic('');
      setPDescription('');
      setEditingParticipant(null);
      setShowAddParticipantModal(false);
      if (data.poster) {
        setLatestGeneratedPoster(data.poster);
      }
      setBanner({
        type: 'success',
        text: editingParticipant
          ? `Updated participant and regenerated Class ${targetClass} poster!`
          : `Added participant and generated updated Class ${targetClass} poster!`,
      });
      await fetchDashboardData();
      onPublicDataChanged();
    } catch (err: any) {
      setBanner({
        type: 'error',
        text: err.message || 'Could not save participant.',
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmDeleteAction = async () => {
    if (!confirmDelete) return;
    setActionBusy(true);
    setBanner(null);
    try {
      const { type, id, label } = confirmDelete;
      const endpoint =
        type === 'participant'
          ? `/api/admin/participants/${id}`
          : type === 'student'
          ? `/api/admin/students/${id}`
          : type === 'officer'
          ? `/api/admin/class-officers/${id}`
          : type === 'user'
          ? `/api/admin/users/${id}`
          : type === 'feed'
          ? `/api/admin/feed/${id}`
          : type === 'result'
          ? `/api/admin/results/${id}`
          : `/api/admin/library/${id}`;

      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Delete action failed.');
      }
      setConfirmDelete(null);
      setBanner({
        type: 'success',
        text: `Deleted "${label}" successfully.`,
      });
      await fetchDashboardData();
      onPublicDataChanged();
    } catch (err: any) {
      setBanner({
        type: 'error',
        text: err.message || 'Delete operation failed.',
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleRegeneratePoster = async (classCode: ClassCode, categoryName: string) => {
    setActionBusy(true);
    setBanner(null);
    try {
      const res = await fetch('/api/admin/posters/regenerate', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ classCode, categoryName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to regenerate poster.');
      }
      setBanner({
        type: 'success',
        text: `Regenerated official poster for Class ${classCode}.`,
      });
      await fetchDashboardData();
      onPublicDataChanged();
    } catch (err: any) {
      setBanner({
        type: 'error',
        text: err.message || 'Failed to regenerate poster.',
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleTogglePosterStatus = async (poster: PosterRecord) => {
    setActionBusy(true);
    setBanner(null);
    try {
      const nextStatus = poster.publicationStatus === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED';
      const res = await fetch(`/api/admin/posters/${poster.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ publicationStatus: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update poster visibility.');
      setBanner({
        type: 'success',
        text: `Poster "${poster.title}" is now ${nextStatus}.`,
      });
      await fetchDashboardData();
      onPublicDataChanged();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Could not update poster.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionBusy(true);
    setBanner(null);
    try {
      const targetClass = hasGlobalControl ? stClass : lockedClass!;
      const endpoint = editingStudent
        ? `/api/admin/students/${editingStudent.id}`
        : '/api/admin/students';
      const method = editingStudent ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({
          admissionNo: stAdmissionNo.trim(),
          fullName: stName.trim(),
          classCode: targetClass,
          photoUrl: stPhotoUrl,
          bio: stBio.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save student.');
      setStAdmissionNo('');
      setStName('');
      setStBio('');
      setEditingStudent(null);
      setBanner({
        type: 'success',
        text: `Saved student ${data.student.fullName} (${data.student.admissionNo}) successfully.`,
      });
      await fetchDashboardData();
      onPublicDataChanged();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Failed to save student.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveClassOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionBusy(true);
    setBanner(null);
    try {
      const targetClass = hasGlobalControl ? offClass : lockedClass!;
      const res = await fetch('/api/admin/class-officers', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          classCode: targetClass,
          roleTitle: offRole,
          holderName: offName.trim(),
          admissionNo: offAdmissionNo.trim(),
          photoUrl: offPhotoUrl,
          responsibilities: offResponsibilities.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save Class Officer.');
      setBanner({
        type: 'success',
        text: `Saved ${data.officer.holderName} as ${data.officer.roleTitle} for Class ${data.officer.classCode}.`,
      });
      await fetchDashboardData();
      onPublicDataChanged();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Failed to save Class Officer.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveFeedPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionBusy(true);
    setBanner(null);
    try {
      const targetClass = hasGlobalControl ? fClass : lockedClass!;
      const endpoint = editingFeedPost
        ? `/api/admin/feed/${editingFeedPost.id}`
        : '/api/admin/feed';
      const method = editingFeedPost ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({
          classCode: targetClass,
          title: fTitle.trim(),
          caption: fCaption.trim(),
          mediaUrl: fMediaUrl,
          mediaType: fMediaType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save feed post.');
      setFTitle('');
      setFCaption('');
      setEditingFeedPost(null);
      setBanner({
        type: 'success',
        text: `Published feed post "${data.post.title}" for Class ${targetClass}.`,
      });
      await fetchDashboardData();
      onPublicDataChanged();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Failed to save feed post.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handlePublishWeeklyResult = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionBusy(true);
    setBanner(null);
    try {
      const res = await fetch('/api/admin/results', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          resultCategory: rCategory,
          winnerName: rWinnerName.trim(),
          winnerClass: rWinnerClass,
          winnerPhotoUrl: rWinnerPhoto,
          weekLabel: rWeekLabel.trim(),
          resultDate: rDate,
          remarks: rRemarks.trim(),
          publicationStatus: 'PUBLISHED',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish weekly result.');
      setRWinnerName('');
      setRRemarks('');
      setBanner({
        type: 'success',
        text: `Published official ${rCategory} result: ${data.result.winnerName} (${data.result.winnerClass}).`,
      });
      await fetchDashboardData();
      onPublicDataChanged();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Failed to publish result.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleAddLibraryResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionBusy(true);
    setBanner(null);
    try {
      const effectiveScope = hasGlobalControl
        ? activeSection === 'common-library'
          ? 'COMMON'
          : lScope
        : lockedClass!;
      const res = await fetch('/api/admin/library', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: lTitle.trim(),
          author: lAuthor.trim(),
          category: lCategory,
          libraryScope: effectiveScope,
          description: lDescription.trim(),
          fileUrl: lFileUrl.trim() || `#resource-${Date.now()}`,
          fileType: lFileType,
          fileSize: lFileSize,
          contentPreview: lContentPreview.trim(),
          publicationStatus: 'PUBLISHED',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add library resource.');
      setLTitle('');
      setLDescription('');
      setLFileUrl('');
      setLContentPreview('');
      setBanner({
        type: 'success',
        text: `Published "${data.resource.title}" to library.`,
      });
      await fetchDashboardData();
      onPublicDataChanged();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Failed to add resource.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleCreateAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionBusy(true);
    setBanner(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: uName.trim(),
          email: uEmail.trim(),
          role: uRole,
          assignedClass: uRole === 'CLASS_ADMIN' ? uAssignedClass : null,
          password: uPassword,
          replaceExistingClassAdmin: uReplaceExisting,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create administrator.');
      setUName('');
      setUEmail('');
      setBanner({
        type: 'success',
        text: `Created user ${data.user.name} (${data.user.email}).`,
      });
      await fetchDashboardData();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Failed to create user.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleUpdateAdminUser = async (
    userId: number,
    updates: Partial<{
      email: string;
      name: string;
      newPassword: string;
      status: 'ACTIVE' | 'DEACTIVATED';
      assignedClass: ClassCode | null;
      role: 'SUPER_ADMIN' | 'TEACHER' | 'CLASS_ADMIN';
      replaceExistingClassAdmin: boolean;
    }>
  ) => {
    setActionBusy(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user.');
      setEditingUser(null);
      setBanner({
        type: 'success',
        text: `Updated user ${data.user.email} successfully.`,
      });
      await fetchDashboardData();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Failed to update user.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionBusy(true);
    setBanner(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          settings: settingsMap,
          classDescriptions: classesList,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings.');
      setBanner({
        type: 'success',
        text: 'Settings saved successfully.',
      });
      await fetchDashboardData();
      onPublicDataChanged();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleTestAndSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestingSb(true);
    setBanner(null);
    try {
      const res = await fetch('/api/admin/supabase-config', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          supabaseUrl: sbUrl.trim(),
          supabaseKey: sbKey.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to configure Supabase.');
      setSbStatus({ configured: true, success: true, message: data.message });
      setBanner({
        type: 'success',
        text: `✓ ${data.message}`,
      });
      await fetchDashboardData();
    } catch (err: any) {
      setSbStatus({ configured: false, success: false, message: err.message });
      setBanner({ type: 'error', text: err.message || 'Supabase setup failed.' });
    } finally {
      setTestingSb(false);
    }
  };

  const handleSyncAllToSupabase = async () => {
    setSyncingSb(true);
    setBanner(null);
    try {
      const res = await fetch('/api/admin/supabase-sync-all', {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync to Supabase.');
      setBanner({
        type: 'success',
        text: '✓ All application tables successfully synchronized with Supabase!',
      });
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Sync failed.' });
    } finally {
      setSyncingSb(false);
    }
  };

  const handleOpenSqlModal = async () => {
    setShowSqlModal(true);
    setCopiedSql(false);
    try {
      const res = await fetch('/api/admin/supabase-schema', {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.sql) {
        setSqlContent(data.sql);
      }
    } catch (err: any) {
      console.warn('Failed to load SQL schema:', err);
    }
  };

  const handleCopySql = () => {
    if (!sqlContent) return;
    navigator.clipboard.writeText(sqlContent);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleTestImgbb = async () => {
    setTestingImgbb(true);
    setImgbbStatus(null);
    try {
      const res = await fetch('/api/admin/imgbb-test', {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      setImgbbStatus(data.message || (data.success ? '✓ ImgBB Connected!' : 'ImgBB test failed'));
    } catch (err: any) {
      setImgbbStatus(`Failed to connect to ImgBB: ${err.message}`);
    } finally {
      setTestingImgbb(false);
    }
  };

  const sidebarItems: Array<{
    id: AdminSection;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }> = hasGlobalControl
    ? [
        { id: 'overview', label: 'Home', icon: Home },
        { id: 'classes', label: 'Classes (U1–U6)', icon: GraduationCap },
        { id: 'students', label: 'Students', icon: ClipboardList },
        { id: 'officers', label: 'Class Officers', icon: Crown },
        { id: 'participants', label: 'Participants', icon: Users },
        { id: 'results', label: 'Results', icon: Trophy },
        { id: 'posters', label: 'Class Posters', icon: ImageIcon },
        {
          id: 'feed',
          label: 'Feed',
          icon: CheckCircle2,
          badge: feedList.filter((f) => f.status === 'PENDING').length,
        },
        { id: 'common-library', label: 'Library', icon: BookOpen },
        { id: 'class-libraries', label: 'Class Libraries', icon: FileText },
        { id: 'categories', label: 'Categories & Limits', icon: FolderKanban },
        ...(isSuperAdmin
          ? [{ id: 'users' as AdminSection, label: 'Users', icon: Users }]
          : []),
        { id: 'logs', label: 'Activity Logs', icon: Activity },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]
    : [
        { id: 'overview', label: `Home (${lockedClass})`, icon: Home },
        { id: 'students', label: `Students (${lockedClass})`, icon: ClipboardList },
        { id: 'officers', label: `Class Officers (${lockedClass})`, icon: Crown },
        { id: 'participants', label: `Participants (${lockedClass})`, icon: Users },
        { id: 'results', label: 'Results', icon: Trophy },
        { id: 'posters', label: `Class Posters (${lockedClass})`, icon: ImageIcon },
        { id: 'feed', label: `Feed (${lockedClass})`, icon: CheckCircle2 },
        { id: 'class-libraries', label: `Library (${lockedClass})`, icon: BookOpen },
        { id: 'categories', label: 'Category Limits', icon: FolderKanban },
      ];

  const currentCategoryCount = participantsList.filter(
    (p) =>
      p.classCode === (hasGlobalControl ? pClass : lockedClass!) &&
      p.categoryName === pCategory
  ).length;
  const currentCategoryLimit = CATEGORY_MAX[pCategory] || 5;
  const isCategoryFull = currentCategoryCount >= currentCategoryLimit;

  return (
    <div className="h-screen max-h-screen w-full flex overflow-hidden bg-[#07080C] text-neutral-100">
      {/* SIDEBAR NAVIGATION */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between bg-[#0B0D14] border-r border-neutral-800/90 p-5 h-full max-h-screen overflow-hidden select-none">
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="pb-4 mb-3 border-b border-neutral-800 flex items-center justify-between shrink-0">
            <IlmLogo size="sm" showSubtitle />
          </div>
          <div className="mb-3 px-3 py-2 rounded-lg bg-[#121622] border border-[#D4AF37]/30 shrink-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#F3D068]">
              {isSuperAdmin
                ? 'Global Super Admin'
                : isTeacher
                ? 'Faculty Teacher (Full Control)'
                : `Class ${lockedClass} Administrator`}
            </div>
            <div className="text-xs text-white font-medium truncate mt-0.5">
              {currentUser.name}
            </div>
            <div className="text-[11px] text-neutral-400 truncate">
              {currentUser.email}
            </div>
          </div>
          <nav className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1 overscroll-contain">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#D4AF37]/20 to-transparent text-[#F3D068] border border-[#D4AF37]/40'
                      : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-[#D4AF37] text-neutral-950 font-mono-tabular text-[10px] font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="pt-3 mt-2 border-t border-neutral-800 space-y-2 shrink-0">
          <button
            type="button"
            onClick={onSwitchToPublic}
            className="w-full flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#141824] hover:bg-[#1B2030] text-xs font-medium text-neutral-200 border border-neutral-700 cursor-pointer transition-colors"
          >
            <Globe className="w-4 h-4 text-[#D4AF37]" />
            <span>Public Website View</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-950/30 hover:bg-red-950/60 text-xs font-medium text-red-300 border border-red-900/50 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 h-full max-h-screen overflow-hidden">
        <header className="shrink-0 z-20 bg-[#0B0D14]/95 backdrop-blur-md border-b border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-400">
              {isSuperAdmin
                ? 'ILM Global Administration'
                : isTeacher
                ? 'ILM Faculty Teacher Global Control'
                : `Class ${lockedClass} Isolated Administration`}
            </span>
            <span className="text-neutral-600" aria-hidden="true">
              /
            </span>
            <span className="text-sm font-semibold text-[#F3D068]">
              {sidebarItems.find((i) => i.id === activeSection)?.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSwitchToPublic}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs font-medium text-neutral-200 border border-neutral-700 whitespace-nowrap shrink-0 cursor-pointer"
            >
              View Public Site
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-red-950/60 text-xs font-medium text-red-300 border border-neutral-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Mobile Section Switcher */}
        <div className="lg:hidden shrink-0 bg-[#0E1118] border-b border-neutral-800 px-4 py-2.5 flex items-center gap-2 overflow-x-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
                activeSection === item.id
                  ? 'bg-[#D4AF37] text-neutral-950 font-semibold'
                  : 'bg-neutral-900 text-neutral-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {banner && (
            <div
              className={`mx-6 mt-5 p-4 rounded-xl border flex items-center justify-between gap-4 text-xs sm:text-sm ${
                banner.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200'
                  : 'bg-red-950/50 border-red-700/60 text-red-200'
              }`}
            >
              <span>{banner.text}</span>
              <button
                type="button"
                onClick={() => setBanner(null)}
                className="p-1 rounded hover:bg-black/30 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <main className="p-6 sm:p-8 space-y-8">
            {loading ? (
              <div className="p-12 text-center text-sm text-neutral-400 animate-pulse">
                Loading dashboard data...
              </div>
            ) : (
              <>
                {/* 1. OVERVIEW / HOME */}
                {activeSection === 'overview' && (
                  <div className="space-y-8">
                    <CompetitionStageAndTimer
                      participants={participantsList}
                      activeClassFilter={hasGlobalControl ? selectedClassFilter : lockedClass!}
                      allowClassSwitch={hasGlobalControl}
                      title={
                        hasGlobalControl
                          ? 'Live Competition Stage & Timer'
                          : `Class ${lockedClass} Live Stage & Timer`
                      }
                    />

                    <div className="p-6 rounded-2xl bg-[#0E1118] border border-neutral-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="font-display text-xl font-bold text-white">
                          Official Unified Class Posters
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {postersList.map((poster) => (
                          <PosterStageCard
                            key={poster.id}
                            poster={poster}
                            liveParticipants={participantsList}
                            canManage={true}
                            onOpenStudio={(target) => setStudioPoster(target)}
                            onRegenerate={() => handleRegeneratePoster(poster.classCode, poster.categoryName)}
                            onPosterUpdated={() => {
                              fetchDashboardData();
                              onPublicDataChanged();
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. CLASSES */}
                {activeSection === 'classes' && hasGlobalControl && (
                  <div className="space-y-6">
                    <h1 className="font-display text-2xl font-bold text-white">
                      Classes (U1 – U6) Overview
                    </h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {VALID_CLASSES.map((code) => {
                        const count = participantsList.filter((p) => p.classCode === code).length;
                        return (
                          <div key={code} className="p-6 rounded-xl bg-[#0E1118] border border-neutral-800">
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-bold text-xl text-[#F3D068]">Class {code}</span>
                              <span className="text-xs text-neutral-400 font-mono">{count} / 24 Scholars</span>
                            </div>
                            <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden mb-4">
                              <div
                                className="bg-[#D4AF37] h-full"
                                style={{ width: `${(count / 24) * 100}%` }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClassFilter(code);
                                setActiveSection('participants');
                              }}
                              className="w-full py-2 rounded-lg bg-[#141824] hover:bg-[#1C2130] text-xs font-semibold text-white border border-neutral-700 cursor-pointer"
                            >
                              Manage Class {code} Participants
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. STUDENTS ROSTER */}
                {activeSection === 'students' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h1 className="font-display text-2xl font-bold text-white">
                        Students Roster ({hasGlobalControl ? 'All Classes' : `Class ${lockedClass}`})
                      </h1>
                    </div>

                    <form onSubmit={handleSaveStudent} className="p-6 rounded-xl bg-[#0E1118] border border-[#D4AF37]/40 space-y-4">
                      <h3 className="font-bold text-sm text-white">
                        {editingStudent ? 'Edit Student' : '+ Add New Student to Class'}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">
                            Admission Number *
                          </label>
                          <input
                            type="text"
                            required
                            value={stAdmissionNo}
                            onChange={(e) => setStAdmissionNo(e.target.value)}
                            placeholder="e.g. ADM-U1-101"
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={stName}
                            onChange={(e) => setStName(e.target.value)}
                            placeholder="Student Full Name"
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">
                            Class *
                          </label>
                          <select
                            value={hasGlobalControl ? stClass : lockedClass!}
                            disabled={!hasGlobalControl}
                            onChange={(e) => setStClass(e.target.value as ClassCode)}
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          >
                            {VALID_CLASSES.map((c) => (
                              <option key={c} value={c}>Class {c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        {editingStudent && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStudent(null);
                              setStAdmissionNo('');
                              setStName('');
                            }}
                            className="px-4 py-2 rounded-lg bg-neutral-900 text-xs text-neutral-300 border border-neutral-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-lg bg-[#D4AF37] text-neutral-950 font-bold text-xs cursor-pointer"
                        >
                          {editingStudent ? 'Save Changes' : '+ Add Student'}
                        </button>
                      </div>
                    </form>

                    <div className="rounded-xl bg-[#0E1118] border border-neutral-800 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-neutral-800 text-neutral-400">
                            <th className="p-3">Admission No</th>
                            <th className="p-3">Name</th>
                            <th className="p-3">Class</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                          {studentsList
                            .filter((s) => !hasGlobalControl ? s.classCode === lockedClass : true)
                            .map((st) => (
                              <tr key={st.id} className="hover:bg-[#141824]">
                                <td className="p-3 font-mono text-emerald-400">{st.admissionNo}</td>
                                <td className="p-3 font-semibold text-white">{st.fullName}</td>
                                <td className="p-3 text-[#F3D068]">Class {st.classCode}</td>
                                <td className="p-3 text-right space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingStudent(st);
                                      setStAdmissionNo(st.admissionNo);
                                      setStName(st.fullName);
                                      setStClass(st.classCode);
                                    }}
                                    className="text-[#F3D068] hover:underline"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDelete({ type: 'student', id: st.id, label: st.fullName })}
                                    className="text-red-400 hover:underline"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. CLASS OFFICERS */}
                {activeSection === 'officers' && (
                  <div className="space-y-6">
                    <h1 className="font-display text-2xl font-bold text-white">
                      Class Teachers & Officers Management
                    </h1>
                    <form onSubmit={handleSaveClassOfficer} className="p-6 rounded-xl bg-[#0E1118] border border-[#D4AF37]/40 space-y-4">
                      <h3 className="font-bold text-sm text-white">Assign or Update Class Officer</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">Class</label>
                          <select
                            value={hasGlobalControl ? offClass : lockedClass!}
                            disabled={!hasGlobalControl}
                            onChange={(e) => setOffClass(e.target.value as ClassCode)}
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          >
                            {VALID_CLASSES.map((c) => (
                              <option key={c} value={c}>Class {c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">Role Title</label>
                          <select
                            value={offRole}
                            onChange={(e) => setOffRole(e.target.value as ClassOfficerRole)}
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          >
                            {CLASS_OFFICER_ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">Holder Name *</label>
                          <input
                            type="text"
                            required
                            value={offName}
                            onChange={(e) => setOffName(e.target.value)}
                            placeholder="Full Name"
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="submit"
                            className="w-full py-2 rounded-lg bg-[#D4AF37] text-neutral-950 font-bold text-xs cursor-pointer"
                          >
                            Save Officer
                          </button>
                        </div>
                      </div>
                    </form>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {classOfficersList
                        .filter((o) => !hasGlobalControl ? o.classCode === lockedClass : true)
                        .map((o) => (
                          <div key={o.id} className="p-4 rounded-xl bg-[#0E1118] border border-neutral-800 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-[#F3D068]">
                                Class {o.classCode} • {o.roleTitle}
                              </span>
                              <h4 className="font-bold text-white text-sm mt-0.5">{o.holderName}</h4>
                            </div>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete({ type: 'officer', id: o.id, label: `${o.roleTitle}: ${o.holderName}` })}
                              className="text-xs text-red-400 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* 5. PARTICIPANTS */}
                {activeSection === 'participants' && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                      <h1 className="font-display text-2xl font-bold text-white">
                        Participants & Competition Slots
                      </h1>
                      <div className="flex gap-2">
                        {hasGlobalControl && (
                          <select
                            value={selectedClassFilter}
                            onChange={(e) => setSelectedClassFilter(e.target.value as 'ALL' | ClassCode)}
                            className="px-3 py-1.5 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          >
                            <option value="ALL">All Classes (U1–U6)</option>
                            {VALID_CLASSES.map((c) => (
                              <option key={c} value={c}>Class {c}</option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingParticipant(null);
                            setPName('');
                            setPAdmissionNo('');
                            setPOwnTopic('');
                            setPPhotoUrl(STUDIO_PORTRAIT_PRESETS[0].url);
                            setShowAddParticipantModal(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-[#D4AF37] text-neutral-950 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Participant
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#0E1118] border border-neutral-800 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-neutral-800 text-neutral-400">
                            <th className="p-3">Scholar & Photo</th>
                            <th className="p-3">Admission No</th>
                            <th className="p-3">Class</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Topic</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                          {participantsList
                            .filter((p) => {
                              if (hasGlobalControl && selectedClassFilter !== 'ALL' && p.classCode !== selectedClassFilter) return false;
                              if (!hasGlobalControl && p.classCode !== lockedClass) return false;
                              return true;
                            })
                            .map((p) => (
                              <tr key={p.id} className="hover:bg-[#141824]">
                                <td className="p-3 font-semibold text-white flex items-center gap-2.5">
                                  <img
                                    src={p.photoUrl || STUDIO_PORTRAIT_PRESETS[0].url}
                                    alt={p.fullName}
                                    className="w-8 h-8 rounded-full object-cover border border-[#D4AF37]/50 bg-neutral-900 shrink-0"
                                  />
                                  <span>{p.fullName}</span>
                                </td>
                                <td className="p-3 font-mono text-emerald-400">{p.admissionNo || '—'}</td>
                                <td className="p-3 text-[#F3D068]">Class {p.classCode}</td>
                                <td className="p-3 text-neutral-300">{p.categoryName}</td>
                                <td className="p-3 text-neutral-400">{p.ownTopic || '—'}</td>
                                <td className="p-3 text-right space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingParticipant(p);
                                      setPName(p.fullName);
                                      setPAdmissionNo(p.admissionNo || '');
                                      setPClass(p.classCode);
                                      setPCategory(p.categoryName);
                                      setPOwnTopic(p.ownTopic || '');
                                      setPPhotoUrl(p.photoUrl || STUDIO_PORTRAIT_PRESETS[0].url);
                                      setShowAddParticipantModal(true);
                                    }}
                                    className="text-[#F3D068] hover:underline"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDelete({ type: 'participant', id: p.id, label: p.fullName })}
                                    className="text-red-400 hover:underline"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 6. CATEGORIES & LIMITS */}
                {activeSection === 'categories' && (
                  <div className="space-y-6">
                    <h1 className="font-display text-2xl font-bold text-white">
                      Competition Categories & Limits
                    </h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {COMPETITION_CATEGORIES.map((cat) => {
                        const max = CATEGORY_MAX[cat];
                        return (
                          <div key={cat} className="p-5 rounded-xl bg-[#0E1118] border border-neutral-800">
                            <h3 className="font-bold text-white text-base">{cat}</h3>
                            <span className="text-xs text-[#F3D068] font-mono block mt-1">Limit: {max} per class</span>
                            <div className="mt-3 pt-3 border-t border-neutral-800 text-[11px] text-neutral-400">
                              {VALID_CLASSES.map((c) => {
                                const count = participantsList.filter((p) => p.classCode === c && p.categoryName === cat).length;
                                return (
                                  <div key={c} className="flex justify-between py-0.5">
                                    <span>Class {c}:</span>
                                    <span className={count >= max ? 'text-amber-400 font-bold' : 'text-neutral-300'}>
                                      {count} / {max}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 7. POSTERS */}
                {activeSection === 'posters' && (
                  <div className="space-y-6">
                    <h1 className="font-display text-2xl font-bold text-white">
                      Official Posters Management
                    </h1>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      {postersList
                        .filter((p) => !hasGlobalControl ? p.classCode === lockedClass : true)
                        .map((poster) => (
                          <PosterStageCard
                            key={poster.id}
                            poster={poster}
                            liveParticipants={participantsList}
                            canManage={true}
                            onOpenStudio={(target) => setStudioPoster(target)}
                            onRegenerate={() => handleRegeneratePoster(poster.classCode, poster.categoryName)}
                            onPosterUpdated={() => {
                              fetchDashboardData();
                              onPublicDataChanged();
                            }}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* 8. FEED */}
                {activeSection === 'feed' && (
                  <div className="space-y-6">
                    <h1 className="font-display text-2xl font-bold text-white">
                      Class & Public Feed
                    </h1>
                    <form onSubmit={handleSaveFeedPost} className="p-6 rounded-xl bg-[#0E1118] border border-neutral-800 space-y-4">
                      <h3 className="font-bold text-white text-sm">Post to Feed</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">Title *</label>
                          <input
                            type="text"
                            required
                            value={fTitle}
                            onChange={(e) => setFTitle(e.target.value)}
                            placeholder="Post Title"
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">Class</label>
                          <select
                            value={hasGlobalControl ? fClass : lockedClass!}
                            disabled={!hasGlobalControl}
                            onChange={(e) => setFClass(e.target.value as ClassCode)}
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          >
                            {VALID_CLASSES.map((c) => (
                              <option key={c} value={c}>Class {c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">Media Type</label>
                          <select
                            value={fMediaType}
                            onChange={(e) => setFMediaType(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          >
                            <option value="PHOTO">Photo</option>
                            <option value="POSTER">Poster</option>
                            <option value="ANNOUNCEMENT">Announcement</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">Caption</label>
                        <textarea
                          rows={2}
                          value={fCaption}
                          onChange={(e) => setFCaption(e.target.value)}
                          placeholder="Write post caption..."
                          className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-lg bg-[#D4AF37] text-neutral-950 font-bold text-xs cursor-pointer"
                        >
                          Publish to Feed
                        </button>
                      </div>
                    </form>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {feedList.map((post) => (
                        <div key={post.id} className="p-4 rounded-xl bg-[#0E1118] border border-neutral-800">
                          <img src={post.mediaUrl} alt={post.title} className="w-full h-40 object-cover rounded-lg mb-3" />
                          <span className="text-[10px] text-[#F3D068] uppercase font-bold">Class {post.classCode}</span>
                          <h4 className="font-bold text-white text-sm mt-0.5">{post.title}</h4>
                          <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{post.caption}</p>
                          <div className="mt-3 pt-3 border-t border-neutral-800 flex justify-between items-center">
                            <span className="text-[10px] text-neutral-500">{post.submittedByName}</span>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete({ type: 'feed', id: post.id, label: post.title })}
                              className="text-xs text-red-400 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 9. RESULTS */}
                {activeSection === 'results' && (
                  <div className="space-y-6">
                    <h1 className="font-display text-2xl font-bold text-white">
                      Official Weekly Results
                    </h1>
                    {hasGlobalControl && (
                      <form onSubmit={handlePublishWeeklyResult} className="p-6 rounded-xl bg-[#0E1118] border border-[#D4AF37]/40 space-y-4">
                        <h3 className="font-bold text-white text-sm">Publish New Laureate</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1">Category</label>
                            <select
                              value={rCategory}
                              onChange={(e) => setRCategory(e.target.value as any)}
                              className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                            >
                              <option value="Best Speaker">Best Speaker</option>
                              <option value="Best Naat">Best Naat</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1">Winner Name *</label>
                            <input
                              type="text"
                              required
                              value={rWinnerName}
                              onChange={(e) => setRWinnerName(e.target.value)}
                              placeholder="Winner Full Name"
                              className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1">Class</label>
                            <select
                              value={rWinnerClass}
                              onChange={(e) => setRWinnerClass(e.target.value as ClassCode)}
                              className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                            >
                              {VALID_CLASSES.map((c) => (
                                <option key={c} value={c}>Class {c}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-300 mb-1">Week Label</label>
                            <input
                              type="text"
                              required
                              value={rWeekLabel}
                              onChange={(e) => setRWeekLabel(e.target.value)}
                              placeholder="e.g. Week 13"
                              className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="px-5 py-2 rounded-lg bg-[#D4AF37] text-neutral-950 font-bold text-xs cursor-pointer"
                          >
                            Publish Result
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {resultsList.map((res) => (
                        <div key={res.id} className="p-4 rounded-xl bg-[#0E1118] border border-neutral-800 flex items-center justify-between">
                          <div>
                            <span className="text-xs text-[#F3D068] font-bold">{res.resultCategory}</span>
                            <h4 className="font-bold text-white text-base mt-0.5">{res.winnerName}</h4>
                            <span className="text-xs text-neutral-400">Class {res.winnerClass} • {res.weekLabel}</span>
                          </div>
                          {hasGlobalControl && (
                            <button
                              type="button"
                              onClick={() => setConfirmDelete({ type: 'result', id: res.id, label: res.winnerName })}
                              className="text-xs text-red-400 hover:underline"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 10. LIBRARY (COMMON & CLASS) */}
                {(activeSection === 'common-library' || activeSection === 'class-libraries') && (
                  <div className="space-y-6">
                    <h1 className="font-display text-2xl font-bold text-white">
                      {activeSection === 'common-library' ? 'Common Public Library' : 'Class Digital Libraries'}
                    </h1>
                    <form onSubmit={handleAddLibraryResource} className="p-6 rounded-xl bg-[#0E1118] border border-neutral-800 space-y-4">
                      <h3 className="font-bold text-white text-sm">Add New Resource</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">Title *</label>
                          <input
                            type="text"
                            required
                            value={lTitle}
                            onChange={(e) => setLTitle(e.target.value)}
                            placeholder="Resource Title"
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">Category</label>
                          <select
                            value={lCategory}
                            onChange={(e) => setLCategory(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          >
                            {LIBRARY_CATEGORIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">Target Scope</label>
                          <select
                            value={activeSection === 'common-library' ? 'COMMON' : lScope}
                            disabled={activeSection === 'common-library' || !hasGlobalControl}
                            onChange={(e) => setLScope(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          >
                            <option value="COMMON">Common Library</option>
                            {VALID_CLASSES.map((c) => (
                              <option key={c} value={c}>Class {c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-lg bg-[#D4AF37] text-neutral-950 font-bold text-xs cursor-pointer"
                        >
                          Upload Resource
                        </button>
                      </div>
                    </form>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {libraryList
                        .filter((item) =>
                          activeSection === 'common-library'
                            ? item.libraryScope === 'COMMON'
                            : item.libraryScope !== 'COMMON'
                        )
                        .map((res) => (
                          <div key={res.id} className="p-4 rounded-xl bg-[#0E1118] border border-neutral-800 flex justify-between items-start">
                            <div>
                              <span className="text-[10px] text-[#F3D068] uppercase font-bold">{res.category} • {res.libraryScope}</span>
                              <h4 className="font-bold text-white text-sm mt-0.5">{res.title}</h4>
                            </div>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete({ type: 'library', id: res.id, label: res.title })}
                              className="text-xs text-red-400 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* 11. USERS (SUPER ADMIN ONLY) */}
                {activeSection === 'users' && isSuperAdmin && (
                  <div className="space-y-6">
                    <h1 className="font-display text-2xl font-bold text-white">
                      User & Administrator Management
                    </h1>

                    <form onSubmit={handleCreateAdminUser} className="p-6 rounded-xl bg-[#0E1118] border border-[#D4AF37]/40 space-y-4">
                      <h3 className="font-bold text-white text-sm">+ Create New User</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">Full Name</label>
                          <input
                            type="text"
                            required
                            value={uName}
                            onChange={(e) => setUName(e.target.value)}
                            placeholder="Name"
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">Username / Gmail</label>
                          <input
                            type="text"
                            required
                            value={uEmail}
                            onChange={(e) => setUEmail(e.target.value)}
                            placeholder="Email or Username"
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">Password</label>
                          <input
                            type="text"
                            required
                            value={uPassword}
                            onChange={(e) => setUPassword(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">Role</label>
                          <select
                            value={uRole}
                            onChange={(e) => setURole(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          >
                            <option value="CLASS_ADMIN">Class Admin</option>
                            <option value="TEACHER">Teacher</option>
                            <option value="SUPER_ADMIN">Super Admin</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">Class</label>
                          <select
                            value={uAssignedClass}
                            disabled={uRole !== 'CLASS_ADMIN'}
                            onChange={(e) => setUAssignedClass(e.target.value as ClassCode)}
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white disabled:opacity-50"
                          >
                            {VALID_CLASSES.map((c) => (
                              <option key={c} value={c}>Class {c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-lg bg-[#D4AF37] text-neutral-950 font-bold text-xs cursor-pointer"
                        >
                          Add User
                        </button>
                      </div>
                    </form>

                    <div className="rounded-xl bg-[#0E1118] border border-neutral-800 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-neutral-800 text-neutral-400">
                            <th className="p-3">Name</th>
                            <th className="p-3">Email / Username</th>
                            <th className="p-3">Password</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Assigned Class</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                          {usersList.map((u) => (
                            <tr key={u.id} className="hover:bg-[#141824]">
                              <td className="p-3 font-semibold text-white">{u.name}</td>
                              <td className="p-3 text-emerald-400 font-mono">{u.email}</td>
                              <td className="p-3 font-mono text-[#F3D068]">{u.passwordPlain || '••••••••'}</td>
                              <td className="p-3">{u.role}</td>
                              <td className="p-3">{u.assignedClass ? `Class ${u.assignedClass}` : 'Global'}</td>
                              <td className="p-3 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete({ type: 'user', id: u.id, label: u.name })}
                                  className="text-red-400 hover:underline"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 12. LOGS */}
                {activeSection === 'logs' && hasGlobalControl && (
                  <div className="space-y-6">
                    <h1 className="font-display text-2xl font-bold text-white">
                      Activity Logs
                    </h1>
                    <div className="rounded-xl bg-[#0E1118] border border-neutral-800 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-neutral-800 text-neutral-400">
                            <th className="p-3">Action</th>
                            <th className="p-3">Actor</th>
                            <th className="p-3">Details</th>
                            <th className="p-3">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                          {logsList.map((log) => (
                            <tr key={log.id} className="hover:bg-[#141824]">
                              <td className="p-3 font-bold text-[#F3D068]">{log.action}</td>
                              <td className="p-3 text-neutral-300">{log.actorEmail}</td>
                              <td className="p-3 text-neutral-200">{log.details}</td>
                              <td className="p-3 text-neutral-500 font-mono">
                                {new Date(log.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 13. SETTINGS */}
                {activeSection === 'settings' && hasGlobalControl && (
                  <div className="space-y-6 max-w-3xl">
                    <div>
                      <h1 className="font-display text-2xl font-bold text-white">
                        Platform Settings & Database
                      </h1>
                      <p className="text-xs text-neutral-400 mt-1">
                        Configure platform details, ImgBB image hosting, and Supabase cloud database synchronization.
                      </p>
                    </div>

                    {/* GENERAL PLATFORM CONFIGURATION */}
                    <div className="p-6 rounded-xl bg-[#0E1118] border border-neutral-800 space-y-4">
                      <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Settings className="w-4 h-4 text-[#D4AF37]" />
                        General Information
                      </h2>
                      <form onSubmit={handleSavePlatformSettings} className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">
                            Platform Name
                          </label>
                          <input
                            type="text"
                            value={settingsMap.platformName || 'ILM - Integrated Learning Master'}
                            onChange={(e) => setSettingsMap((m) => ({ ...m, platformName: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">
                            Motto
                          </label>
                          <input
                            type="text"
                            value={settingsMap.motto || 'Learn • Compete • Grow'}
                            onChange={(e) => setSettingsMap((m) => ({ ...m, motto: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">
                            Current Academic Week Label
                          </label>
                          <input
                            type="text"
                            value={settingsMap.currentAcademicWeek || 'Week 13'}
                            onChange={(e) => setSettingsMap((m) => ({ ...m, currentAcademicWeek: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                          />
                        </div>
                        <div className="pt-1">
                          <button
                            type="submit"
                            disabled={actionBusy}
                            className="px-5 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#e4c04f] text-neutral-950 font-bold text-xs cursor-pointer disabled:opacity-50"
                          >
                            Save Platform Settings
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* IMGBB IMAGE HOSTING CARD */}
                    <div className="p-6 rounded-xl bg-[#0E1118] border border-emerald-900/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-5 h-5 text-emerald-400" />
                          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                            ImgBB Cloud Image Storage
                          </h2>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Active & Connected
                        </span>
                      </div>

                      <p className="text-xs text-neutral-300">
                        All student portraits, winner awards, competition posters, and campus feed images are hosted on ImgBB using your dedicated API key.
                      </p>

                      <div className="p-3 rounded-lg bg-[#12151F] border border-neutral-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-neutral-400">ImgBB API Key:</span>
                          <span className="font-mono text-emerald-300 font-semibold">
                            7443bf294f338b5a0c690e7de1fc2acd
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-neutral-400">Storage Provider:</span>
                          <span className="text-neutral-200">api.imgbb.com (Direct CDN Delivery)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={handleTestImgbb}
                          disabled={testingImgbb}
                          className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${testingImgbb ? 'animate-spin' : ''}`} />
                          {testingImgbb ? 'Testing Connection...' : 'Test ImgBB Upload'}
                        </button>
                        {imgbbStatus && (
                          <span className="text-xs text-emerald-300 font-medium">
                            {imgbbStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* SUPABASE CLOUD DATABASE CARD */}
                    <div className="p-6 rounded-xl bg-[#0E1118] border border-[#3ECF8E]/40 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Database className="w-5 h-5 text-[#3ECF8E]" />
                          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                            Supabase Cloud Database (PostgreSQL)
                          </h2>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#3ECF8E]/10 text-[#3ECF8E] border border-[#3ECF8E]/30">
                          Supabase Native
                        </span>
                      </div>

                      <p className="text-xs text-neutral-300">
                        Connect your Supabase project to store and persist all platform data (Users, Classes, Students, Officers, Participants, Posters, Weekly Results, and Library Resources).
                      </p>

                      <div className="flex flex-wrap gap-2 pt-1 pb-2">
                        <button
                          type="button"
                          onClick={handleOpenSqlModal}
                          className="px-4 py-2 rounded-lg bg-[#3ECF8E] hover:bg-[#35b87c] text-neutral-950 font-bold text-xs cursor-pointer flex items-center gap-2"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          View & Copy Supabase SQL Schema (DQL / DDL)
                        </button>
                        <button
                          type="button"
                          onClick={handleSyncAllToSupabase}
                          disabled={syncingSb}
                          className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs cursor-pointer border border-neutral-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingSb ? 'animate-spin' : ''}`} />
                          {syncingSb ? 'Synchronizing...' : 'Sync All Tables to Supabase'}
                        </button>
                      </div>

                      <form onSubmit={handleTestAndSaveSupabase} className="space-y-3 pt-2 border-t border-neutral-800">
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">
                            Supabase Project URL
                          </label>
                          <input
                            type="text"
                            placeholder="https://your-ref.supabase.co"
                            value={sbUrl}
                            onChange={(e) => setSbUrl(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-300 mb-1">
                            Supabase Key (Anon Key or Service Role Key)
                          </label>
                          <input
                            type="password"
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            value={sbKey}
                            onChange={(e) => setSbKey(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white font-mono"
                          />
                        </div>
                        <div className="pt-1 flex items-center gap-3">
                          <button
                            type="submit"
                            disabled={testingSb}
                            className="px-4 py-2 rounded-lg bg-[#1C8B64] hover:bg-[#177755] text-white font-bold text-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
                          >
                            <Database className="w-3.5 h-3.5" />
                            {testingSb ? 'Verifying...' : 'Save & Verify Supabase Connection'}
                          </button>
                          {sbStatus && (
                            <span className={`text-xs ${sbStatus.success ? 'text-[#3ECF8E]' : 'text-red-400'}`}>
                              {sbStatus.message}
                            </span>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* ADD PARTICIPANT MODAL */}
      {showAddParticipantModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0E1118] border border-[#D4AF37]/50 p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="font-display text-lg font-bold text-white">
                {editingParticipant ? 'Edit Participant' : '+ Add Participant'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddParticipantModal(false)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveParticipant} className="space-y-4">
              {/* Photo Upload & Preview */}
              <div className="p-3.5 rounded-xl bg-[#12151F] border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-neutral-300">
                    Participant Photo (Poster Slot & Feed)
                  </label>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    ImgBB Auto-Host
                  </span>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="relative shrink-0">
                    <img
                      src={pPhotoUrl || STUDIO_PORTRAIT_PRESETS[0].url}
                      alt="Participant Preview"
                      className="w-16 h-16 rounded-xl object-cover border-2 border-[#D4AF37] bg-neutral-900 shadow-md"
                    />
                    <div className="absolute -bottom-1 -right-1 p-1 bg-[#D4AF37] rounded-full text-neutral-950 shadow">
                      <Camera className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#e4c04f] text-neutral-950 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        {actionBusy ? 'Uploading...' : 'Upload Scholar Photo'}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={actionBusy}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(file, (data) => {
                                setPPhotoUrl(data.fileUrl);
                              });
                            }
                          }}
                        />
                      </label>
                      <span className="text-[11px] text-neutral-400">
                        PNG, JPG or WEBP
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Or Pick Avatar:</span>
                      <div className="flex items-center gap-1">
                        {STUDIO_PORTRAIT_PRESETS.slice(0, 6).map((preset) => (
                          <button
                            key={preset.url}
                            type="button"
                            onClick={() => setPPhotoUrl(preset.url)}
                            className={`w-6 h-6 rounded-full overflow-hidden border cursor-pointer transition-transform ${
                              pPhotoUrl === preset.url
                                ? 'border-[#D4AF37] scale-110 ring-1 ring-[#D4AF37]'
                                : 'border-neutral-700 opacity-60 hover:opacity-100'
                            }`}
                            title={preset.label}
                          >
                            <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder="Participant Name"
                  className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Admission No</label>
                  <input
                    type="text"
                    value={pAdmissionNo}
                    onChange={(e) => setPAdmissionNo(e.target.value)}
                    placeholder="e.g. ADM-U1-101"
                    className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Class</label>
                  <select
                    value={hasGlobalControl ? pClass : lockedClass!}
                    disabled={!hasGlobalControl}
                    onChange={(e) => setPClass(e.target.value as ClassCode)}
                    className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                  >
                    {VALID_CLASSES.map((c) => (
                      <option key={c} value={c}>Class {c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Category *</label>
                <select
                  value={pCategory}
                  onChange={(e) => {
                    const nextCat = e.target.value as CompetitionCategoryName;
                    setPCategory(nextCat);
                    if (nextCat !== 'Speech') {
                      setPOwnTopic('');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white"
                >
                  {COMPETITION_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat} ({participantsList.filter((p) => p.classCode === (hasGlobalControl ? pClass : lockedClass!) && p.categoryName === cat).length}/{CATEGORY_MAX[cat]})
                    </option>
                  ))}
                </select>
              </div>

              {/* TOPIC ONLY DISPLAYED FOR SPEECH CATEGORY AND MARKED OPTIONAL */}
              {pCategory === 'Speech' && (
                <div className="p-3 rounded-lg bg-[#12151F] border border-[#D4AF37]/30 space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-neutral-200">
                      Speech Topic / Title <span className="text-[#D4AF37]">(Optional)</span>
                    </label>
                    <span className="text-[10px] text-[#D4AF37] font-semibold uppercase tracking-wider">
                      Speech Category Only
                    </span>
                  </div>
                  <input
                    type="text"
                    value={pOwnTopic}
                    onChange={(e) => setPOwnTopic(e.target.value)}
                    placeholder="e.g. The Power of Integrity and Truth (Optional)..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0E1118] border border-neutral-700 text-xs text-white"
                  />
                  <p className="text-[10px] text-neutral-400">
                    Other categories (Qirat, Naat, Evolution, etc.) do not require individual speech topics.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddParticipantModal(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-900 text-xs text-neutral-300 border border-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy || isCategoryFull}
                  className="px-5 py-2 rounded-lg bg-[#D4AF37] text-neutral-950 font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {actionBusy ? 'Saving...' : 'Save & Update Poster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHOTOSHOP STUDIO MODAL */}
      {studioPoster && (
        <PosterPhotoshopStudio
          poster={studioPoster}
          liveParticipants={participantsList}
          onClose={() => setStudioPoster(null)}
          onSavePoster={async (posterId, updatedDataUrl, title, subtitle, participantsSnapshot) => {
            await fetch(`/api/admin/posters/${posterId}`, {
              method: 'PATCH',
              headers: authHeaders(),
              body: JSON.stringify({
                posterImageUrl: updatedDataUrl,
                title,
                subtitle,
                participantsSnapshot,
              }),
            });
            setStudioPoster(null);
            fetchDashboardData();
            onPublicDataChanged();
          }}
          onPostToFeed={async (targetPoster, renderedDataUrl, caption) => {
            await fetch('/api/admin/feed', {
              method: 'POST',
              headers: authHeaders(),
              body: JSON.stringify({
                classCode: targetPoster.classCode,
                title: `Class ${targetPoster.classCode} Official Poster`,
                caption,
                mediaUrl: renderedDataUrl,
                mediaType: 'POSTER',
              }),
            });
            fetchDashboardData();
            onPublicDataChanged();
          }}
        />
      )}

      {/* SUPABASE SQL SCHEMA VIEWER MODAL */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[#0E1118] border border-[#3ECF8E]/60 flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-[#12151F]">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#3ECF8E]" />
                <h3 className="font-display text-base font-bold text-white">
                  Supabase PostgreSQL Schema & Initial Seed Script
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3 py-1.5 rounded-lg bg-[#3ECF8E] hover:bg-[#35b87c] text-neutral-950 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? 'Copied to Clipboard!' : 'Copy Entire SQL'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 text-xs text-neutral-300 space-y-1">
              <p>
                <strong className="text-white">How to execute:</strong> Open your Supabase Dashboard → Go to <strong className="text-white">SQL Editor</strong> → Click <strong className="text-white">New Query</strong> → Paste this script → Click <strong className="text-white">Run</strong>.
              </p>
              <p className="text-[11px] text-neutral-400">
                Creates all 12 core tables (users, classes, students, class_officers, competition_categories, participants, posters, feed_posts, weekly_results, library_resources, activity_logs, platform_settings) with RLS policies and seeds.
              </p>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-[#080A0F]">
              <pre className="text-xs font-mono text-[#E6EDF3] leading-relaxed whitespace-pre selection:bg-[#3ECF8E]/30 selection:text-white">
                {sqlContent || '-- Loading supabase_schema.sql...'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl bg-[#0E1118] border border-red-500/50 p-6 space-y-4">
            <h4 className="font-bold text-white text-base">Confirm Deletion</h4>
            <p className="text-xs text-neutral-300">
              Are you sure you want to delete <strong className="text-white">{confirmDelete.label}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg bg-neutral-900 text-xs text-neutral-300 border border-neutral-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAction}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
