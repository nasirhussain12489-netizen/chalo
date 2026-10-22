import React, { useState, useMemo } from 'react';
import {
  Award,
  BookOpen,
  Crown,
  Download,
  ExternalLink,
  Eye,
  FileText,
  GraduationCap,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  Library,
  Lock,
  Mail,
  Search,
  Sparkles,
  Trophy,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
  Share2,
  Sliders,
  Upload,
  Check,
  Phone,
  MapPin,
  Clock,
  Heart,
  MessageSquare,
  Send,
  Shield,
  Menu,
  HelpCircle,
  FolderOpen,
} from 'lucide-react';
import {
  AdminUser,
  ClassCode,
  ClassOfficerRole,
  CompetitionCategoryName,
  FeedPostRecord,
  LibraryCategoryName,
  LibraryResourceRecord,
  ParticipantRecord,
  PosterRecord,
  PublicBootstrapData,
  WeeklyResultRecord,
} from '../types.ts';
import { IlmLogo, downloadPosterAsPng } from './IlmLogo.tsx';
import { PosterStageCard } from './PosterStageCard.tsx';
import { PosterPhotoshopStudio } from './PosterPhotoshopStudio.tsx';
import { ILM_JUNIOR_PROJECTS, IlmJuniorProject } from '../lib/ilmJuniorProjects.ts';
import heroImage from '../assets/images/ilm-hero.jpg';

export type PublicTab =
  | 'home'
  | 'classes'
  | 'officers'
  | 'posters'
  | 'feed'
  | 'results'
  | 'library'
  | 'about'
  | 'contact';

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

interface PublicWebsiteProps {
  data: PublicBootstrapData;
  currentAdmin: AdminUser | null;
  onOpenAdminLogin: () => void;
  onSwitchToDashboard: () => void;
  onRefreshData?: () => void;
}

