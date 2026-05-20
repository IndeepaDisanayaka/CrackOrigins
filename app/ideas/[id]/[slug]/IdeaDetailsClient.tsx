'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Maximize2, Minimize2, Tag, UserPlus, Globe, Target, Flag, Info, X,
  ArrowBigUp, ArrowBigDown, Bookmark, Share2, MessageSquare, Pencil, Eye,
  ArrowLeft, Users, BadgeCheck, ShieldAlert, Settings, Square, CheckSquare, FileText,
  Music, Volume2, VolumeX, Play, Pause, SkipForward, SkipBack, Trash, CaseSensitive
} from 'lucide-react';
import IdeaSoundtrackSidebar from '@/components/ideas/IdeaSoundtrackSidebar';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}
import { motion } from 'framer-motion';
import MobileNav from '@/components/layout/MobileNav';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import blogPostStyles from '@/app/blogs/[slug]/blog-post.module.css';
import pageStyles from '@/app/page.module.css';
import styles from './ideaDetails.module.css';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useModals } from '@/lib/contexts/ModalContext';
import AuthModal from '@/components/AuthModal';
import { useToast } from '@/components/Toast';
import {
  getIdeaSections,
  getIdeaSnapshot,
  saveCollaborationContent,
  getIdeaById,
  incrementIdeaViews,
  toggleLibrarySave,
  voteIdea,
  getIdeaUserStatus,
  updateIdeaMetadata,
  publishIdea
} from '@/lib/idea-actions';
import { getLicenseByCode } from '@/lib/admin-actions';
import Modal from '@/components/Modal';
import { parseHtmlToStructured, structuredToHtml } from '@/lib/text-parser';
import IdeaCollaborationsSidebar from '@/components/ideas/IdeaCollaborationsSidebar';
import IdeaChatSidebar from '@/components/ideas/IdeaChatSidebar';

const AdminPanel = dynamic(() => import('@/components/AdminPanel'), { ssr: false });
const CouponModal = dynamic(() => import('@/components/admin/CouponModal'), { ssr: false });
const AddOfferModal = dynamic(() => import('@/components/admin/AddOfferModal'), { ssr: false });
const ListGameModal = dynamic(() => import('@/components/admin/ListGameModal'), { ssr: false });
const DispatchModal = dynamic(() => import('@/components/admin/DispatchModal'), { ssr: false });
const IdeaEditor = dynamic(() => import('@/components/ideas/IdeaEditor'), { ssr: false });

