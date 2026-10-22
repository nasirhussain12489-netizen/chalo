import React, { useState, useEffect, useCallback } from 'react';
import { AdminUser, PublicBootstrapData } from './types.ts';
import { safeFetchJson, formatErrorMessage } from './lib/api.ts';
import { PublicWebsite } from './components/PublicWebsite.tsx';
import { AdminLoginModal } from './components/AdminLoginModal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { IlmLogo } from './components/IlmLogo.tsx';

const EMPTY_BOOTSTRAP: PublicBootstrapData = {
  classes: [],
  categories: [],
  students: [],
  participants: [],
  classOfficers: [],
  posters: [],
  feedPosts: [],
  weeklyResults: [],
  libraryResources: [],
  settings: {},
};

export default function App() {
  const [bootstrapData, setBootstrapData] =
    useState<PublicBootstrapData>(EMPTY_BOOTSTRAP);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [publicError, setPublicError] = useState<string | null>(null);

  // Auth state stored in memory (per Cloud SQL + Firebase Auth security guidelines)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [viewMode, setViewMode] = useState<'PUBLIC' | 'DASHBOARD'>('PUBLIC');

  const loadPublicBootstrap = useCallback(async () => {
    try {
      setPublicError(null);
      const { ok, data, error } = await safeFetchJson<PublicBootstrapData>(
        '/api/public/bootstrap',
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );
      if (!ok || !data) {
        throw new Error(error || 'Failed to load ILM platform data.');
      }
      setBootstrapData(data);
    } catch (err: unknown) {
      const message = formatErrorMessage(
        err,
        'Unable to connect to the ILM platform server.'
      );
      console.error('ILM bootstrap error:', message);
      setPublicError(message);
    } finally {
      setLoadingPublic(false);
    }
  }, []);

  useEffect(() => {
    loadPublicBootstrap();
  }, [loadPublicBootstrap]);

  const handleLoginSuccess = (token: string, user: AdminUser) => {
    try {
      sessionStorage.setItem('ilm_admin_session_token', token);
    } catch {
      // ignore
    }
    setAuthToken(token);
    setAdminUser(user);
    setShowLoginModal(false);
    setViewMode('DASHBOARD');
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('ilm_admin_session_token');
    } catch {
      // ignore
    }
    setAuthToken(null);
    setAdminUser(null);
    setViewMode('PUBLIC');
  };

  if (loadingPublic) {
    return (
      <div className="min-h-screen bg-[#07080C] text-white flex flex-col items-center justify-center p-6">
        <IlmLogo size="lg" showSubtitle />
        <p className="text-xs text-neutral-400 tracking-widest uppercase mt-6 animate-pulse">
          Loading Integrated Learning Master...
        </p>
      </div>
    );
  }

  return (
    <>
      {publicError && (
        <div className="bg-red-950/90 border-b border-red-700 px-6 py-3 text-xs text-red-200 flex items-center justify-between">
          <span>{publicError}</span>
          <button
            type="button"
            onClick={loadPublicBootstrap}
            className="px-3 py-1 rounded bg-red-800 hover:bg-red-700 text-white font-semibold cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {viewMode === 'DASHBOARD' && authToken && adminUser ? (
        <AdminDashboard
          token={authToken}
          currentUser={adminUser}
          onLogout={handleLogout}
          onSwitchToPublic={() => setViewMode('PUBLIC')}
          onPublicDataChanged={loadPublicBootstrap}
        />
      ) : (
        <PublicWebsite
          data={bootstrapData}
          currentAdmin={adminUser}
          onOpenAdminLogin={() => setShowLoginModal(true)}
          onRefreshData={loadPublicBootstrap}
          onSwitchToDashboard={() => {
            if (authToken && adminUser) {
              setViewMode('DASHBOARD');
            } else {
              setShowLoginModal(true);
            }
          }}
        />
      )}

      {showLoginModal && (
        <AdminLoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </>
  );
}