export const PublicWebsite: React.FC<PublicWebsiteProps> = ({
  data,
  currentAdmin,
  onOpenAdminLogin,
  onSwitchToDashboard,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<PublicTab>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuredPosterIndex, setFeaturedPosterIndex] = useState(0);
  const [studioPoster, setStudioPoster] = useState<PosterRecord | null>(null);

  // Class view state
  const [selectedClass, setSelectedClass] = useState<ClassCode>('U1');
  const [scholarSearch, setScholarSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>('ALL');

  // Officers view state
  const [officerClassFilter, setOfficerClassFilter] = useState<
    'ALL' | ClassCode
  >('ALL');
  const [officerSearch, setOfficerSearch] = useState('');

  // Posters view filters
  const [posterClassFilter, setPosterClassFilter] = useState<'ALL' | ClassCode>(
    'ALL'
  );
  const [posterCategoryFilter, setPosterCategoryFilter] =
    useState<string>('ALL');
  const [inspectedPoster, setInspectedPoster] = useState<PosterRecord | null>(
    null
  );

  // Feed view filters
  const [feedClassFilter, setFeedClassFilter] = useState<'ALL' | ClassCode>(
    'ALL'
  );
  const [feedSearch, setFeedSearch] = useState('');
  const [likesMap, setLikesMap] = useState<Record<number, number>>({
    1: 24,
    2: 18,
    3: 31,
  });
  const [userLikedMap, setUserLikedMap] = useState<Record<number, boolean>>({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [newPostClass, setNewPostClass] = useState<ClassCode>('U1');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostCaption, setNewPostCaption] = useState('');
  const [newPostAuthor, setNewPostAuthor] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  // Weekly results filters
  const [resultClassFilter, setResultClassFilter] = useState<'ALL' | ClassCode>(
    'ALL'
  );
  const [resultCategoryFilter, setResultCategoryFilter] =
    useState<string>('ALL');

  // Digital Library filters
  const [libraryScopeFilter, setLibraryScopeFilter] = useState<
    'ALL' | 'COMMON' | ClassCode
  >('ALL');
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState<
    'ALL' | LibraryCategoryName
  >('ALL');
  const [librarySearch, setLibrarySearch] = useState('');
  const [previewResource, setPreviewResource] =
    useState<LibraryResourceRecord | null>(null);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactClass, setContactClass] = useState<string>('U1');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  // About ILM Junior Projects state
  const [selectedProject, setSelectedProject] = useState<IlmJuniorProject | null>(null);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
  const [projectStageFilter, setProjectStageFilter] = useState<
    'ALL' | 'FOUNDATION' | 'TECHNIQUE' | 'MASTERY'
  >('ALL');

  // Feed & Results interactive state
  const [selectedFullPost, setSelectedFullPost] = useState<FeedPostRecord | null>(null);
  const [copiedFeedId, setCopiedFeedId] = useState<number | null>(null);
  const [showCompactFeed, setShowCompactFeed] = useState(true);
  const [inspectedResult, setInspectedResult] = useState<WeeklyResultRecord | null>(null);

  const latestSpeaker = useMemo(
    () => data.weeklyResults.find((r) => r.resultCategory === 'Best Speaker'),
    [data.weeklyResults]
  );
  const latestNaat = useMemo(
    () => data.weeklyResults.find((r) => r.resultCategory === 'Best Naat'),
    [data.weeklyResults]
  );

  // Sequence of published posters for the Home Featured Poster showcase
  const featuredSequence = useMemo(() => {
    const published = data.posters.filter(
      (p) => p.publicationStatus === 'PUBLISHED' && p.participantCount > 0
    );
    return published.length > 0 ? published : data.posters;
  }, [data.posters]);

  const currentFeaturedPoster =
    featuredSequence.length > 0
      ? featuredSequence[featuredPosterIndex % featuredSequence.length]
      : null;

  const handleNextPoster = () => {
    if (featuredSequence.length === 0) return;
    setFeaturedPosterIndex((prev) => (prev + 1) % featuredSequence.length);
  };

  const handlePrevPoster = () => {
    if (featuredSequence.length === 0) return;
    setFeaturedPosterIndex(
      (prev) => (prev - 1 + featuredSequence.length) % featuredSequence.length
    );
  };

  const toggleLike = (postId: number) => {
    const isLiked = !!userLikedMap[postId];
    setUserLikedMap((prev) => ({ ...prev, [postId]: !isLiked }));
    setLikesMap((prev) => ({
      ...prev,
      [postId]: (prev[postId] || 0) + (isLiked ? -1 : 1),
    }));
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPost(true);
    try {
      const res = await fetch('/api/public/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classCode: newPostClass,
          title: newPostTitle,
          caption: newPostCaption,
          mediaUrl:
            '/assets/images/scholar_portrait_ahmed_1791787523001.jpg',
          mediaType: 'PHOTO',
          submittedByName: newPostAuthor || 'ILM Scholar',
          submittedByEmail: 'scholar@ilm.edu',
        }),
      });
      if (res.ok) {
        setPostSuccess(true);
        setTimeout(() => {
          setPostSuccess(false);
          setShowShareModal(false);
          setNewPostTitle('');
          setNewPostCaption('');
          setNewPostAuthor('');
          if (onRefreshData) onRefreshData();
        }, 1200);
      }
    } catch {
      // ignore
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSent(true);
    setTimeout(() => {
      setContactSent(false);
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    }, 3000);
  };

  // Filtered Scholars for Classes Tab
  const filteredScholars = useMemo(() => {
    return data.participants.filter((p) => {
      if (p.classCode !== selectedClass) return false;
      if (
        selectedCategoryFilter !== 'ALL' &&
        p.categoryName !== selectedCategoryFilter
      )
        return false;
      if (scholarSearch.trim()) {
        const q = scholarSearch.toLowerCase();
        return (
          p.fullName.toLowerCase().includes(q) ||
          (p.admissionNo && p.admissionNo.toLowerCase().includes(q)) ||
          (p.ownTopic && p.ownTopic.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [data.participants, selectedClass, selectedCategoryFilter, scholarSearch]);

  // Filtered Officers
  const filteredOfficers = useMemo(() => {
    return data.classOfficers.filter((o) => {
      if (officerClassFilter !== 'ALL' && o.classCode !== officerClassFilter)
        return false;
      if (officerSearch.trim()) {
        const q = officerSearch.toLowerCase();
        return (
          o.holderName.toLowerCase().includes(q) ||
          o.roleTitle.toLowerCase().includes(q) ||
          (o.admissionNo && o.admissionNo.toLowerCase().includes(q)) ||
          (o.responsibilities && o.responsibilities.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [data.classOfficers, officerClassFilter, officerSearch]);

  // Filtered Posters
  const filteredPosters = useMemo(() => {
    return data.posters.filter((p) => {
      if (posterClassFilter !== 'ALL' && p.classCode !== posterClassFilter)
        return false;
      if (
        posterCategoryFilter !== 'ALL' &&
        p.categoryName !== posterCategoryFilter
      )
        return false;
      return true;
    });
  }, [data.posters, posterClassFilter, posterCategoryFilter]);

  // Filtered Feed Posts
  const filteredFeedPosts = useMemo(() => {
    return data.feedPosts.filter((fp) => {
      if (feedClassFilter !== 'ALL' && fp.classCode !== feedClassFilter)
        return false;
      if (feedSearch.trim()) {
        const q = feedSearch.toLowerCase();
        return (
          fp.title.toLowerCase().includes(q) ||
          fp.caption.toLowerCase().includes(q) ||
          fp.classCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data.feedPosts, feedClassFilter, feedSearch]);

  // Filtered Weekly Results
  const filteredResults = useMemo(() => {
    return data.weeklyResults.filter((r) => {
      if (resultClassFilter !== 'ALL' && r.winnerClass !== resultClassFilter)
        return false;
      if (
        resultCategoryFilter !== 'ALL' &&
        r.resultCategory !== resultCategoryFilter
      )
        return false;
      return true;
    });
  }, [data.weeklyResults, resultClassFilter, resultCategoryFilter]);

  // Filtered Library Resources
  const filteredLibrary = useMemo(() => {
    return data.libraryResources.filter((item) => {
      if (
        libraryScopeFilter !== 'ALL' &&
        item.libraryScope !== libraryScopeFilter
      )
        return false;
      if (
        libraryCategoryFilter !== 'ALL' &&
        item.category !== libraryCategoryFilter
      )
        return false;
      if (librarySearch.trim()) {
        const q = librarySearch.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.author.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    data.libraryResources,
    libraryScopeFilter,
    libraryCategoryFilter,
    librarySearch,
  ]);

  const mainNavTabs: Array<{ id: PublicTab; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'classes', label: 'Classes' },
    { id: 'posters', label: 'Posters' },
    { id: 'feed', label: 'Feed' },
    { id: 'results', label: 'Weekly Results' },
    { id: 'library', label: 'Library' },
  ];

  const allMobileNavItems: Array<{ id: PublicTab; label: string; icon: any }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'classes', label: 'Classes', icon: GraduationCap },
    { id: 'posters', label: 'Posters', icon: ImageIcon },
    { id: 'feed', label: 'Feed', icon: Sparkles },
    { id: 'results', label: 'Weekly Results', icon: Trophy },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'officers', label: 'Officers', icon: Users },
    { id: 'about', label: 'About ILM', icon: BookOpen },
    { id: 'contact', label: 'Contact', icon: Mail },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#07080C] text-neutral-100 pb-20 md:pb-0">
      {/* HEADER */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5 bg-[#07080C]/95 backdrop-blur-md border-b border-neutral-800/90">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-lg bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="inline-flex items-center whitespace-nowrap shrink-0 cursor-pointer"
          >
            <IlmLogo size="sm" showSubtitle />
          </button>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-neutral-300">
          {mainNavTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeTab === item.id
                  ? 'text-[#F3D068] border-[#D4AF37]'
                  : 'text-neutral-300 border-transparent hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right CTA */}
        <div className="flex items-center gap-2.5 shrink-0">
          {currentAdmin ? (
            <button
              type="button"
              onClick={onSwitchToDashboard}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-neutral-950 bg-gradient-to-r from-[#C89D2E] via-[#E8C55B] to-[#C89D2E] rounded-lg hover:brightness-110 transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-md"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Dashboard</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#F3D068] bg-[#141722] border border-[#D4AF37]/45 rounded-lg hover:bg-[#1B2030] transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Admin Login</span>
            </button>
          )}
        </div>
      </header>

      {/* Sub-Header Bar (matching ilm-niics.lovable.app) */}
      <div className="bg-[#0B0D14] border-b border-neutral-900 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-neutral-400">
            <span className="text-[#D4AF37] font-semibold">
              {data.settings?.motto || 'Learn · Compete · Grow'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Classes U1 – U6 Official Academic Portal</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {[
              { id: 'feed', label: 'Public Feed' },
              { id: 'officers', label: 'Class Teachers & Officers' },
              { id: 'about', label: 'About ILM (10 Projects)' },
              { id: 'contact', label: 'Contact' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as PublicTab)}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === item.id
                    ? 'text-[#F3D068] font-semibold underline underline-offset-4'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[61px] z-30 bg-[#0B0D14] border-b border-neutral-800 p-4 space-y-1.5 shadow-2xl">
          {allMobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#D4AF37]/20 text-[#F3D068] border border-[#D4AF37]/40'
                    : 'text-neutral-300 hover:bg-neutral-900'
                }`}
              >
                <Icon className="w-4 h-4 text-[#D4AF37]" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="pt-2 border-t border-neutral-800">
            {currentAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSwitchToDashboard();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-[#D4AF37] text-neutral-950 cursor-pointer"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAdminLogin();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-[#141722] text-[#F3D068] border border-[#D4AF37]/50 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-[#D4AF37]" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Horizontal Nav Bar for Tablet & Small Desktop */}
      <div className="hidden md:flex lg:hidden overflow-x-auto bg-[#0A0C13] border-b border-neutral-800/80 px-4 py-2 gap-2">
        {mainNavTabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === item.id
                ? 'bg-[#D4AF37] text-neutral-950'
                : 'bg-neutral-900 text-neutral-300 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* ==================================================================== */}
        {/* 1. HOME TAB */}
        {/* ==================================================================== */}
        {activeTab === 'home' && (
          <div className="space-y-12 sm:space-y-14">
            {/* 1. HERO BANNER */}
            <section className="ilm-hero relative overflow-hidden rounded-3xl border border-[#D4AF37]/30 shadow-2xl">
              <img
                src={heroImage}
                alt="ILM Hero"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#07080C] via-[#07080C]/85 to-transparent" />
              <div className="relative px-6 py-14 sm:px-12 sm:py-20 max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F5D77F]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F5D77F] animate-pulse" />
                  {data.settings?.motto || 'Learn · Compete · Grow'}
                </span>
                <h1 className="mt-5 font-display text-4xl sm:text-6xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-[#F5D77F] via-[#D4AF37] to-[#A37B1E] bg-clip-text text-transparent">
                    Integrated Learning Master
                  </span>
                </h1>
                <p className="mt-4 text-base sm:text-lg text-neutral-300 leading-relaxed">
                  Where young orators shine — Naat, Speech, Qirat and more across classes U1 to U6.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('posters')}
                    className="rounded-xl bg-gradient-to-r from-[#C89D2E] via-[#F5D77F] to-[#C89D2E] px-6 py-3 text-sm font-bold text-neutral-950 shadow-[0_10px_40px_-10px_rgba(212,175,55,0.7)] hover:brightness-110 transition-all cursor-pointer"
                  >
                    View Class Posters
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('classes')}
                    className="rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all cursor-pointer"
                  >
                    Explore Classes
                  </button>
                </div>
                <div className="mt-10 grid grid-cols-3 gap-2 sm:gap-4 max-w-md">
                  {[
                    [data.classes.length, 'Classes'],
                    [data.students.length, 'Scholars'],
                    [data.participants.length, 'Participants'],
                  ].map(([count, label]) => (
                    <div
                      key={String(label)}
                      className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur"
                    >
                      <div className="font-display text-2xl font-bold text-[#F5D77F]">
                        {count}
                      </div>
                      <div className="text-[10px] sm:text-[11px] uppercase sm:tracking-widest text-neutral-400">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 2. LIVE CLASS & COMMUNITY FEED & SHARED POSTERS */}
            <section
              aria-label="Class & Community Feed"
              className="p-5 sm:p-7 rounded-2xl bg-gradient-to-b from-[#0E1118] via-[#0B0E15] to-[#090B10] border-2 border-[#D4AF37]/45 shadow-2xl space-y-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[11px] font-bold uppercase tracking-widest text-[#F3D068] mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Live Class & Community Feed</span>
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                    ILM Public Feed & Shared Class Posters
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                    Preview shared posters, photographs, and announcements from Classes U1–U6. Click{' '}
                    <strong className="text-[#F3D068]">View Full Post</strong> on any card to open the complete poster & details.
                  </p>
                </div>
              </div>

              {/* Filter bar by class + search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['ALL', ...VALID_CLASSES] as const).map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setFeedClassFilter(cls)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        feedClassFilter === cls
                          ? 'bg-[#D4AF37] text-neutral-950 shadow'
                          : 'bg-[#121622] text-neutral-300 border border-neutral-800 hover:text-white'
                      }`}
                    >
                      {cls === 'ALL' ? 'All Classes' : `Class ${cls}`}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={feedSearch}
                    onChange={(e) => setFeedSearch(e.target.value)}
                    placeholder="Search feed posts..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#121622] border border-neutral-800 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              {/* Posts Grid */}
              {filteredFeedPosts.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {(showCompactFeed ? filteredFeedPosts.slice(0, 6) : filteredFeedPosts).map((post) => (
                      <div
                        key={post.id}
                        className="group rounded-xl bg-[#111520] border border-neutral-800 hover:border-[#D4AF37]/60 overflow-hidden flex flex-col justify-between transition-all shadow-lg"
                      >
                        <div>
                          <div
                            onClick={() => setSelectedFullPost(post)}
                            className="relative h-44 bg-[#0B0D14] overflow-hidden cursor-pointer border-b border-neutral-800/80"
                          >
                            <img
                              src={post.mediaUrl}
                              alt={post.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent flex items-end justify-between p-3">
                              <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37] text-neutral-950 font-bold text-[10px] uppercase tracking-wider">
                                Class {post.classCode} · {post.mediaType}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/75 border border-[#D4AF37]/60 text-[#F3D068] text-[11px] font-semibold">
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Full</span>
                              </span>
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-display font-bold text-white text-sm line-clamp-1">
                              {post.title}
                            </h3>
                            <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                              {post.caption}
                            </p>
                          </div>
                        </div>

                        <div className="px-4 pb-3.5 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setSelectedFullPost(post)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:brightness-110 text-neutral-950 font-bold text-xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Full Post</span>
                          </button>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(post.mediaUrl);
                                setCopiedFeedId(post.id);
                                setTimeout(() => setCopiedFeedId(null), 2000);
                              }}
                              className="p-1.5 rounded-lg bg-[#161B28] hover:bg-[#1E2536] text-emerald-300 border border-emerald-600/40 cursor-pointer"
                              title="Copy Media Link"
                            >
                              {copiedFeedId === post.id ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = post.mediaUrl;
                                a.download = `${post.title.replace(/\s+/g, '_')}.png`;
                                a.click();
                              }}
                              className="p-1.5 rounded-lg bg-[#161B28] hover:bg-[#1E2536] text-neutral-200 border border-neutral-700 cursor-pointer"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {filteredFeedPosts.length > 6 && (
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCompactFeed((prev) => !prev)}
                        className="px-5 py-2 rounded-xl bg-[#141824] hover:bg-[#1B2130] text-[#F3D068] border border-[#D4AF37]/45 text-xs font-semibold cursor-pointer"
                      >
                        {showCompactFeed ? `Show All ${filteredFeedPosts.length} Feed Posts` : 'Show Compact Feed Preview'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 rounded-xl bg-[#111520] border border-neutral-800 text-center text-sm text-neutral-400">
                  No feed posts match your filter yet.
                </div>
              )}
            </section>

            {/* 3. FEATURED COMPETITION POSTER */}
            <section aria-label="Featured Competition Poster">
              {currentFeaturedPoster ? (
                <PosterStageCard
                  poster={currentFeaturedPoster}
                  liveParticipants={data.participants}
                  isHero
                  canManage={false}
                  onChangePoster={handleNextPoster}
                  onPrevPoster={handlePrevPoster}
                  totalPostersCount={featuredSequence.length}
                  currentPosterIndex={
                    featuredPosterIndex % Math.max(1, featuredSequence.length)
                  }
                  onInspectPoster={(p) => setInspectedPoster(p)}
                  onOpenStudio={(p) => setStudioPoster(p)}
                  onPosterUpdated={onRefreshData}
                />
              ) : (
                <div className="p-12 rounded-2xl bg-[#0E1118] border border-[#D4AF37]/40 text-center">
                  <IlmLogo size="lg" showSubtitle />
                  <h1 className="font-display text-3xl font-bold text-white mt-6">
                    Talent Today · Leaders Tomorrow
                  </h1>
                  <p className="text-sm text-neutral-400 mt-2">
                    Add participants in any class (U1–U6) to automatically generate the featured competition poster.
                  </p>
                </div>
              )}
            </section>

            {/* 4. CLASSES (U1 - U6) GRID */}
            <section>
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                    Classes (U1 – U6)
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                    Explore participant rosters, competition capacities, posters, and class libraries across all six cohorts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('classes')}
                  className="text-xs font-semibold text-[#F3D068] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  View All Classes →
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {VALID_CLASSES.map((clsCode) => {
                  const pCount = data.participants.filter((p) => p.classCode === clsCode).length;
                  const posterCount = data.posters.filter((p) => p.classCode === clsCode).length;
                  return (
                    <button
                      key={clsCode}
                      type="button"
                      onClick={() => {
                        setSelectedClass(clsCode);
                        setActiveTab('classes');
                      }}
                      className="group p-5 rounded-xl bg-[#0E1118] hover:bg-[#141824] border border-neutral-800 hover:border-[#D4AF37]/60 text-center transition-all flex flex-col items-center cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-lg bg-[#161A26] border border-[#D4AF37]/35 flex items-center justify-center mb-3 group-hover:border-[#F3D068]">
                        <GraduationCap className="w-5 h-5 text-[#F3D068]" />
                      </div>
                      <span className="font-display text-xl font-bold text-white">
                        {clsCode}
                      </span>
                      <span className="text-xs text-neutral-400 mt-0.5">
                        Class Cohort
                      </span>
                      <div className="mt-3 pt-2.5 border-t border-neutral-800/80 w-full text-[11px] text-neutral-400 font-mono">
                        <span>{pCount} / 24 Scholars</span>
                        <span className="mx-1" aria-hidden="true">·</span>
                        <span>{posterCount} Poster</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 5. OFFICIAL WEEKLY RESULTS */}
            <section>
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                    Official Weekly Results
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                    Honoring the latest Best Speaker and Best Naat laureates across ILM cohorts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('results')}
                  className="text-xs font-semibold text-[#F3D068] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  View Permanent Archive →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { category: 'Best Speaker', record: latestSpeaker },
                  { category: 'Best Naat', record: latestNaat },
                ].map(({ category, record }) => (
                  <div
                    key={category}
                    onClick={() => record && setInspectedResult(record)}
                    className="p-6 rounded-xl bg-[#0E1118] border border-[#D4AF37]/40 hover:border-[#F3D068] transition-all flex items-center gap-5 cursor-pointer shadow-md"
                  >
                    {record ? (
                      <>
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-[#D4AF37] shrink-0 bg-[#161922] shadow">
                          <img
                            src={record.winnerPhotoUrl}
                            alt={record.winnerName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-[#F3D068] uppercase tracking-wider">
                            {record.resultCategory}
                          </div>
                          <h3 className="font-display text-xl sm:text-2xl font-bold text-white mt-1 truncate">
                            {record.winnerName}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-300 mt-1.5">
                            <span className="font-semibold text-white">
                              Class {record.winnerClass}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{record.weekLabel}</span>
                          </div>
                          {record.remarks && (
                            <p className="text-xs text-neutral-400 mt-2 line-clamp-2">
                              {record.remarks}
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="py-4 text-sm text-neutral-400">
                        No {category} result published yet.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 6. DIGITAL LIBRARY HIGHLIGHTS */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                    Digital Library Highlights
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                    Explore books, research papers, notes, and multimedia learning resources across ILM cohorts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('library')}
                  className="text-xs font-semibold text-[#F3D068] hover:underline cursor-pointer"
                >
                  Open Library →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.libraryResources.slice(0, 4).map((res) => (
                  <div
                    key={res.id}
                    className="p-4 rounded-xl bg-[#0E1118] border border-neutral-800 hover:border-[#D4AF37]/45 transition-colors flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-[#D4AF37]">
                        <span>{res.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{res.libraryScope === 'COMMON' ? 'Common Library' : `Class ${res.libraryScope}`}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-neutral-400">{res.fileType}</span>
                      </div>
                      <h3 className="font-semibold text-sm text-white mt-1 truncate">
                        {res.title}
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                        {res.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewResource(res)}
                        className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 cursor-pointer"
                        title="Preview resource"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = res.fileUrl;
                          a.download = res.title;
                          a.click();
                        }}
                        className="p-2 rounded-lg bg-[#161A26] hover:bg-[#1E2334] text-[#F3D068] border border-[#D4AF37]/40 cursor-pointer"
                        title="Download resource"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 2. CLASSES TAB */}
        {/* ==================================================================== */}
        {activeTab === 'classes' && (
          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
              <div>
                <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2.5">
                  <span>Class {selectedClass} Scholars & Roster</span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#181D2C] border border-[#D4AF37]/40 text-[#F3D068] font-mono">
                    {filteredScholars.length} / 24 Scholars
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Active scholars registered for Qirat, Naat, Speech, Table Topics, and stage evaluation.
                </p>
              </div>

              {/* Class Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0E1118] border border-neutral-800 overflow-x-auto">
                {VALID_CLASSES.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedClass(cls)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                      selectedClass === cls
                        ? 'bg-[#D4AF37] text-neutral-950 font-bold'
                        : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={scholarSearch}
                  onChange={(e) => setScholarSearch(e.target.value)}
                  placeholder="Search scholars by name, topic, or admission no..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0E1118] border border-neutral-800 focus:border-[#D4AF37] text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                    selectedCategoryFilter === 'ALL'
                      ? 'bg-[#D4AF37] text-neutral-950 font-bold'
                      : 'bg-[#12151F] text-neutral-400 hover:text-white'
                  }`}
                >
                  All Categories
                </button>
                {COMPETITION_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                      selectedCategoryFilter === cat
                        ? 'bg-[#D4AF37] text-neutral-950 font-bold'
                        : 'bg-[#12151F] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Scholar Grid */}
            {filteredScholars.length === 0 ? (
              <div className="py-16 text-center rounded-2xl bg-[#0E1118] border border-neutral-800 p-8 space-y-3">
                <Users className="w-10 h-10 text-neutral-500 mx-auto" />
                <h3 className="text-base font-bold text-white">No Scholars Found</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  No scholars match the selected filter or search query. Try switching the category or resetting your search.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredScholars.map((scholar) => {
                  const officerMatch = data.classOfficers.find(
                    (o) =>
                      o.classCode === scholar.classCode &&
                      o.holderName.toLowerCase() ===
                        scholar.fullName.toLowerCase()
                  );

                  return (
                    <div
                      key={scholar.id}
                      className="p-3.5 rounded-xl bg-[#0E1118] border border-neutral-800 hover:border-[#D4AF37]/50 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="aspect-square rounded-lg overflow-hidden bg-[#151822] mb-3 border border-neutral-800 relative">
                          <img
                            src={scholar.photoUrl}
                            alt={scholar.fullName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover object-top"
                          />
                          {officerMatch && (
                            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-[#C89D2E] text-neutral-950 font-bold text-[9px] shadow-sm">
                              {officerMatch.roleTitle.split(' ')[0]}
                            </span>
                          )}
                        </div>

                        <div className="font-display font-bold text-sm text-white truncate">
                          {scholar.fullName}
                        </div>
                        <div className="text-[11px] font-semibold text-[#F3D068] truncate mt-0.5">
                          {scholar.categoryName}
                        </div>
                        {scholar.admissionNo && (
                          <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                            {scholar.admissionNo}
                          </div>
                        )}
                        {scholar.ownTopic && (
                          <p className="text-[11px] text-neutral-300 mt-2 line-clamp-2 italic">
                            "{scholar.ownTopic}"
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-semibold">
                          CONFIRMED
                        </span>
                        <span>Class {scholar.classCode}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* 3. OFFICERS TAB */}
        {/* ==================================================================== */}
        {activeTab === 'officers' && (
          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
              <div>
                <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2.5">
                  <Crown className="w-6 h-6 text-[#F3D068]" />
                  <span>Class Officers & Faculty Directory</span>
                </h1>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Executive leadership across all 6 cohorts: Class Teachers, Presidents, VPs, Secretaries, and Treasurers.
                </p>
              </div>

              {/* Class Filter */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0E1118] border border-neutral-800 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setOfficerClassFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    officerClassFilter === 'ALL'
                      ? 'bg-[#D4AF37] text-neutral-950 font-bold'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  All Classes
                </button>
                {VALID_CLASSES.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setOfficerClassFilter(cls)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      officerClassFilter === cls
                        ? 'bg-[#D4AF37] text-neutral-950 font-bold'
                        : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Officer Search */}
            <div className="max-w-md relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={officerSearch}
                onChange={(e) => setOfficerSearch(e.target.value)}
                placeholder="Search officers by name or role title..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0E1118] border border-neutral-800 focus:border-[#D4AF37] text-xs text-white focus:outline-none"
              />
            </div>

            {/* Officers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredOfficers.map((officer) => (
                <div
                  key={officer.id}
                  className="p-5 rounded-2xl bg-[#0E1118] border border-neutral-800 hover:border-[#D4AF37]/50 transition-all flex gap-4 items-start"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#151822] shrink-0 border border-[#D4AF37]/30">
                    <img
                      src={officer.photoUrl}
                      alt={officer.holderName}
                      className="w-full h-full object-cover object-top"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1A1F2E] text-[#F3D068] border border-[#D4AF37]/40">
                        Class {officer.classCode}
                      </span>
                      {officer.admissionNo && (
                        <span className="text-[10px] font-mono text-neutral-400">
                          {officer.admissionNo}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-base text-white truncate mt-1.5">
                      {officer.holderName}
                    </h3>
                    <div className="text-xs font-semibold text-emerald-400 mt-0.5">
                      {officer.roleTitle}
                    </div>
                    {officer.responsibilities && (
                      <p className="text-xs text-neutral-400 mt-2 line-clamp-2 leading-relaxed">
                        {officer.responsibilities}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 4. POSTERS TAB */}
        {/* ==================================================================== */}
        {activeTab === 'posters' && (
          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
              <div>
                <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2.5">
                  <ImageIcon className="w-6 h-6 text-[#F3D068]" />
                  <span>Class Competition Posters</span>
                </h1>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  High-definition official tournament posters rendered with active scholar snapshots.
                </p>
              </div>

              {/* Class Filter */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0E1118] border border-neutral-800 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setPosterClassFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    posterClassFilter === 'ALL'
                      ? 'bg-[#D4AF37] text-neutral-950 font-bold'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  All Posters
                </button>
                {VALID_CLASSES.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setPosterClassFilter(cls)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      posterClassFilter === cls
                        ? 'bg-[#D4AF37] text-neutral-950 font-bold'
                        : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filteredPosters.map((poster) => (
                <PosterStageCard
                  key={poster.id}
                  poster={poster}
                  liveParticipants={data.participants}
                  canManage={false}
                  onInspectPoster={(p) => setInspectedPoster(p)}
                  onOpenStudio={(p) => setStudioPoster(p)}
                  onPosterUpdated={onRefreshData}
                />
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 5. FEED TAB */}
        {/* ==================================================================== */}
        {activeTab === 'feed' && (
          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
              <div>
                <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2.5">
                  <Sparkles className="w-6 h-6 text-[#F3D068]" />
                  <span>Public Feed & Stage Moments</span>
                </h1>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Community highlights, live speeches, and photographic memories from ILM sessions.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="px-4 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#e3be42] text-neutral-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Share Moment</span>
                </button>
              </div>
            </div>

            {/* Feed Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={feedSearch}
                  onChange={(e) => setFeedSearch(e.target.value)}
                  placeholder="Search feed moments..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0E1118] border border-neutral-800 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFeedClassFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    feedClassFilter === 'ALL'
                      ? 'bg-[#D4AF37] text-neutral-950 font-bold'
                      : 'bg-[#0E1118] text-neutral-300 hover:text-white'
                  }`}
                >
                  All Cohorts
                </button>
                {VALID_CLASSES.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setFeedClassFilter(cls)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      feedClassFilter === cls
                        ? 'bg-[#D4AF37] text-neutral-950 font-bold'
                        : 'bg-[#0E1118] text-neutral-300 hover:text-white'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Feed Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFeedPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-2xl bg-[#0E1118] border border-neutral-800 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[16/10] bg-[#141722] relative overflow-hidden">
                      <img
                        src={post.mediaUrl}
                        alt={post.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-bold text-[#F3D068] border border-[#D4AF37]/40">
                          Class {post.classCode}
                        </span>
                        <span className="px-2 py-1 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono text-neutral-300">
                          {post.mediaType}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="font-display font-bold text-lg text-white">
                        {post.title}
                      </h3>
                      <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
                        {post.caption}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 border-t border-neutral-800/80 mt-4 flex items-center justify-between text-xs text-neutral-400">
                    <span className="truncate">By {post.submittedByName}</span>
                    <button
                      type="button"
                      onClick={() => toggleLike(post.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        userLikedMap[post.id]
                          ? 'bg-red-950/40 border-red-700/60 text-red-400'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          userLikedMap[post.id] ? 'fill-red-500' : ''
                        }`}
                      />
                      <span className="font-mono">{likesMap[post.id] || 15}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 6. WEEKLY RESULTS TAB */}
        {/* ==================================================================== */}
        {activeTab === 'results' && (
          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
              <div>
                <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2.5">
                  <Trophy className="w-6 h-6 text-[#F3D068]" />
                  <span>Weekly Competition Results & Champions</span>
                </h1>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  Official evaluation standings for Best Speaker and Best Naat laureates.
                </p>
              </div>

              {/* Class Filter */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0E1118] border border-neutral-800 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setResultClassFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    resultClassFilter === 'ALL'
                      ? 'bg-[#D4AF37] text-neutral-950 font-bold'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  All Classes
                </button>
                {VALID_CLASSES.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setResultClassFilter(cls)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      resultClassFilter === cls
                        ? 'bg-[#D4AF37] text-neutral-950 font-bold'
                        : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredResults.map((r) => (
                <div
                  key={r.id}
                  className="p-6 rounded-2xl bg-[#0E1118] border border-neutral-800 hover:border-[#D4AF37]/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#151822] shrink-0 border border-[#D4AF37]/40">
                          <img
                            src={r.winnerPhotoUrl}
                            alt={r.winnerName}
                            className="w-full h-full object-cover object-top"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1C1F2E] text-[#F3D068] border border-[#D4AF37]/40">
                              {r.resultCategory}
                            </span>
                            <span className="text-xs font-mono text-neutral-400">
                              Class {r.winnerClass}
                            </span>
                          </div>
                          <h3 className="font-display font-bold text-xl text-white mt-1">
                            {r.winnerName}
                          </h3>
                        </div>
                      </div>

                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8C55B] to-[#C89D2E] text-neutral-950 flex items-center justify-center shrink-0 shadow-lg">
                        <Trophy className="w-5 h-5" />
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-neutral-300 mt-4 leading-relaxed bg-[#12151F] p-3.5 rounded-xl border border-neutral-800">
                      {r.remarks}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-semibold text-[#F3D068]">
                      {r.weekLabel}
                    </span>
                    <span>{r.resultDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 7. DIGITAL LIBRARY TAB */}
        {/* ==================================================================== */}
        {activeTab === 'library' && (
          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
              <div>
                <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2.5">
                  <Library className="w-6 h-6 text-[#F3D068]" />
                  <span>Digital Library & Academic Archives</span>
                </h1>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  12 categorized repositories: textbooks, speech guidelines, Tajweed charts, and evaluation manuals.
                </p>
              </div>

              {/* Scope filter */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0E1118] border border-neutral-800 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setLibraryScopeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    libraryScopeFilter === 'ALL'
                      ? 'bg-[#D4AF37] text-neutral-950 font-bold'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  All Scopes
                </button>
                <button
                  type="button"
                  onClick={() => setLibraryScopeFilter('COMMON')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    libraryScopeFilter === 'COMMON'
                      ? 'bg-[#D4AF37] text-neutral-950 font-bold'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  Common
                </button>
                {VALID_CLASSES.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setLibraryScopeFilter(cls)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      libraryScopeFilter === cls
                        ? 'bg-[#D4AF37] text-neutral-950 font-bold'
                        : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Search & Category Filter */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Search books, articles, notes, authors..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0E1118] border border-neutral-800 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <button
                  type="button"
                  onClick={() => setLibraryCategoryFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                    libraryCategoryFilter === 'ALL'
                      ? 'bg-[#D4AF37] text-neutral-950 font-bold'
                      : 'bg-[#12151F] text-neutral-400 hover:text-white'
                  }`}
                >
                  All Types
                </button>
                {LIBRARY_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLibraryCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                      libraryCategoryFilter === cat
                        ? 'bg-[#D4AF37] text-neutral-950 font-bold'
                        : 'bg-[#12151F] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Library Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLibrary.map((res) => (
                <div
                  key={res.id}
                  className="p-5 rounded-2xl bg-[#0E1118] border border-neutral-800 hover:border-[#D4AF37]/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#D4AF37] font-semibold px-2 py-0.5 rounded bg-[#181D2C] border border-[#D4AF37]/30">
                        {res.category}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400 px-2 py-0.5 rounded bg-neutral-900">
                        {res.libraryScope}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-base text-white mt-3">
                      {res.title}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-2 line-clamp-3 leading-relaxed">
                      {res.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-neutral-800/80 flex items-center justify-between">
                    <div className="text-[11px] text-neutral-400">
                      <div>By {res.author}</div>
                      <div className="font-mono text-[10px] text-neutral-500 mt-0.5">
                        {res.fileType} • {res.fileSize}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewResource(res)}
                      className="px-3 py-1.5 rounded-lg bg-[#181D2C] hover:bg-[#20273B] text-xs font-semibold text-[#F3D068] border border-[#D4AF37]/40 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Read / Preview</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 8. ABOUT TAB (ILM Junior Projects' Explanation) */}
        {/* ==================================================================== */}
        {activeTab === 'about' && (
          <div className="space-y-8 sm:space-y-10">
            {/* Header Banner */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#121624] via-[#0E111A] to-[#0A0D14] border border-[#D4AF37]/40 shadow-2xl relative overflow-hidden">
              <div className="relative z-10 space-y-4 max-w-4xl">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/50 text-xs font-bold text-[#F3D068] uppercase tracking-wider">
                    <BookOpen className="w-3.5 h-3.5" />
                    Official Academic Curriculum
                  </span>
                  <span className="text-xs text-neutral-400">
                    Darul Huda Islamic University (جامعة دار الهدى الإسلامية)
                  </span>
                </div>

                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                  <span className="bg-gradient-to-r from-[#F5D77F] via-[#D4AF37] to-[#A37B1E] bg-clip-text text-transparent">
                    ILM Junior Projects’ Explanation
                  </span>
                </h1>

                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-3xl">
                  The foundational 10-project communication and speech mastery syllabus designed to empower scholars across Classes U1 to U6. From introductory icebreakers to mastery-level persuasive and inspirational oratory, each project builds confidence, vocal dynamics, body language, and credible research skills.
                </p>

                {/* PDF Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a
                    href="/assets/aistudio/Junior_Projects_Explanation_fa534621.pdf"
                    download="ILM_Junior_Projects_Explanation.pdf"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C89D2E] via-[#F5D77F] to-[#C89D2E] text-neutral-950 font-bold text-xs hover:brightness-110 shadow-lg transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Official PDF (31 Pages)</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setShowPdfModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#181D2C] hover:bg-[#202638] border border-[#D4AF37]/50 text-[#F3D068] font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Preview Interactive PDF Reader</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Stage Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#0E1118] border border-neutral-800">
                {[
                  { id: 'ALL', label: 'All 10 Projects' },
                  { id: 'FOUNDATION', label: 'Stage 1: Foundation (P1–P3)' },
                  { id: 'TECHNIQUE', label: 'Stage 2: Technique (P4–P6)' },
                  { id: 'MASTERY', label: 'Stage 3: Mastery (P7–P10)' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setProjectStageFilter(st.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      projectStageFilter === st.id
                        ? 'bg-[#D4AF37] text-neutral-950 shadow font-bold'
                        : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div className="text-xs text-neutral-400">
                Click any project card to view complete guidelines, outlines, and evaluation rubrics.
              </div>
            </div>

            {/* 10 Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ILM_JUNIOR_PROJECTS.filter((proj) => {
                if (projectStageFilter === 'FOUNDATION') return proj.number <= 3;
                if (projectStageFilter === 'TECHNIQUE') return proj.number >= 4 && proj.number <= 6;
                if (projectStageFilter === 'MASTERY') return proj.number >= 7;
                return true;
              }).map((proj) => (
                <div
                  key={proj.number}
                  onClick={() => setSelectedProject(proj)}
                  className="group p-6 rounded-2xl bg-[#0E1118] border border-neutral-800 hover:border-[#D4AF37]/70 transition-all flex flex-col justify-between cursor-pointer shadow-lg hover:shadow-[#D4AF37]/5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#F3D068] px-3 py-1 rounded-full bg-[#181D2C] border border-[#D4AF37]/40">
                        Project {proj.number}
                      </span>
                      <span className="text-xs font-mono text-neutral-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800">
                        <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>{proj.timeGuideline}</span>
                      </span>
                    </div>

                    <h2 className="font-display text-xl font-bold text-white group-hover:text-[#F5D77F] transition-colors">
                      {proj.title}
                    </h2>

                    <p className="text-xs text-neutral-300 line-clamp-3 leading-relaxed">
                      {proj.guidelinesIntro || proj.purpose}
                    </p>

                    <div className="pt-3 border-t border-neutral-800/80 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#F3D068]">
                        Key Objectives:
                      </div>
                      <ul className="space-y-1">
                        {proj.objectives.slice(0, 2).map((obj, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-neutral-400 flex items-start gap-1.5"
                          >
                            <span className="text-[#D4AF37]">•</span>
                            <span className="line-clamp-1">{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                    <span className="text-[11px] text-neutral-500 italic">
                      Darul Huda Islamic University
                    </span>
                    <span className="text-xs font-bold text-[#F3D068] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      <span>View Full Breakdown</span>
                      <span>→</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 9. CONTACT TAB */}
        {/* ==================================================================== */}
        {activeTab === 'contact' && (
          <div className="space-y-8 sm:space-y-10 max-w-4xl mx-auto">
            <div className="text-center space-y-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
                Contact ILM Administration
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto">
                Have questions about student registration, speech evaluation schedules, or class isolation rules? Reach out to our team.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-5 rounded-2xl bg-[#0E1118] border border-neutral-800 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#181D2C] border border-[#D4AF37]/40 flex items-center justify-center mx-auto text-[#F3D068]">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-sm">Official Email</h3>
                <p className="text-xs text-neutral-400">admin@ilm.edu.pk</p>
                <p className="text-[11px] text-neutral-500">24/7 Academic Support</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0E1118] border border-neutral-800 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#181D2C] border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                  <Phone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-sm">WhatsApp / Helpline</h3>
                <p className="text-xs text-neutral-400">+92 300 1234567</p>
                <p className="text-[11px] text-neutral-500">Mon - Sat, 9am - 6pm</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0E1118] border border-neutral-800 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#181D2C] border border-sky-500/40 flex items-center justify-center mx-auto text-sky-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-sm">Headquarters</h3>
                <p className="text-xs text-neutral-400">ILM Central Auditorium</p>
                <p className="text-[11px] text-neutral-500">Oratory Campus, Wing A</p>
              </div>
            </div>

            {/* Submission Form */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#0E1118] border border-neutral-800">
              <h2 className="font-display text-xl font-bold text-white mb-4">
                Send an Inquiry or Feedback
              </h2>

              {contactSent ? (
                <div className="p-6 rounded-xl bg-emerald-950/50 border border-emerald-700/60 text-center space-y-2">
                  <Check className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h3 className="font-bold text-emerald-200 text-base">
                    Message Dispatched Successfully!
                  </h3>
                  <p className="text-xs text-emerald-300/80">
                    Thank you for reaching out. The Class Teacher and Administrative Council will respond promptly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Your Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. Tariq Mehmood"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#12151F] border border-neutral-700 focus:border-[#D4AF37] focus:outline-none text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="e.g. tariq@gmail.com"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-[#12151F] border border-neutral-700 focus:border-[#D4AF37] focus:outline-none text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Relevant Class Cohort
                    </label>
                    <select
                      value={contactClass}
                      onChange={(e) => setContactClass(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#12151F] border border-neutral-700 focus:border-[#D4AF37] focus:outline-none text-xs text-white"
                    >
                      <option value="GENERAL">General Inquiries / All Classes</option>
                      {VALID_CLASSES.map((cls) => (
                        <option key={cls} value={cls}>
                          Class {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Your Message or Inquiry
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Write your question, suggestion, or feedback..."
                      className="w-full px-3.5 py-2.5 rounded-lg bg-[#12151F] border border-neutral-700 focus:border-[#D4AF37] focus:outline-none text-xs text-white resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#e3be42] text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Send className="w-4 h-4" />
                    <span>Dispatch Message</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Resource Preview Lightbox */}
      {previewResource && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewResource(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-[#0E1118] border border-[#D4AF37]/50 p-6 sm:p-8 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-[#F3D068] px-2 py-0.5 rounded bg-[#181D2C] border border-[#D4AF37]/40">
                  {previewResource.category} • Scope {previewResource.libraryScope}
                </span>
                <h2 className="font-display text-xl font-bold text-white mt-2">
                  {previewResource.title}
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Authored by {previewResource.author} • {previewResource.fileType}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewResource(null)}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#12151F] border border-neutral-800 max-h-64 overflow-y-auto text-xs text-neutral-300 leading-relaxed font-mono whitespace-pre-wrap">
              {previewResource.contentPreview || previewResource.description}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPreviewResource(null)}
                className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 border border-neutral-700 cursor-pointer"
              >
                Close Preview
              </button>
              <a
                href={previewResource.fileUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#e3be42] text-xs font-bold text-neutral-950 flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Resource</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Share Moment Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#0E1118] border border-[#D4AF37]/50 p-6 sm:p-8 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#F3D068]" />
                <span>Share a Public Moment</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {postSuccess ? (
              <div className="p-6 rounded-xl bg-emerald-950/60 border border-emerald-700 text-center space-y-2">
                <Check className="w-8 h-8 text-emerald-400 mx-auto" />
                <h3 className="font-bold text-white text-sm">Moment Shared!</h3>
                <p className="text-xs text-emerald-300">
                  Your post has been published to the community feed.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreatePost} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Class Cohort
                    </label>
                    <select
                      value={newPostClass}
                      onChange={(e) =>
                        setNewPostClass(e.target.value as ClassCode)
                      }
                      className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white focus:outline-none"
                    >
                      {VALID_CLASSES.map((cls) => (
                        <option key={cls} value={cls}>
                          Class {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Your Name / Role
                    </label>
                    <input
                      type="text"
                      required
                      value={newPostAuthor}
                      onChange={(e) => setNewPostAuthor(e.target.value)}
                      placeholder="e.g. Ahmed Khan"
                      className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Post Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    placeholder="e.g. Class U1 Spectacular Naat & Speech Assembly"
                    className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Caption / Description
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newPostCaption}
                    onChange={(e) => setNewPostCaption(e.target.value)}
                    placeholder="Describe the moment or achievement..."
                    className="w-full px-3 py-2 rounded-lg bg-[#12151F] border border-neutral-700 text-xs text-white focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 border border-neutral-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPost}
                    className="px-5 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#e3be42] text-xs font-bold text-neutral-950 flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingPost ? 'Publishing...' : 'Publish Moment'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Inspect Poster Lightbox */}
      {inspectedPoster && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setInspectedPoster(null)}
        >
          <div
            className="w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <PosterStageCard
              poster={inspectedPoster}
              liveParticipants={data.participants}
              canManage={false}
              onOpenStudio={(p) => setStudioPoster(p)}
              onPosterUpdated={onRefreshData}
            />
          </div>
        </div>
      )}

      {/* Photoshop Studio */}
      {studioPoster && (
        <PosterPhotoshopStudio
          poster={studioPoster}
          liveParticipants={data.participants}
          onClose={() => setStudioPoster(null)}
          onSavePoster={async (
            posterId,
            updatedDataUrl,
            title,
            subtitle,
            participantsSnapshot
          ) => {
            await fetch(`/api/public/posters/${posterId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                posterImageUrl: updatedDataUrl,
                title,
                subtitle,
                participantsSnapshot,
              }),
            });
            setStudioPoster(null);
            if (onRefreshData) onRefreshData();
          }}
          onPostToFeed={async (targetPoster, renderedDataUrl, caption) => {
            await fetch(
              '/api/public/posters/' + targetPoster.id + '/share-to-feed',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: `Class ${targetPoster.classCode} Official Poster`,
                  caption,
                  mediaUrl: renderedDataUrl,
                  submittedByName: `Class ${targetPoster.classCode} Official Poster`,
                }),
              }
            );
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

      {/* Full Post Detail Modal */}
      {selectedFullPost && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#0E1118] border border-[#D4AF37]/60 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-[#D4AF37] text-neutral-950 font-bold text-xs uppercase tracking-wider">
                  Class {selectedFullPost.classCode} · {selectedFullPost.mediaType}
                </span>
                <span className="text-xs text-neutral-400">
                  Shared by {selectedFullPost.submittedByName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFullPost(null)}
                className="p-1 rounded text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="rounded-xl overflow-hidden border border-neutral-800 bg-[#07080C] max-h-[50vh] flex items-center justify-center">
                <img
                  src={selectedFullPost.mediaUrl}
                  alt={selectedFullPost.title}
                  className="w-full h-auto object-contain max-h-[50vh]"
                />
              </div>

              <div>
                <h2 className="font-display text-xl font-bold text-white">
                  {selectedFullPost.title}
                </h2>
                <p className="text-sm text-neutral-300 mt-2 leading-relaxed">
                  {selectedFullPost.caption}
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedFullPost.mediaUrl);
                      alert('Post image link copied to clipboard!');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141722] border border-neutral-700 text-xs font-semibold text-neutral-200 hover:text-white cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share Link
                  </button>
                  <a
                    href={selectedFullPost.mediaUrl}
                    download={`${selectedFullPost.title}.png`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-neutral-950 font-bold text-xs hover:brightness-110 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFullPost(null)}
                  className="px-4 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-neutral-300 hover:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Result Inspection Modal */}
      {inspectedResult && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0E1118] border border-[#D4AF37] p-6 text-center space-y-4 shadow-2xl">
            <div className="w-28 h-28 mx-auto rounded-full overflow-hidden border-4 border-[#D4AF37] shadow-lg bg-neutral-900">
              <img
                src={inspectedResult.winnerPhotoUrl}
                alt={inspectedResult.winnerName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/50 text-[#F3D068] text-xs font-bold uppercase tracking-wider">
                {inspectedResult.resultCategory}
              </span>
              <h2 className="font-display text-2xl font-bold text-white mt-3">
                {inspectedResult.winnerName}
              </h2>
              <div className="text-xs text-neutral-400 mt-1">
                Class {inspectedResult.winnerClass} · {inspectedResult.weekLabel}
              </div>
              {inspectedResult.remarks && (
                <p className="text-xs text-neutral-300 mt-3 p-3 rounded-lg bg-[#141722] border border-neutral-800 leading-relaxed">
                  {inspectedResult.remarks}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setInspectedResult(null)}
              className="w-full py-2 rounded-xl bg-[#D4AF37] text-neutral-950 font-bold text-xs cursor-pointer hover:brightness-110"
            >
              Close Laureate Details
            </button>
          </div>
        </div>
      )}

      {/* Project Full Syllabus Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-[#0D1018] border-2 border-[#D4AF37]/60 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-neutral-800 bg-gradient-to-r from-[#141824] to-[#0D1018] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-[#D4AF37] text-neutral-950 font-bold text-xs uppercase tracking-wider">
                  Project {selectedProject.number}
                </span>
                <span className="text-xs font-mono text-[#F3D068] flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 border border-[#D4AF37]/40">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{selectedProject.timeGuideline}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
              <div>
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                  Darul Huda Islamic University • ILM Junior Curriculum
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                  {selectedProject.title}
                </h2>
                <p className="text-sm text-neutral-300 mt-3 leading-relaxed bg-[#121622] p-4 rounded-xl border border-neutral-800">
                  {selectedProject.guidelinesIntro || selectedProject.purpose}
                </p>
              </div>

              {/* Objectives */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-[#F3D068] uppercase tracking-wider flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#D4AF37]" />
                  <span>Core Learning Objectives</span>
                </h3>
                <ul className="grid grid-cols-1 gap-2">
                  {selectedProject.objectives.map((obj, i) => (
                    <li
                      key={i}
                      className="text-xs text-neutral-200 bg-[#141824] p-3 rounded-lg border border-neutral-800/80 flex items-start gap-2.5"
                    >
                      <span className="text-[#D4AF37] font-bold">•</span>
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Step-by-Step Sections / Outline */}
              {selectedProject.guidelineSections.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-[#F3D068] uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                    <span>Structured Speech Guidelines & Outline</span>
                  </h3>
                  <div className="space-y-2.5">
                    {selectedProject.guidelineSections.map((sec, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-[#121622] border border-neutral-800 space-y-2"
                      >
                        <h4 className="font-bold text-white text-sm">
                          {sec.heading}
                        </h4>
                        <ul className="space-y-1.5 pl-2">
                          {sec.items.map((item, itIdx) => (
                            <li
                              key={itIdx}
                              className="text-xs text-neutral-300 flex items-start gap-2"
                            >
                              <span className="text-[#D4AF37] text-xs">→</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evaluation Criteria */}
              {selectedProject.evaluationCriteria.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>Official Evaluation Criteria (Rubric)</span>
                  </h3>
                  <div className="p-4 rounded-xl bg-[#0F1C18] border border-emerald-800/50 space-y-2">
                    {selectedProject.evaluationCriteria.map((crit, cIdx) => (
                      <div
                        key={cIdx}
                        className="text-xs text-emerald-200 flex items-start gap-2"
                      >
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{crit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Quote */}
              {selectedProject.summaryQuote && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#D4AF37]/15 to-transparent border-l-4 border-[#D4AF37] text-xs text-neutral-200 italic leading-relaxed">
                  “{selectedProject.summaryQuote}”
                </div>
              )}

              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between gap-3">
                <a
                  href="/assets/aistudio/Junior_Projects_Explanation_fa534621.pdf"
                  download="ILM_Junior_Projects_Explanation.pdf"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#181D2C] hover:bg-[#202638] text-xs font-bold text-[#F3D068] border border-[#D4AF37]/40 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Full 31-Page PDF</span>
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="px-5 py-2 rounded-xl bg-[#D4AF37] hover:brightness-110 text-neutral-950 font-bold text-xs cursor-pointer"
                >
                  Close Project Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive PDF Reader Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-5xl h-[92vh] rounded-2xl bg-[#0D1018] border-2 border-[#D4AF37]/60 overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-neutral-800 bg-[#121622] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center text-[#F3D068]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    ILM Junior Projects’ Explanation (PDF Document)
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Darul Huda Islamic University • 31 Pages Official Curriculum
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/assets/aistudio/Junior_Projects_Explanation_fa534621.pdf"
                  download="ILM_Junior_Projects_Explanation.pdf"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-neutral-950 font-bold text-xs hover:brightness-110 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full bg-neutral-900 overflow-hidden relative">
              <iframe
                src="/assets/aistudio/Junior_Projects_Explanation_fa534621.pdf"
                title="ILM Junior Projects Explanation"
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0B0D14]/95 backdrop-blur-md border-t border-neutral-800 px-2 py-2 flex items-center justify-around">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'classes', label: 'Classes', icon: GraduationCap },
          { id: 'officers', label: 'Officers', icon: Users },
          { id: 'posters', label: 'Posters', icon: ImageIcon },
          { id: 'feed', label: 'Feed', icon: Sparkles },
          { id: 'results', label: 'Results', icon: Trophy },
          { id: 'library', label: 'Library', icon: Library },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as PublicTab)}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg cursor-pointer ${
                isActive ? 'text-[#F3D068]' : 'text-neutral-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-medium mt-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