export default function IdeaDetailsClient({ id, slug }: { id: string, slug: string }) {
  const router = useRouter();

  const [idea, setIdea] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mode, setMode] = useState<'reader' | 'editor'>('reader');
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCollabSidebarOpen, setIsCollabSidebarOpen] = useState(false);
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  const {
    setIsIdeaSidebarOpen,
    isLicenseModalOpen: isModalLicenseOpen,
    setIsLicenseModalOpen: setModalLicenseOpen,
    isAuthModalOpen, setIsAuthModalOpen,
    isAdminModalOpen, setIsAdminModalOpen,
    isCouponModalOpen, setIsCouponModalOpen,
    isAddOfferModalOpen, setIsAddOfferModalOpen,
    isListGameOpen, setIsListGameOpen,
    isDispatchModalOpen, setIsDispatchModalOpen
  } = useModals();
  const [licenseData, setLicenseData] = useState<any>(null);
  const [pendingSaveParams, setPendingSaveParams] = useState<{ content: any[] } | null>(null);
  const [isSavingConfirmed, setIsSavingConfirmed] = useState(false);
  const [isMetaEditModalOpen, setIsMetaEditModalOpen] = useState(false);
  const [metaFormData, setMetaFormData] = useState({
    description: '',
    image: '',
    isPrivate: false,
    tags: [] as string[],
    characters: [] as { name: string, type: string }[],
    environmentType: 'Modern',
    storyType: 'Horror',
    targetAudience: '',
    goal: '',
    endingType: 'Happy',
    soundtracks: [] as string[]
  });
  const [isSoundtrackDisclaimerAgreed, setIsSoundtrackDisclaimerAgreed] = useState(false);
  const [newTrack, setNewTrack] = useState('');
  const [isSoundSidebarOpen, setIsSoundSidebarOpen] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const [musicVolume, setMusicVolume] = useState(50);
  const [isUpdatingMeta, setIsUpdatingMeta] = useState(false);
  const [isVoteTutorialOpen, setIsVoteTutorialOpen] = useState(false);
  const [lastCloudContent, setLastCloudContent] = useState<string>('');
  const [isVoteTutorialAgreed, setIsVoteTutorialAgreed] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [pendingVote, setPendingVote] = useState<'up' | 'down' | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newChar, setNewChar] = useState({ name: '', type: 'Normal' });
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isGlobalMuted, setIsGlobalMuted] = useState<boolean>(true);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);


  useEffect(() => {
    // Restore user preference — but we never auto-unmute on load (browser would block it)
    const savedMute = localStorage.getItem('global_music_muted');
    if (savedMute === 'false') {
      // User had music on last session — mark as "wants music" but keep muted until click
      setIsMusicPlaying(true);
      // isGlobalMuted stays true until user clicks; player will start muted anyway
    }
  }, []);

  const handleNextTrack = () => {
    if (!idea?.soundtracks?.length) return;
    setCurrentTrackIndex((prev) => (prev + 1) % idea.soundtracks.length);
  };

  const handlePrevTrack = () => {
    if (!idea?.soundtracks?.length) return;
    setCurrentTrackIndex((prev) => (prev - 1 + idea.soundtracks.length) % idea.soundtracks.length);
  };

  // Called directly from user click — preserves browser gesture context
  const handlePlayPause = () => {
    const newPlaying = !isMusicPlaying;
    setIsMusicPlaying(newPlaying);
    setIsGlobalMuted(!newPlaying);
    isGlobalMutedRef.current = !newPlaying;
    localStorage.setItem('global_music_muted', String(!newPlaying));
    // Call player DIRECTLY here — user gesture context is still active
    try {
      if (playerRef.current && typeof playerRef.current.getPlayerState === 'function') {
        if (newPlaying) {
          playerRef.current.unMute();
          playerRef.current.playVideo();
        } else {
          playerRef.current.pauseVideo();
          playerRef.current.mute();
        }
      }
    } catch (e) { console.warn('Player control error:', e); }
  };

  const playerRef = React.useRef<any>(null);

  // --- Refs so YT callbacks always read the LATEST values (avoids stale closures) ---
  const isGlobalMutedRef = React.useRef(true);
  const handleNextTrackRef = React.useRef(handleNextTrack);

  React.useEffect(() => { isGlobalMutedRef.current = isGlobalMuted; }, [isGlobalMuted]);
  React.useEffect(() => { handleNextTrackRef.current = handleNextTrack; });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!idea?.soundtracks?.length) return;
    if (playerRef.current) return; // Already initialized

    // Find first valid video ID
    let startIdx = 0;
    let vidId: string | null = null;
    for (let i = 0; i < idea.soundtracks.length; i++) {
      const foundId = getYouTubeId(idea.soundtracks[i]);
      if (foundId) { vidId = foundId; startIdx = i; break; }
    }
    if (!vidId) return;

    const initPlayer = (ytVidId: string, idx: number) => {
      if (playerRef.current) return; // Prevent double init
      const playerDiv = document.getElementById('atmosphere-player');
      if (!playerDiv) {
        console.warn('initPlayer: playerDiv not found');
        return;
      }

      setCurrentTrackIndex(idx);
      try {
        playerRef.current = new window.YT.Player('atmosphere-player', {
          height: '1',
          width: '1',
          videoId: ytVidId,
          playerVars: {
            autoplay: 1,   // start playing immediately — but always MUTED (browser allows muted autoplay)
            mute: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3
          },
          events: {
            onReady: (event: any) => {
              event.target.setVolume(50);
              setIsPlayerReady(true);
              // Check if user previously had music enabled
              const savedMute = localStorage.getItem('global_music_muted');
              if (savedMute === 'false') {
                try {
                  event.target.unMute();
                  event.target.playVideo();
                  // We optimistically set playing to true.
                  // Update ref synchronously to avoid stale closure in onStateChange
                  isGlobalMutedRef.current = false;
                  setIsGlobalMuted(false);
                  setIsMusicPlaying(true);
                } catch (e) {
                  console.warn('Auto-unmute error:', e);
                }
              }
            },
            onStateChange: (event: any) => {
              if (event.data === 0) {
                handleNextTrackRef.current();
              }
              // If the browser pauses it (because we unmuted without user interaction), revert the UI
              if (event.data === 2 && !isGlobalMutedRef.current) {
                console.warn('Browser blocked autoplay - reverting UI state');
                isGlobalMutedRef.current = true;
                setIsMusicPlaying(false);
                setIsGlobalMuted(true);
                // Also remember to mute the player so it complies with browser policies
                if (playerRef.current && typeof playerRef.current.mute === 'function') {
                  playerRef.current.mute();
                }
              }
            },
            onError: () => handleNextTrackRef.current()
          }
        });
      } catch (err) {
        console.error('Failed to initialize YT Player:', err);
      }
    };

    // Robust init: if YT API already loaded use it directly,
    // otherwise load the script and poll until ready
    const tryInit = (vid: string, idx: number) => {
      // Create script tag if needed
      if (!document.getElementById('yt-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }

      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        const playerDiv = document.getElementById('atmosphere-player');
        const ytLoaded = window.YT && window.YT.Player && typeof window.YT.Player === 'function';

        if (playerDiv && ytLoaded) {
          clearInterval(poll);
          if (window.YT.ready) {
            window.YT.ready(() => initPlayer(vid, idx));
          } else {
            initPlayer(vid, idx);
          }
        } else if (attempts > 60) { // give up after ~30s
          clearInterval(poll);
          console.warn('tryInit: Failed to initialize. playerDiv:', !!playerDiv, ' ytLoaded:', ytLoaded);
        }
      }, 500);
    };

    tryInit(vidId, startIdx);

    return () => { };
  }, [id, idea?.soundtracks]);

  // Handle cleanup separately
  React.useEffect(() => {
    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.warn('Player destroy error:', e);
        }
        playerRef.current = null;
        setIsPlayerReady(false);
      }
    };
  }, [id]);

  React.useEffect(() => {
    if (isPlayerReady && playerRef.current?.setVolume) {
      playerRef.current.setVolume(musicVolume);
    }
  }, [musicVolume, isPlayerReady]);

  React.useEffect(() => {
    // Track change: load new video. Play state is controlled by mute/play effects.
    if (isPlayerReady && playerRef.current?.loadVideoById && idea?.soundtracks) {
      const vidId = getYouTubeId(idea.soundtracks[currentTrackIndex]);
      if (vidId) {
        if (!isGlobalMutedRef.current) {
          playerRef.current.loadVideoById(vidId);
        } else {
          playerRef.current.cueVideoById(vidId); // pre-load without unmuting
        }
      }
    }
  }, [currentTrackIndex, isPlayerReady]);

  // Effect-based fallback (for state changes NOT triggered directly by user click)
  // handlePlayPause already calls player directly, so this handles edge cases only
  React.useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    try {
      if (isGlobalMuted) {
        if (typeof playerRef.current.mute === 'function') playerRef.current.mute();
      } else {
        if (typeof playerRef.current.unMute === 'function') playerRef.current.unMute();
      }
    } catch (e) { console.warn('Player mute sync error:', e); }
  }, [isGlobalMuted, isPlayerReady]);


  const getWordCount = (str: string) => str.trim() ? str.trim().split(/\s+/).length : 0;

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerHeight === window.screen.height) {
        setIsFullScreen(true);
      } else if (!document.fullscreenElement) {
        setIsFullScreen(false);
      }
    };
    check();
    window.addEventListener('resize', check);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(err => console.warn(err));
        }
      }
    };
    
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        setIsFullScreen(true);
      } else if (window.innerHeight !== window.screen.height) {
        setIsFullScreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullScreen]);

  const { user, isAdmin, login } = useAuth();
  const isAuthor = user && idea && user.uid === idea.authorUid;
  const { showToast } = useToast();

  useEffect(() => {
    const fetchIdea = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const ideaRes = await getIdeaById(id);

        if (ideaRes.success && ideaRes.idea) {
          const data = ideaRes.idea;

          const viewedKey = `chronicle_viewed_${id}`;
          const hasViewed = localStorage.getItem(viewedKey);
          if (!hasViewed) {
            const vRes = await incrementIdeaViews(id);
            if (vRes.success) {
              localStorage.setItem(viewedKey, 'true');
            }
          }

          // For Reader Mode, we can use the faster Snapshot. 
          // For Editor Mode, we need getIdeaSections to handle drafts/lineage.
          const sectionsRes: any = mode === 'reader' ? await getIdeaSnapshot(id) : await getIdeaSections(id, user?.uid);
          const sectionsData = sectionsRes.success ? (mode === 'reader' ? sectionsRes.snapshot.sections : sectionsRes.sections) : [];

          setIdea({
            id: data._id || id,
            ...data,
            sections: sectionsData
          });
          setLastCloudContent(JSON.stringify(sectionsData));
          setMetaFormData({
            description: data.description || '',
            image: data.image || '',
            isPrivate: data.isPrivate || false,
            // @ts-ignore
            tags: data.tags || [],
            // @ts-ignore
            characters: data.characters || [],
            // @ts-ignore
            environmentType: data.environmentType || 'Modern',
            // @ts-ignore
            storyType: data.storyType || 'Horror',
            // @ts-ignore
            // @ts-ignore
            targetAudience: data.targetAudience || '',
            // @ts-ignore
            goal: data.goal || '',
            // @ts-ignore
            endingType: data.endingType || 'Happy',
            // @ts-ignore
            soundtracks: data.soundtracks || []
          });

          if (data.licenseCode) {
            const licRes = await getLicenseByCode(data.licenseCode);
            if (licRes.success) setLicenseData(licRes.license);
          }
        } else {
          setError(ideaRes.error || "Idea not found");
        }
      } catch (err) {
        console.error("Error fetching idea:", err);
        setError("Failed to load idea");
      } finally {
        setLoading(false);
      }
    };

    fetchIdea();
  }, [id]);

  useEffect(() => {
    const fetchUserStatus = async () => {
      if (!user || !id) {
        setIsSaved(false);
        setUserVote(null);
        return;
      }
      try {
        const statusRes = await getIdeaUserStatus(user.uid, id);
        if (statusRes.success) {
          setIsSaved(!!statusRes.isSaved);
          setUserVote(statusRes.userVote as any);
        }
      } catch (err) {
        console.error("Error fetching user status:", err);
      }
    };

    fetchUserStatus();
  }, [user, id]);

  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  };

  useEffect(() => {
    if (!loading && idea?.sections) {
      const hash = window.location.hash;
      if (hash) {
        const targetId = hash.replace('#', '');
        setTimeout(() => {
          const element = document.getElementById(targetId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 800);
      }
    }
  }, [loading, idea?.sections]);

  // ── Auto-update URL hash as sections scroll into center view ─────────────
  useEffect(() => {
    if (loading || !idea?.sections?.length || mode !== 'reader') return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the most visible entry
        let best: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!best || entry.intersectionRatio > best.intersectionRatio) {
              best = entry;
            }
          }
        }
        if (best && best.target.id) {
          // Use replaceState so it doesn't create a browser history entry
          window.history.replaceState(null, '', `#${best.target.id}`);
        }
      },
      {
        // Trigger when section occupies the middle 40% of the viewport
        rootMargin: '-30% 0px -30% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0]
      }
    );

    // Observe all rendered section elements
    const sections = document.querySelectorAll('[data-section-slug]');
    sections.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [loading, idea?.sections, mode]);


  useEffect(() => {
    // Only update sidebar state if NOT in full screen
    if (!isFullScreen) {
      setIsIdeaSidebarOpen(isCollabSidebarOpen || isChatSidebarOpen || isSoundSidebarOpen);
    } else {
      setIsIdeaSidebarOpen(false);
    }
  }, [isCollabSidebarOpen, isChatSidebarOpen, isSoundSidebarOpen, setIsIdeaSidebarOpen, isFullScreen]);

  const handleUpdateMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !idea) return;
    setIsUpdatingMeta(true);
    try {
      const res = await updateIdeaMetadata(id, user.uid, metaFormData);
      if (res.success) {
        showToast("Metadata updated successfully.", "success");
        setIdea((prev: any) => ({ ...prev, ...metaFormData }));
        setIsMetaEditModalOpen(false);
      } else {
        showToast(res.error || "Failed to update.", "error");
      }
    } catch (e) {
      showToast("An error occurred.", "error");
    } finally {
      setIsUpdatingMeta(false);
    }
  };

  const handleLogin = async (type: 'google' | 'email-login' | 'email-signup', credentials?: { email: string, password: string }) => {
    const res = await login(type, credentials);
    if (res?.success !== false) {
      setIsAuthModalOpen(false);
    }
    return res;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Recently';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div className="premiumLoader"></div>
      </div>
    );
  }

  const handleSaveContent = async (content: any[], toCloud?: boolean, bypassAgreement = false) => {
    const isSavingSameAsCurrent = JSON.stringify(content) === JSON.stringify(idea.sections);
    const isSameAsCloud = JSON.stringify(content) === lastCloudContent;

    if (isSaving) return;

    if (toCloud && isSameAsCloud) {
      showToast("No Changes Detected", "info", { subtitle: "You haven't made any modifications since your last cloud sync." });
      return;
    }

    if (!isSavingSameAsCurrent) {
      setIdea((prev: any) => ({ ...prev, sections: content }));
    }

    if (toCloud) {
      if (!user) {
        showToast("Authentication Required", "warning", { subtitle: "You must be logged in to save to the cloud." });
        setIsAuthModalOpen(true);
        return;
      }

      if (!isSavingConfirmed && !bypassAgreement) {
        setPendingSaveParams({ content });
        setModalLicenseOpen(true);
        return;
      }

      setIsSaving(true);
      try {
        const sectionsToSave = targetSectionId
          ? content.filter(s => s.id === targetSectionId || !idea.sections.find((orig: any) => orig.id === s.id))
          : content;

        const structuredSections = sectionsToSave.map(section => ({
          ...section,
          paragraphs: section.paragraphs.map((p: string) => parseHtmlToStructured(p))
        }));

        const res = await saveCollaborationContent(id, {
          uid: user.uid,
          name: user.displayName || 'Anonymous',
          photo: user.photoURL || ''
        }, structuredSections, !targetSectionId);

        if (res.success) {
          showToast(
            res.approved ? "Changes Published" : "Draft Submitted",
            "success",
            { subtitle: res.approved ? "Your changes are now live!" : "Draft submitted! Waiting for author's approval." }
          );
          setIsSavingConfirmed(false);
          setPendingSaveParams(null);
          setLastCloudContent(JSON.stringify(content));
        } else {
          showToast("Save Failed", "error", { subtitle: res.error });
        }
      } catch (err: any) {
        console.error("Cloud save error:", err);
        showToast("System Error", "error", { subtitle: "An unexpected error occurred while saving." });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleConfirmAgreement = () => {
    setIsSavingConfirmed(true);
    if (pendingSaveParams) {
      handleSaveContent(pendingSaveParams.content, true, true);
    }
    setModalLicenseOpen(false);
  };

  const handleEditCollaboration = (collab: any) => {
    if (!collab || !collab.paragraph) return;

    setIdea((prev: any) => {
      const newSections = prev.sections.map((s: any) => {
        if (s.id === collab.sectionId) {
          return {
            ...s,
            title: collab.subtitle || s.title,
            paragraphs: collab.paragraph.map((p: any) =>
              typeof p === 'string' ? p : structuredToHtml(p)
            )
          };
        }
        return s;
      });
      return { ...prev, sections: newSections };
    });

    setTargetSectionId(collab.sectionId);
    setMode('editor');
  };

  const handleToggleSave = async () => {
    if (!user) {
      showToast("Authentication Required", "warning", { subtitle: "Login to save this chronicle to your library." });
      setIsAuthModalOpen(true);
      return;
    }

    const prevSaved = isSaved;
    setIsSaved(!prevSaved);

    try {
      const res = await toggleLibrarySave(user.uid, id);
      if (res.success) {
        setIsSaved(!!res.saved);
        showToast(
          res.saved ? "Saved to Library" : "Removed from Library",
          "success",
          { subtitle: res.saved ? "This chronicle is now in your vault." : "Chronicle removed from your collection." }
        );
      } else {
        setIsSaved(prevSaved);
        showToast("Failed to update library status.", "error");
      }
    } catch (e) {
      setIsSaved(prevSaved);
      showToast("Operation Failed", "error");
    }
  };

  const handleVote = async (type: 'up' | 'down') => {
    if (!user) {
      showToast("Authentication Required", "warning", { subtitle: "Login to rate this chronicle's uniqueness." });
      setIsAuthModalOpen(true);
      return;
    }

    const hasSeenTutorial = localStorage.getItem('chronicle_vote_tutorial_seen');
    if (!hasSeenTutorial) {
      setPendingVote(type);
      setIsVoteTutorialOpen(true);
      return;
    }

    const prevVote = userVote;
    const prevIdeaState = { ...idea };

    const newVote = prevVote === type ? null : type;
    setUserVote(newVote);

    setIdea((prev: any) => {
      const newStatus = { ...prev.status };
      if (prevVote === 'up') newStatus.upvotes = Math.max(0, (newStatus.upvotes || 0) - 1);
      if (prevVote === 'down') newStatus.downvotes = Math.max(0, (newStatus.downvotes || 0) - 1);

      if (newVote === 'up') newStatus.upvotes = (newStatus.upvotes || 0) + 1;
      if (newVote === 'down') newStatus.downvotes = (newStatus.downvotes || 0) + 1;

      return { ...prev, status: newStatus };
    });

    try {
      const res = await voteIdea(user.uid, user.displayName || 'Operative', id, type);
      if (res.success) {
        setUserVote(res.vote as any);
      } else {
        setUserVote(prevVote);
        setIdea(prevIdeaState);
        showToast("Failed to register vote.", "error");
      }
    } catch (e) {
      setUserVote(prevVote);
      setIdea(prevIdeaState);
      showToast("Voting Failed", "error");
    }
  };

  const handleTutorialConfirm = () => {
    if (!isVoteTutorialAgreed) {
      showToast("Agreement Required", "warning", { subtitle: "Please acknowledge the voting terms to proceed." });
      return;
    }
    localStorage.setItem('chronicle_vote_tutorial_seen', 'true');
    setIsVoteTutorialOpen(false);
    if (pendingVote) {
      handleVote(pendingVote);
      setPendingVote(null);
    }
  };

  if (error || !idea) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', gap: '1rem' }}>
        <h1 style={{ color: 'var(--foreground)' }}>{error || "Idea not found"}</h1>
        <Link href="/ideas" className="btnSolid">BACK TO IDEAS</Link>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100vw',
      background: 'var(--background)',
      position: 'relative',
      overflow: isFullScreen ? 'hidden' : 'unset'
    }}>
      <motion.div
        style={{ display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', zIndex: 1, width: '100%' }}
        animate={{ width: ((isCollabSidebarOpen || isChatSidebarOpen || isSoundSidebarOpen) && !isMobile && !isFullScreen) ? '75%' : '100%' }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        {!isFullScreen && (
          <>
            <Header isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
            <MobileNav isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
          </>
        )}

        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={handleLogin} />

        <CouponModal isOpen={isCouponModalOpen} onClose={() => setIsCouponModalOpen(false)} />
        <AddOfferModal isOpen={isAddOfferModalOpen} onClose={() => setIsAddOfferModalOpen(false)} />
        <ListGameModal isOpen={isListGameOpen} onClose={() => setIsListGameOpen(false)} />
        <DispatchModal isOpen={isDispatchModalOpen} onClose={() => setIsDispatchModalOpen(false)} />

        {user && isAdmin && (
          <AdminPanel userUid={user.uid} isOpen={isAdminModalOpen} setIsOpen={setIsAdminModalOpen} />
        )}

        <main className={pageStyles.main} style={{
          paddingTop: isFullScreen ? '2rem' : undefined,
          maxWidth: isFullScreen ? '1600px' : undefined,
          width: isFullScreen ? '95%' : undefined,
          margin: isFullScreen ? '0 auto' : undefined
        }}>
          {isFullScreen && (
            <motion.div
              style={{ position: 'fixed', top: '2rem', right: '2rem', zIndex: 10001 }}
              animate={{ right: (isCollabSidebarOpen || isChatSidebarOpen || isSoundSidebarOpen) ? 'calc(25% + 2rem)' : '2rem' }}
            >
              <button onClick={() => {
                setIsFullScreen(false);
                if (document.fullscreenElement && document.exitFullscreen) {
                  document.exitFullscreen().catch(err => console.warn(err));
                }
              }} className={styles.actionBtn}>
                <Minimize2 size={18} />
              </button>
            </motion.div>
          )}
          <article className={blogPostStyles.blogPostWrapper} style={{
            border: 'none',
            boxShadow: 'none',
            background: 'transparent',
            maxWidth: isFullScreen ? '100%' : undefined,
            padding: isFullScreen ? '2rem 1rem 10rem' : undefined
          }}>
            {(true) && ( // Always show title and description, even in fullscreen
              <header className={blogPostStyles.postHeader} style={{ maxWidth: isFullScreen ? '1400px' : undefined, margin: isFullScreen ? '0 auto 2rem' : undefined }}>
                <div className={blogPostStyles.postMeta}>
                  <span style={{ color: 'var(--primary)', fontWeight: 900 }}>{idea.category || "CHRONICLE"}</span> • {formatDate(idea.time)}
                </div>
                <h1 className={blogPostStyles.postTitle}>{idea.title.toUpperCase()}</h1>

                {/* Reader Metadata Block - repositioned between title and description */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '0.8rem',
                  marginTop: '1.5rem',
                  marginBottom: '2rem',
                  padding: '0.5rem',
                  maxWidth: '1200px',
                  margin: '1.5rem auto 2rem'
                }}>
                  {idea.environmentType && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.65rem', fontWeight: 900,
                      color: '#000', background: 'var(--primary)', padding: '6px 14px', borderRadius: '4px',
                      border: '1px solid var(--primary)', textTransform: 'uppercase'
                    }}>
                      <Globe size={12} color="#000" /> {idea.environmentType}
                    </div>
                  )}
                  {idea.storyType && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.65rem', fontWeight: 900,
                      color: 'var(--primary)', background: 'rgba(var(--primary-rgb), 0.1)', padding: '6px 14px', borderRadius: '4px',
                      border: '2px solid var(--primary)', textTransform: 'uppercase'
                    }}>
                      <Info size={12} color="var(--primary)" /> {idea.storyType}
                    </div>
                  )}
                  {idea.targetAudience && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.65rem', fontWeight: 900,
                      color: '#FFF', background: '#000000', padding: '6px 14px', borderRadius: '4px',
                      border: '2px solid var(--primary)', textTransform: 'uppercase'
                    }}>
                      <Target size={12} color="var(--primary)" /> {idea.targetAudience}
                    </div>
                  )}
                  {idea.endingType && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.65rem', fontWeight: 900,
                      color: 'var(--primary)', background: 'transparent', padding: '6px 14px', borderRadius: '4px',
                      border: '2px solid var(--primary)', textTransform: 'uppercase'
                    }}>
                      <Flag size={12} color="var(--primary)" /> {idea.endingType}
                    </div>
                  )}
                  {idea.tags && idea.tags.length > 0 && (
                    <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.4rem', marginTop: '1rem' }}>
                      {idea.tags.map((tag: string, i: number) => (
                        <span key={i} style={{
                          color: '#000', fontSize: '0.6rem', fontWeight: 950,
                          background: 'var(--primary)', padding: '3px 10px', borderRadius: '4px',
                          boxShadow: '4px 4px 0px rgba(var(--primary-rgb), 0.2)'
                        }}>#{tag.toUpperCase()}</span>
                      ))}
                    </div>
                  )}
                </div>

                {idea.description && (
                  <div style={{ position: 'relative', maxWidth: isFullScreen ? '1400px' : '900px', margin: '0 auto' }}>
                    <div
                      style={{
                        overflow: 'hidden',
                        height: isDescExpanded ? 'auto' : '110px'
                      }}
                    >
                      <p className={styles.postDescription} style={{
                        display: '-webkit-box',
                        WebkitLineClamp: isDescExpanded ? 'unset' : 4,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        maxWidth: '100%',
                        textAlign: 'center'
                      }}>
                        {idea.description}
                      </p>
                    </div>
                    {idea.description.length > 200 && (
                      <button
                        onClick={() => setIsDescExpanded(!isDescExpanded)}
                        style={{
                          background: 'none', border: 'none', color: 'var(--primary)',
                          fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer',
                          marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px'
                        }}
                      >
                        {isDescExpanded ? 'View Less ▲' : 'View More ▼'}
                      </button>
                    )}
                  </div>
                )}

                {idea.goal && (
                  <div style={{
                    marginTop: '2.5rem',
                    padding: '1.25rem 2rem',
                    background: 'rgba(var(--primary-rgb), 0.08)',
                    border: '1px solid rgba(var(--primary-rgb), 0.2)',
                    borderRadius: '12px',
                    maxWidth: isFullScreen ? '1400px' : '900px',
                    margin: '2.5rem auto 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    justifyContent: 'center'
                  }}>
                    <Target size={20} color="var(--primary)" />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 950, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Strategic Goal</span>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)', opacity: 0.9 }}>{idea.goal}</p>
                    </div>
                  </div>
                )}

                {isAuthor && !isFullScreen && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <button
                      onClick={() => {
                        setMetaFormData((prev: any) => ({
                          ...prev,
                          description: idea.description || '',
                          image: idea.image || '',
                          isPrivate: idea.isPrivate || false,
                          tags: idea.tags || [],
                          characters: idea.characters || [],
                          environmentType: idea.environmentType || 'Modern',
                          storyType: idea.storyType || 'Horror',
                          targetAudience: idea.targetAudience || '',
                          goal: idea.goal || '',
                          endingType: idea.endingType || 'Happy'
                        }));
                        setIsMetaEditModalOpen(true);
                      }}
                      className="btnOutline"
                      style={{ padding: '0.6rem 1.2rem', fontSize: '0.75rem', gap: '0.5rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                    >
                      <Settings size={14} /> EDIT CHRONICLE INFO
                    </button>
                  </div>
                )}
              </header>
            )}

            {!isFullScreen && (
              <div className={styles.authorRow} style={{ position: 'sticky', top: '80px', zIndex: 1000, background: 'var(--background)' }}>
                <div className={styles.authors}>
                  <div className={styles.authorBlock}>
                    <img src={idea.authorPhoto || `https://i.pravatar.cc/150?u=${idea.authorUid}`} alt={idea.author} className={styles.avatar} />
                    <div className={styles.authorDetails}>
                      <span className={styles.authorLabel}>Author</span>
                      <span className={styles.authorName}>{idea.author}</span>
                    </div>
                  </div>

                  <div className={styles.licenseBadgeRow} onClick={() => setModalLicenseOpen(true)} style={{ cursor: 'pointer' }}>
                    <div className={styles.licenseLabel}><BadgeCheck size={14} color="var(--primary)" /><span>LICENSE</span></div>
                    <div className={styles.licenseValue}>{idea.licenseCode || "COMMUNITY"}</div>
                  </div>
                </div>

                <div className={styles.interactions}>
                  <div className={styles.modeSwitchContainer}>
                    <span className={`${styles.modeLabel} ${mode === 'reader' ? styles.modeLabelActive : ''}`} onClick={() => setMode('reader')}>Reader</span>
                    <div className={`${styles.switch} ${mode === 'editor' ? styles.switchActive : ''}`} onClick={() => setMode(mode === 'reader' ? 'editor' : 'reader')}>
                      <div className={styles.switchHandle} />
                    </div>
                    <span className={`${styles.modeLabel} ${mode === 'editor' ? styles.modeLabelActive : ''}`} onClick={() => setMode('editor')}>Editor</span>
                  </div>

                  <div className={styles.statsGroup}>
                    <div className={styles.statBtn} title="Views"><Eye size={20} strokeWidth={1.5} /><span>{idea.status?.views || 0}</span></div>
                    <div className={styles.votingCluster}>
                      <button className={`${styles.statBtn} ${userVote === 'up' ? styles.statBtnActiveUp : ''}`} onClick={() => handleVote('up')} title="Unique (Upvote)">
                        <ArrowBigUp size={22} strokeWidth={userVote === 'up' ? 0 : 1.5} fill={userVote === 'up' ? "var(--primary)" : "none"} />
                        <span>{idea.status?.upvotes || 0}</span>
                      </button>
                      <button className={`${styles.statBtn} ${userVote === 'down' ? styles.statBtnActiveDown : ''}`} onClick={() => handleVote('down')} title="Redundant (Downvote)">
                        <ArrowBigDown size={22} strokeWidth={userVote === 'down' ? 0 : 1.5} fill={userVote === 'down' ? "#ff4d4d" : "none"} />
                        <span>{idea.status?.downvotes || 0}</span>
                      </button>
                    </div>
                  </div>

                  <div className={styles.actionsGroup}>
                    <button className={`${styles.actionBtn} ${isSaved ? styles.actionBtnSaved : ''}`} onClick={handleToggleSave} title="Save Vault"><Bookmark size={18} fill={isSaved ? "currentColor" : "none"} /></button>
                    <button className={styles.actionBtn} onClick={() => {
                      navigator.clipboard.writeText(window.location.href.split('#')[0]);
                      showToast('Link copied!', 'success');
                    }} title="Share"><Share2 size={18} /></button>

                    {idea?.soundtracks && idea.soundtracks.length > 0 && (
                      <button
                        className={`${styles.actionBtn} ${(isSoundSidebarOpen || isMusicPlaying) ? styles.actionBtnActive : ''}`}
                        onClick={() => {
                          const nextState = !isSoundSidebarOpen;
                          setIsSoundSidebarOpen(nextState);
                          if (nextState) {
                            setIsChatSidebarOpen(false);
                            setIsCollabSidebarOpen(false);
                            // Call player DIRECTLY here — user gesture context still active
                            isGlobalMutedRef.current = false;
                            setIsGlobalMuted(false);
                            setIsMusicPlaying(true);
                            localStorage.setItem('global_music_muted', 'false');
                            try {
                              if (playerRef.current) {
                                playerRef.current.unMute();
                                playerRef.current.playVideo();
                              }
                            } catch (e) { console.warn('Player open error:', e); }
                          }
                        }}
                        title="Sound Center"
                      >
                        {isMusicPlaying ? <Volume2 size={18} className="animate-pulse" /> : <Music size={18} />}
                      </button>
                    )}
                    <button className={`${styles.actionBtn} ${isChatSidebarOpen ? styles.actionBtnActive : ''}`} onClick={() => { setIsChatSidebarOpen(!isChatSidebarOpen); if (!isChatSidebarOpen) { setIsCollabSidebarOpen(false); setIsSoundSidebarOpen(false); } }} title="Comments"><MessageSquare size={18} /></button>
                    <button className={`${styles.actionBtn} ${isCollabSidebarOpen ? styles.actionBtnActive : ''}`} onClick={() => { setIsCollabSidebarOpen(!isCollabSidebarOpen); if (!isCollabSidebarOpen) { setIsChatSidebarOpen(false); setIsSoundSidebarOpen(false); } }} title="Collaborations"><Users size={18} /></button>
                    <button className={styles.actionBtn} onClick={() => {
                      setIsFullScreen(true);
                      if (document.documentElement.requestFullscreen) {
                        document.documentElement.requestFullscreen().catch(err => console.warn(err));
                      }
                    }} title="Full Screen Mode"><Maximize2 size={18} /></button>
                  </div>
                </div>
              </div>
            )}

            {idea.image && (() => {
              let srcDomain = '';
              let srcHref = '';
              try {
                const u = new URL(idea.image);
                srcDomain = u.hostname.replace(/^www\./, '');
                srcHref = u.origin;
              } catch { }
              return (
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: isFullScreen ? '300px' : '450px',
                  overflow: 'hidden',
                  border: '1px solid var(--outline-color)',
                  margin: isFullScreen ? '2rem 0' : undefined,
                }}>
                  <img src={idea.image} alt={idea.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {srcDomain && (
                    <a
                      href={srcHref || idea.image}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Image source: ${srcDomain}`}
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(6px)',
                        border: '1px solid rgba(254,182,12,0.35)',
                        borderRadius: '5px',
                        padding: '4px 10px 4px 6px',
                        textDecoration: 'none',
                        color: 'rgba(255,255,255,0.85)',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        fontFamily: "'Outfit', sans-serif",
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        transition: 'all 0.2s ease',
                        zIndex: 10,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(254,182,12,0.15)';
                        (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(254,182,12,0.7)';
                        (e.currentTarget as HTMLAnchorElement).style.color = '#FEB60C';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,0,0,0.65)';
                        (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(254,182,12,0.35)';
                        (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.85)';
                      }}
                    >
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${srcDomain}&sz=16`}
                        alt={srcDomain}
                        style={{ width: '14px', height: '14px', borderRadius: '2px', flexShrink: 0 }}
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                      {srcDomain}
                    </a>
                  )}
                </div>
              );
            })()}

            <div className={blogPostStyles.mainContent} style={{ maxWidth: isFullScreen ? '1400px' : undefined, width: isFullScreen ? '100%' : undefined, margin: isFullScreen ? '0 auto' : undefined, gap: isFullScreen ? '1rem' : undefined }}>
              {mode === 'reader' ? (
                <div className={`blog-content ${styles.readerContent}`} style={{ border: 'none', background: 'transparent', maxWidth: isFullScreen ? '100%' : undefined }}>
                  {idea.sections && idea.sections.map((section: any, index: number) => {
                    const sectionSlug = section.slug || slugify(section.subtitle || section.title || `section-${index}`);
                    return (
                      <section key={section.id || index} id={sectionSlug} data-section-slug={sectionSlug} className={styles.blogSection} style={{ scrollMarginTop: '100px', marginBottom: '4rem' }}>
                        <div className={styles.sectionReaderWrapper}>
                          <div className={styles.sectionMainContent}>
                            <div className={styles.sectionHeaderReader}>
                              <div className={styles.sectionTitleRow}>
                                <div
                                  className={styles.subtitleLink}
                                  onClick={() => {
                                    window.location.hash = sectionSlug;
                                    showToast(`Linked to ${section.subtitle || 'section'}`, 'success');
                                  }}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <h2 className={styles.blogSectionTitle}>{section.subtitle || section.title}</h2>
                                </div>
                              </div>
                            </div>

                            <div className={styles.sectionBody} style={{ maxWidth: isFullScreen ? '100%' : undefined }}>
                              {section.paragraphs.map((para: any, pIndex: number) => (
                                <p key={pIndex} dangerouslySetInnerHTML={{ __html: typeof para === 'string' ? para : structuredToHtml(para) }} style={{ marginBottom: '1.2rem', opacity: 0.9, lineHeight: 1.8, maxWidth: isFullScreen ? '100%' : undefined }} />
                              ))}
                            </div>
                          </div>

                          {!isFullScreen && (
                            <div className={styles.sectionStatusBar}>
                              {/* Word Count */}
                              <div className={styles.statusItem} style={{ position: 'relative' }}>
                                <FileText size={16} className={styles.statusIcon} />
                                <span className={styles.statusValue}>
                                  {section.paragraphs
                                    .map((p: any) => (typeof p === 'string' ? p : structuredToHtml(p)).replace(/<[^>]*>/g, ''))
                                    .join(' ')
                                    .trim()
                                    .split(/\s+/)
                                    .filter(Boolean).length}
                                </span>
                                <div className={styles.verticalTooltip}>Word Count</div>
                              </div>

                              {/* Character Count */}
                              <div className={styles.statusItem} style={{ position: 'relative' }}>
                                <CaseSensitive size={18} className={styles.statusIcon} />
                                <span className={styles.statusValue}>
                                  {section.paragraphs
                                    .map((p: any) => (typeof p === 'string' ? p : structuredToHtml(p)).replace(/<[^>]*>/g, ''))
                                    .join('').length}
                                </span>
                                <div className={styles.verticalTooltip}>Char Count</div>
                              </div>

                              {/* Collaborators — always visible */}
                              <div className={styles.statusCollabs}>
                                <div className={styles.statusItem} style={{ position: 'relative' }}>
                                  <Users size={16} className={styles.statusIcon} />
                                  <span className={styles.statusValue}>{(section.collaborators || []).length}</span>
                                  <div className={styles.verticalTooltip}>Collaborators</div>
                                </div>
                                {section.collaborators && section.collaborators.length > 0 && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                    {section.collaborators.slice(-3).reverse().map((collab: any) => (
                                      <div key={collab.uid} className={styles.collabAvatarWrapper} style={{ margin: 0, position: 'relative' }}>
                                        <img src={collab.photo || `https://i.pravatar.cc/150?u=${collab.uid}`} alt={collab.name} className={styles.verticalAvatar} />
                                        <div className={styles.verticalTooltip}>
                                          {collab.name}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Edit Button */}
                              <div className={styles.statusItem} style={{ position: 'relative', marginTop: 'auto' }}>
                                <button
                                  className={styles.verticalEditBtn}
                                  onClick={() => { setTargetSectionId(section.id); setMode('editor'); }}
                                >
                                  <Pencil size={18} />
                                </button>
                                <div className={styles.verticalTooltip}>Edit Section</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.editorModeContent}>
                  <IdeaEditor
                    id={id}
                    initialContent={idea.sections || []}
                    onSave={handleSaveContent}
                    isSaving={isSaving}
                    targetSectionId={targetSectionId}
                    isAuthor={isAuthor}
                    onResetMode={() => setTargetSectionId(null)}
                  />
                </div>
              )}
              {!isFullScreen && (
                <footer className={blogPostStyles.postFooter}>
                  <Link href="/ideas" className="btnOutline"><ArrowLeft size={16} /> BACK TO LIBRARY</Link>
                </footer>
              )}
            </div>
          </article>
        </main>
        {!isFullScreen && <Footer />}
      </motion.div>

      {!isFullScreen && (
        <>
          <IdeaCollaborationsSidebar
            isOpen={isCollabSidebarOpen} isMobile={isMobile} onClose={() => setIsCollabSidebarOpen(false)}
            ideaId={id} currentSections={idea.sections || []} onApproved={() => router.refresh()}
            isAuthor={isAuthor === true} onEditCollaboration={handleEditCollaboration}
          />
          <IdeaChatSidebar
            isOpen={isChatSidebarOpen}
            onClose={() => setIsChatSidebarOpen(false)}
            ideaTitle={idea.title}
            ideaId={id}
            isMobile={isMobile}
          />
          <IdeaSoundtrackSidebar
            isOpen={isSoundSidebarOpen}
            onClose={() => setIsSoundSidebarOpen(false)}
            tracks={idea?.soundtracks || []}
            currentIndex={currentTrackIndex}
            isPlaying={isMusicPlaying}
            onPlayPause={handlePlayPause}
            onNext={handleNextTrack}
            onPrev={handlePrevTrack}
            onSelectTrack={(i) => setCurrentTrackIndex(i)}
            volume={musicVolume}
            onVolumeChange={(v) => setMusicVolume(v)}
            isMobile={isMobile}
          />
        </>
      )}

      {/* MODALS */}
      <Modal isOpen={isModalLicenseOpen} onClose={() => { setModalLicenseOpen(false); setPendingSaveParams(null); }} title="Chronicle License Information" maxWidth="600px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(var(--primary-rgb), 0.1)', border: '1px solid var(--primary)', borderRadius: '8px' }}>
            <BadgeCheck size={32} color="var(--primary)" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 950 }}>{licenseData?.code || idea.licenseCode || "COMMUNITY OPEN"}</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>{licenseData?.name || "Standard Agency Agreement"}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', padding: '0 0.5rem' }}>
            <div>
              <h4 style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--primary)', letterSpacing: '1px' }}>Usage Description</h4>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6, opacity: 0.85 }}>{licenseData?.description || "Shared collective intelligence agreement."}</p>
            </div>

            {(licenseData?.terms || licenseData?.limitations) && (
              <div style={{ padding: '1rem', background: 'rgba(var(--foreground-rgb), 0.03)', borderRadius: '8px', border: '1px solid var(--outline-color)' }}>
                <h4 style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.6rem', opacity: 0.6 }}>Terms & Limitations</h4>
                <div style={{ fontSize: '0.8rem', lineHeight: 1.6, opacity: 0.9 }}>
                  {licenseData?.terms && <div style={{ marginBottom: '0.8rem' }}>{licenseData.terms}</div>}
                  {licenseData?.limitations && <div>{licenseData.limitations}</div>}
                </div>
              </div>
            )}
          </div>
          {pendingSaveParams && (
            <div style={{ marginTop: '1rem', padding: '1.25rem', border: '2px solid var(--primary)', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}><ShieldAlert size={20} color="var(--primary)" /><span style={{ fontWeight: 900, fontSize: '0.9rem' }}>AGREEMENT</span></div>
              <p style={{ fontSize: '0.8rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>Push changes to the cloud under this license?</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btnSolid" style={{ flex: 1, padding: '0.8rem' }} onClick={handleConfirmAgreement}>I AGREE & PUBLISH</button>
                <button className="btnOutline" style={{ flex: 1, padding: '0.8rem' }} onClick={() => { setModalLicenseOpen(false); setPendingSaveParams(null); }}>CANCEL</button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={isMetaEditModalOpen} onClose={() => setIsMetaEditModalOpen(false)} title="Edit Chronicle Info" maxWidth="800px">
        <form onSubmit={handleUpdateMeta} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem', padding: '0.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', gridColumn: isMobile ? 'auto' : '1 / -1' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8 }}><Info size={14} style={{ marginRight: 6 }} /> DESCRIPTION</label>
                <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>{getWordCount(metaFormData.description)} / 200 words</span>
              </div>
              <textarea
                className={pageStyles.adminInput}
                style={{ minHeight: '80px', resize: 'vertical', paddingTop: '0.8rem' }}
                value={metaFormData.description}
                onChange={e => {
                  const words = getWordCount(e.target.value);
                  if (words <= 200 || e.target.value.length < metaFormData.description.length) {
                    setMetaFormData({ ...metaFormData, description: e.target.value });
                  }
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8 }}><Globe size={14} style={{ marginRight: 6 }} /> COVER IMAGE URL</label>
              <input type="url" className={pageStyles.adminInput} value={metaFormData.image} onChange={e => setMetaFormData({ ...metaFormData, image: e.target.value })} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8 }}><Tag size={14} style={{ marginRight: 6 }} /> TAGS (MAX 10)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className={pageStyles.adminInput}
                  placeholder="Add tag..."
                  style={{ flex: 1 }}
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newTag && metaFormData.tags.length < 10) {
                        setMetaFormData({ ...metaFormData, tags: [...metaFormData.tags, newTag] });
                        setNewTag('');
                      }
                    }
                  }}
                />
                <button type="button" className="btnSolid" style={{ padding: '0 1rem' }} onClick={() => {
                  if (newTag && metaFormData.tags.length < 10) {
                    setMetaFormData({ ...metaFormData, tags: [...metaFormData.tags, newTag] });
                    setNewTag('');
                  }
                }}>+</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {metaFormData.tags?.map((tag: string, i: number) => (
                  <span key={i} style={{ background: 'var(--primary)', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    #{tag}
                    <X size={10} cursor="pointer" onClick={() => {
                      setMetaFormData({ ...metaFormData, tags: metaFormData.tags.filter((_, idx) => idx !== i) });
                    }} />
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8 }}><UserPlus size={14} style={{ marginRight: 6 }} /> CHARACTERS</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" className={pageStyles.adminInput} placeholder="Name" style={{ flex: 1 }} value={newChar.name} onChange={e => setNewChar({ ...newChar, name: e.target.value })} />
                <select className={pageStyles.adminInput} value={newChar.type} onChange={e => setNewChar({ ...newChar, type: e.target.value })} style={{ width: '120px' }}>
                  <option>Main</option>
                  <option>Supporter</option>
                  <option>Enemy</option>
                  <option>Random</option>
                  <option>Normal</option>
                </select>
                <button type="button" className="btnSolid" style={{ padding: '0 1rem' }} onClick={() => {
                  if (newChar.name) {
                    setMetaFormData({ ...metaFormData, characters: [...metaFormData.characters, newChar] });
                    setNewChar({ name: '', type: 'Normal' });
                  }
                }}>+</button>
              </div>
              <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                {metaFormData.characters?.map((c: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.75rem' }}>
                    <span><strong>{c.name}</strong> ({c.type})</span>
                    <X size={12} cursor="pointer" onClick={() => {
                      setMetaFormData({ ...metaFormData, characters: metaFormData.characters.filter((_, idx) => idx !== i) });
                    }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8 }}>ENVIRONMENT</label>
                <select className={pageStyles.adminInput} value={metaFormData.environmentType} onChange={e => setMetaFormData({ ...metaFormData, environmentType: e.target.value })}>
                  <option>Legacy</option>
                  <option>Futuristic</option>
                  <option>Modern</option>
                  <option>Universal</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8 }}>STORY TYPE</label>
                <select className={pageStyles.adminInput} value={metaFormData.storyType} onChange={e => setMetaFormData({ ...metaFormData, storyType: e.target.value })}>
                  <option>Puzzle</option>
                  <option>Horror</option>
                  <option>Action</option>
                  <option>Mystery</option>
                  <option>Fantasy</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8 }}><Target size={14} style={{ marginRight: 6 }} /> TARGET AUDIENCE</label>
              <input type="text" className={pageStyles.adminInput} value={metaFormData.targetAudience} onChange={e => setMetaFormData({ ...metaFormData, targetAudience: e.target.value })} placeholder="e.g. Young Adults, RPG Gamers" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8 }}><Flag size={14} style={{ marginRight: 6 }} /> GOAL (OPTIONAL)</label>
                <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>{getWordCount(metaFormData.goal)} / 5 words</span>
              </div>
              <input
                type="text"
                className={pageStyles.adminInput}
                value={metaFormData.goal}
                onChange={e => {
                  const words = getWordCount(e.target.value);
                  if (words <= 5 || e.target.value.length < metaFormData.goal.length) {
                    setMetaFormData({ ...metaFormData, goal: e.target.value });
                  }
                }}
                placeholder="Primary mission or objective"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8 }}>ENDING TYPE</label>
              <select className={pageStyles.adminInput} value={metaFormData.endingType} onChange={e => setMetaFormData({ ...metaFormData, endingType: e.target.value })}>
                <option>Happy</option>
                <option>Sad</option>
                <option>Suspense</option>
                <option>Unexpected</option>
                <option>Bittersweet</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8 }}><Music size={14} style={{ marginRight: 6 }} /> SOUNDTRACK PLAYLIST (YOUTUBE URLS)</label>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="url"
                  className={pageStyles.adminInput}
                  value={newTrack}
                  onChange={e => setNewTrack(e.target.value)}
                  placeholder="Paste YouTube URL..."
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btnSolid"
                  disabled={!newTrack || !isSoundtrackDisclaimerAgreed}
                  onClick={() => {
                    if (newTrack && isSoundtrackDisclaimerAgreed) {
                      setMetaFormData({ ...metaFormData, soundtracks: [...(metaFormData.soundtracks || []), newTrack] });
                      setNewTrack('');
                    }
                  }}
                >+</button>
              </div>

              {metaFormData.soundtracks && metaFormData.soundtracks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                  {metaFormData.soundtracks.map((url: string, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.7rem' }}>
                      <span style={{ opacity: 0.6, wordBreak: 'break-all' }}>{url}</span>
                      <Trash size={12} cursor="pointer" onClick={() => setMetaFormData({ ...metaFormData, soundtracks: metaFormData.soundtracks.filter((_: any, idx: number) => idx !== i) })} />
                    </div>
                  ))}
                </div>
              )}

              {(newTrack || (metaFormData.soundtracks && metaFormData.soundtracks.length > 0)) && (
                <div style={{ marginTop: '0.8rem', padding: '1rem', background: 'rgba(255, 100, 100, 0.05)', border: '1px solid rgba(255, 100, 100, 0.2)', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.65rem', color: '#ff6666', lineHeight: 1.4, margin: 0, fontWeight: 800 }}>
                    ⚠️ LEGAL DISCLOSURE: None of these sounds belong to Crack Origins; they are obtained from third-party platforms. All responsibility for these sounds rests with the person who added them.
                  </p>
                  <div
                    onClick={() => setIsSoundtrackDisclaimerAgreed(!isSoundtrackDisclaimerAgreed)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.8rem', cursor: 'pointer' }}
                  >
                    {isSoundtrackDisclaimerAgreed ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} />}
                    <span style={{ fontSize: '0.65rem', fontWeight: 900 }}>I AGREE & UNDERSTAND</span>
                  </div>
                </div>
              )}
            </div>

            <div onClick={() => setMetaFormData({ ...metaFormData, isPrivate: !metaFormData.isPrivate })} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', border: '1px solid var(--outline-color)', borderRadius: '8px', cursor: 'pointer', borderColor: metaFormData.isPrivate ? 'var(--primary)' : 'var(--outline-color)', background: metaFormData.isPrivate ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent' }}>
              <div style={{ color: metaFormData.isPrivate ? 'var(--primary)' : 'var(--text-muted)' }}>{metaFormData.isPrivate ? <CheckSquare size={18} /> : <Square size={18} />}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>Private Chronicle</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', gridColumn: isMobile ? 'auto' : '1 / -1' }}>
            <button type="button" onClick={() => setIsMetaEditModalOpen(false)} className="btnOutline" style={{ padding: '0.8rem 2rem' }}>Cancel</button>
            <button type="submit" disabled={isUpdatingMeta} className="btnSolid" style={{ padding: '0.8rem 2rem' }}>{isUpdatingMeta ? "Syncing..." : "Update Meta"}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isVoteTutorialOpen} onClose={() => setIsVoteTutorialOpen(false)} title="Intelligence Validation Protocol" maxWidth="550px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', padding: '0.5rem 0' }}>
          <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--primary)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <BadgeCheck size={32} color="var(--primary)" />
            <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--foreground)', opacity: 0.9 }}>
              <strong>Integrity First:</strong> You are the final judge of originality in the Crack Origins multi-verse. Join us in maintaining a high-fidelity narrative environment.
            </p>
          </div>

          <div style={{ padding: '0.5rem' }}>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.9, marginBottom: '1.2rem' }}>
              If you feel this content is genuinely creative and <strong>not AI-generated</strong> or <strong>duplicate</strong>, please <strong>Upvote</strong>.
              If it appears to be unoriginal, duplicated, or AI-generated content, please <strong>Downvote</strong>.
            </p>

            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.9, marginBottom: '1.2rem' }}>
              Please be honest. If this is an authentic creation, support the original creator respectfully and consider <strong>Collaborating</strong> together.
              Simply put, this is your judgment of content quality.
            </p>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--outline-color)', fontSize: '0.75rem', opacity: 0.7, fontStyle: 'italic' }}>
              The Upvote/Downvote system measures whether content is high-quality or redundant based on your objective evaluation.
            </div>
          </div>
          <div
            onClick={() => setIsVoteTutorialAgreed(!isVoteTutorialAgreed)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              padding: '1.2rem',
              background: isVoteTutorialAgreed ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
              border: `1px solid ${isVoteTutorialAgreed ? 'var(--primary)' : 'var(--outline-color)'}`,
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            <div style={{ color: isVoteTutorialAgreed ? 'var(--primary)' : 'var(--text-muted)' }}>
              {isVoteTutorialAgreed ? <CheckSquare size={20} /> : <Square size={20} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: isVoteTutorialAgreed ? 'var(--primary)' : 'var(--foreground)' }}>
                I ACKNOWLEDGE PROTOCOLS
              </span>
              <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>I will vote honestly to protect the multi-verse's integrity.</span>
            </div>
          </div>

          <button
            onClick={handleTutorialConfirm}
            className="btnSolid"
            style={{ width: '100%', padding: '1rem', marginTop: '0.5rem' }}
          >
            CONFIRM & VOTE
          </button>
        </div>
      </Modal>

      {/* Permanent player container to avoid mounting issues */}
      <div style={{ position: 'fixed', top: -100, left: -100, width: 1, height: 1, opacity: 0.01, pointerEvents: 'none', zIndex: -1 }}>
        <div id="atmosphere-player"></div>
      </div>
    </div>
  );
}

const getYouTubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};
