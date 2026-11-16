import React, { useEffect, useRef, useState } from 'react';
import { signInWithPopup, signOut, User } from 'firebase/auth';
import {
  ArrowLeft,
  Check,
  Edit3,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  Lock,
  LogOut,
  Plus,
  ShieldAlert,
  Trash2,
  Unlock,
  UserPlus,
  Users,
} from 'lucide-react';
import { generateSalt, hashPassword } from '../lib/crypto';
import { auth, googleProvider } from '../lib/firebase';
import { compressImageFile } from '../lib/imageUtils';
import {
  addAuthorizedAdmin,
  AdminSecurityRecord,
  checkUserIsAuthorizedAdmin,
  createRoute,
  deleteRoute,
  forceSeedStarterRoutes,
  getAdminSecurity,
  removeAuthorizedAdmin,
  saveAdminSecurity,
  seedStarterRoutesIfNeeded,
  subscribeAllRoutesAdmin,
  subscribeAuthorizedAdmins,
  toggleRoutePublished,
  updateRoute,
} from '../lib/routesService';
import {
  ADMIN_EMAIL,
  AuthorizedAdminItem,
  DIFFICULTIES,
  MODE_LABELS,
  RouteDifficulty,
  RouteFormData,
  RouteItem,
  RouteMode,
} from '../types/route';
import { ArticleRenderer } from './ArticleRenderer';
import { EditorialImage } from './EditorialImage';

interface AdminPanelProps {
  user: User | null;
  authReady: boolean;
  onPreviewRoute: (routeId: string) => void;
  onExitAdmin: () => void;
}

const EMPTY_FORM: RouteFormData = {
  title: '',
  comarca: '',
  introduction: '',
  coverImage: '/src/assets/images/hero_catalonia_pyrenees_1794834007028.jpg',
  modes: ['coche'],
  otherModeDetail: '',
  distanceKm: '',
  duration: '',
  difficulty: 'Moderada',
  startPoint: '',
  elevationGain: '',
  wikilocUrl: '',
  googleMapsUrl: '',
  articleBody: '',
  recommendations: '',
  tips: '',
  published: true,
};

function routeToForm(route: RouteItem): RouteFormData {
  return {
    title: route.title,
    comarca: route.comarca,
    introduction: route.introduction,
    coverImage: route.coverImage,
    modes: route.modes.length > 0 ? route.modes : ['coche'],
    otherModeDetail: route.otherModeDetail || '',
    distanceKm: String(route.distanceKm),
    duration: route.duration,
    difficulty: route.difficulty,
    startPoint: route.startPoint || '',
    elevationGain: route.elevationGain || '',
    wikilocUrl: route.wikilocUrl,
    googleMapsUrl: route.googleMapsUrl,
    articleBody: route.articleBody,
    recommendations: route.recommendations,
    tips: route.tips,
    published: route.published,
  };
}

const UNLOCK_STORAGE_KEY = 'rcat_admin_unlocked';

export function AdminPanel({
  user,
  authReady,
  onPreviewRoute,
  onExitAdmin,
}: AdminPanelProps) {
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // Layer 1b: Checking primary or delegated authorization
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState<boolean | undefined>(undefined);

  // Layer 2: Master Password state
  const [securityRecord, setSecurityRecord] = useState<AdminSecurityRecord | null | undefined>(
    undefined
  );
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(UNLOCK_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [savingPassword, setSavingPassword] = useState(false);

  // Admin routes state
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState<'all' | RouteMode>('all');

  // Authorized admins management (primary owner only)
  const [authorizedAdmins, setAuthorizedAdmins] = useState<AuthorizedAdminItem[]>([]);
  const [showAdminsModal, setShowAdminsModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminLabel, setNewAdminLabel] = useState('');
  const [adminManageError, setAdminManageError] = useState<string | null>(null);
  const [savingAdminUser, setSavingAdminUser] = useState(false);

  // Editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<RouteFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [savingRoute, setSavingRoute] = useState(false);
  const [articlePreview, setArticlePreview] = useState(false);

  // Inline image insertion modal state
  const [showInlineImageModal, setShowInlineImageModal] = useState(false);
  const [inlineImageUrl, setInlineImageUrl] = useState('');
  const [inlineImageCaption, setInlineImageCaption] = useState('');
  const [inlineImageError, setInlineImageError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const articleTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Delete confirmation & change password modals
  const [confirmDeleteRoute, setConfirmDeleteRoute] = useState<RouteItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newMasterPass, setNewMasterPass] = useState('');
  const [confirmNewMasterPass, setConfirmNewMasterPass] = useState('');
  const [changePassMsg, setChangePassMsg] = useState<string | null>(null);

  const isPrimaryAdmin =
    Boolean(user) &&
    user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
    user?.emailVerified === true;

  // Verify primary or delegated admin permissions
  useEffect(() => {
    if (!authReady) return;
    if (!user || !user.emailVerified) {
      setIsAuthorizedAdmin(false);
      return;
    }
    let cancelled = false;
    setIsAuthorizedAdmin(undefined);
    checkUserIsAuthorizedAdmin(user.email)
      .then((allowed) => {
        if (!cancelled) {
          setIsAuthorizedAdmin(allowed);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAuthorizedAdmin(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, user]);

  // Countdown tick during lockout
  useEffect(() => {
    if (lockoutUntil <= Date.now()) {
      return;
    }
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => window.clearInterval(timer);
  }, [lockoutUntil]);

  // Fetch admin security record when authorized Google user signs in
  useEffect(() => {
    if (isAuthorizedAdmin !== true) {
      setSecurityRecord(undefined);
      return;
    }
    let cancelled = false;
    getAdminSecurity()
      .then((rec) => {
        if (!cancelled) {
          setSecurityRecord(rec);
          if (!rec) {
            setIsUnlocked(false);
            sessionStorage.removeItem(UNLOCK_STORAGE_KEY);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPasswordError(err instanceof Error ? err.message : 'Error de seguridad.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthorizedAdmin]);

  // Subscribe to all routes & auto-seed starter catalog on first admin unlock
  useEffect(() => {
    if (isAuthorizedAdmin !== true || !isUnlocked || !user?.email) {
      return;
    }
    setLoadingRoutes(true);
    void seedStarterRoutesIfNeeded(user.uid, user.email).catch((err) => {
      setRoutesError(err instanceof Error ? err.message : 'No se pudieron inicializar las rutas.');
    });

    const unsubRoutes = subscribeAllRoutesAdmin(
      user.email,
      isPrimaryAdmin,
      (items) => {
        setRoutes(items);
        setLoadingRoutes(false);
        setRoutesError(null);
      },
      (err) => {
        setRoutesError(err.message);
        setLoadingRoutes(false);
      }
    );

    let unsubAdmins: (() => void) | undefined;
    if (isPrimaryAdmin) {
      unsubAdmins = subscribeAuthorizedAdmins(
        (list) => setAuthorizedAdmins(list),
        () => {
          // Non-fatal
        }
      );
    }

    return () => {
      unsubRoutes();
      unsubAdmins?.();
    };
  }, [isAuthorizedAdmin, isUnlocked, isPrimaryAdmin, user]);

  async function handleGoogleSignIn() {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar sesión con Google.'
      );
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    try {
      sessionStorage.removeItem(UNLOCK_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
    setIsUnlocked(false);
    setPasswordInput('');
    await signOut(auth);
  }

  function handleLockPanel() {
    try {
      sessionStorage.removeItem(UNLOCK_STORAGE_KEY);
    } catch {
      // ignore
    }
    setIsUnlocked(false);
    setPasswordInput('');
    setPasswordError(null);
  }

  async function handleCreateMasterPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !isPrimaryAdmin) return;
    setPasswordError(null);

    if (passwordInput.length < 8) {
      setPasswordError('La contraseña maestra debe tener al menos 8 caracteres.');
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    setSavingPassword(true);
    try {
      const salt = generateSalt();
      const digest = await hashPassword(passwordInput, salt);
      await saveAdminSecurity(digest, salt, user.uid);
      setSecurityRecord({ passwordHash: digest, salt });
      setIsUnlocked(true);
      sessionStorage.setItem(UNLOCK_STORAGE_KEY, '1');
      setPasswordInput('');
      setConfirmPasswordInput('');
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : 'Error al guardar la contraseña.'
      );
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleUnlockWithPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!securityRecord) return;
    if (Date.now() < lockoutUntil) {
      return;
    }
    setPasswordError(null);

    const candidateHash = await hashPassword(passwordInput, securityRecord.salt);
    if (candidateHash === securityRecord.passwordHash) {
      setIsUnlocked(true);
      setFailedAttempts(0);
      setPasswordInput('');
      try {
        sessionStorage.setItem(UNLOCK_STORAGE_KEY, '1');
      } catch {
        // ignore
      }
      return;
    }

    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    setPasswordInput('');
    if (nextAttempts >= 5) {
      setLockoutUntil(Date.now() + 30000);
      setNowMs(Date.now());
      setPasswordError('Demasiados intentos fallidos. Acceso bloqueado durante 30 segundos.');
    } else {
      setPasswordError(
        `Contraseña incorrecta (${nextAttempts}/5 intentos antes del bloqueo temporal).`
      );
    }
  }

  async function handleChangeMasterPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !isPrimaryAdmin) return;
    setChangePassMsg(null);
    if (newMasterPass.length < 8) {
      setChangePassMsg('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newMasterPass !== confirmNewMasterPass) {
      setChangePassMsg('Las contraseñas no coinciden.');
      return;
    }
    setSavingPassword(true);
    try {
      const salt = generateSalt();
      const digest = await hashPassword(newMasterPass, salt);
      await saveAdminSecurity(digest, salt, user.uid);
      setSecurityRecord({ passwordHash: digest, salt });
      setNewMasterPass('');
      setConfirmNewMasterPass('');
      setShowChangePasswordModal(false);
      setFormSuccess('Contraseña maestra actualizada correctamente.');
    } catch (err) {
      setChangePassMsg(err instanceof Error ? err.message : 'No se pudo actualizar.');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleAddAuthorizedAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !isPrimaryAdmin) return;
    setAdminManageError(null);

    const email = newAdminEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAdminManageError('Introduce un correo electrónico válido.');
      return;
    }
    if (email === ADMIN_EMAIL.toLowerCase()) {
      setAdminManageError('Tu cuenta principal ya es administradora propietaria.');
      return;
    }

    setSavingAdminUser(true);
    try {
      await addAuthorizedAdmin(email, newAdminLabel, user.uid);
      setNewAdminEmail('');
      setNewAdminLabel('');
    } catch (err) {
      setAdminManageError(
        err instanceof Error ? err.message : 'No se pudo autorizar la cuenta.'
      );
    } finally {
      setSavingAdminUser(false);
    }
  }

  function startNewRoute() {
    setEditingId(null);
    setIsCreating(true);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormSuccess(null);
    setArticlePreview(false);
  }

  function startEditRoute(route: RouteItem) {
    setEditingId(route.id);
    setIsCreating(false);
    setForm(routeToForm(route));
    setFormError(null);
    setFormSuccess(null);
    setArticlePreview(false);
  }

  function cancelEditing() {
    setEditingId(null);
    setIsCreating(false);
    setFormError(null);
  }

  function toggleMode(mode: RouteMode) {
    setForm((prev) => {
      const exists = prev.modes.includes(mode);
      if (exists) {
        if (prev.modes.length === 1) return prev;
        return { ...prev, modes: prev.modes.filter((m) => m !== mode) };
      }
      return { ...prev, modes: [...prev.modes, mode] };
    });
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError(null);
    setUploadingImage(true);
    try {
      const compressed = await compressImageFile(file);
      setForm((prev) => ({ ...prev, coverImage: compressed }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo procesar la portada.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  }

  async function handleInlineUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setInlineImageError(null);
    setUploadingImage(true);
    try {
      const compressed = await compressImageFile(file, 960, 0.72);
      setInlineImageUrl(compressed);
    } catch (err) {
      setInlineImageError(err instanceof Error ? err.message : 'Error al comprimir imagen.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  }

  function insertMarkdownSnippet(prefix: string, suffix = '') {
    const textarea = articleTextareaRef.current;
    if (!textarea) {
      setForm((prev) => ({ ...prev, articleBody: `${prev.articleBody}\n${prefix}${suffix}` }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form.articleBody.slice(start, end) || 'texto';
    const nextValue =
      form.articleBody.slice(0, start) + prefix + selected + suffix + form.articleBody.slice(end);
    setForm((prev) => ({ ...prev, articleBody: nextValue }));
    requestAnimationFrame(() => {
      textarea.focus();
    });
  }

  function insertInlineImageToArticle() {
    if (!inlineImageUrl.trim()) {
      setInlineImageError('Sube una imagen o introduce una URL válida.');
      return;
    }
    const caption = inlineImageCaption.trim() || 'Detalle de la ruta';
    const markdown = `\n\n![${caption}](${inlineImageUrl.trim()})\n\n`;
    const textarea = articleTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const next =
        form.articleBody.slice(0, start) + markdown + form.articleBody.slice(start);
      setForm((prev) => ({ ...prev, articleBody: next }));
    } else {
      setForm((prev) => ({ ...prev, articleBody: prev.articleBody + markdown }));
    }
    setInlineImageUrl('');
    setInlineImageCaption('');
    setInlineImageError(null);
    setShowInlineImageModal(false);
  }

  async function handleSaveRoute(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    setFormError(null);
    setFormSuccess(null);

    if (form.title.trim().length < 3) {
      setFormError('El título debe tener al menos 3 caracteres.');
      return;
    }
    if (form.comarca.trim().length < 2) {
      setFormError('Indica la comarca o zona de Cataluña.');
      return;
    }
    if (form.introduction.trim().length < 10) {
      setFormError('La introducción debe tener al menos 10 caracteres.');
      return;
    }
    if (!form.coverImage.trim()) {
      setFormError('Añade una imagen de portada (URL o subida).');
      return;
    }
    if (form.modes.length === 0) {
      setFormError('Selecciona al menos una modalidad en la ficha técnica.');
      return;
    }
    const km = Number(String(form.distanceKm).replace(',', '.'));
    if (!Number.isFinite(km) || km <= 0 || km > 5000) {
      setFormError('Introduce una distancia válida en kilómetros (entre 0,1 y 5000).');
      return;
    }
    if (!form.duration.trim()) {
      setFormError('Indica la duración estimada.');
      return;
    }
    if (form.articleBody.trim().length < 10) {
      setFormError('El cuerpo del artículo debe tener al menos 10 caracteres.');
      return;
    }

    const estimatedBytes =
      form.coverImage.length + form.articleBody.length + form.introduction.length + 4096;
    if (estimatedBytes > 820000) {
      setFormError(
        'La ficha supera el tamaño máximo permitido (800 KB) debido a imágenes incrustadas. Usa enlaces de imagen o reduce el número de fotos subidas.'
      );
      return;
    }

    setSavingRoute(true);
    try {
      if (editingId) {
        await updateRoute(editingId, form);
        setFormSuccess('Ficha de la ruta actualizada correctamente.');
      } else {
        await createRoute(form, user.uid, user.email);
        setFormSuccess('Nueva ficha de ruta creada y clasificada automáticamente.');
      }
      setEditingId(null);
      setIsCreating(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'No se pudo guardar la ruta en Firestore.'
      );
    } finally {
      setSavingRoute(false);
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteRoute) return;
    setDeleting(true);
    try {
      await deleteRoute(confirmDeleteRoute.id);
      setConfirmDeleteRoute(null);
      setFormSuccess(`Ruta "${confirmDeleteRoute.title}" eliminada.`);
    } catch (err) {
      setRoutesError(err instanceof Error ? err.message : 'Error al eliminar la ruta.');
    } finally {
      setDeleting(false);
    }
  }

  // Gate 0: Waiting for auth initialization
  if (!authReady) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-sm text-[#5C5A54]">Verificando sesión segura...</p>
      </div>
    );
  }

  // Gate 1: Google Sign-In required
  if (!user) {
    return (
      <section className="max-w-lg mx-auto px-4 py-16 sm:py-24">
        <button
          type="button"
          onClick={onExitAdmin}
          className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-[#5C5A54] hover:text-[#161614] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al blog
        </button>

        <div className="border border-[#E4E1DA] bg-white p-8 sm:p-10">
          <div className="w-10 h-10 border border-[#E4E1DA] flex items-center justify-center text-[#14532D] mb-6">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="font-serif text-3xl font-medium text-[#161614]">
            Acceso de administración
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#5C5A54]">
            Zona restringida para añadir, editar o eliminar fichas de rutas. Verifica tu cuenta de Google autorizada y posteriormente introduce la contraseña maestra.
          </p>

          {authError && (
            <div className="mt-5 p-3.5 border border-red-300 bg-red-50 text-xs text-red-800">
              {authError}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="mt-7 w-full py-3 px-4 bg-[#161614] text-white text-sm font-medium hover:bg-[#14532D] transition-colors cursor-pointer disabled:opacity-60"
          >
            {signingIn ? 'Verificando identidad...' : 'Iniciar sesión con Google'}
          </button>
        </div>
      </section>
    );
  }

  // Gate 1b: Checking authorization
  if (isAuthorizedAdmin === undefined) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-sm text-[#5C5A54]">Comprobando permisos de administrador...</p>
      </div>
    );
  }

  // Gate 1c: Unauthorized Google account
  if (!isAuthorizedAdmin) {
    return (
      <section className="max-w-lg mx-auto px-4 py-16 sm:py-24">
        <button
          type="button"
          onClick={onExitAdmin}
          className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-[#5C5A54] hover:text-[#161614] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al blog
        </button>

        <div className="border border-red-200 bg-white p-8 sm:p-10">
          <div className="w-10 h-10 border border-red-200 bg-red-50 flex items-center justify-center text-red-700 mb-6">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h1 className="font-serif text-2xl font-medium text-[#161614]">
            Acceso no autorizado
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#5C5A54]">
            La cuenta <span className="font-mono text-[#161614]">{user.email}</span> no figura en la lista de administradores autorizados para editar este blog.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 border border-[#E4E1DA] text-xs font-medium text-[#161614] hover:bg-[#F2F0EB] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión e intentar con otra cuenta
          </button>
        </div>
      </section>
    );
  }

  // Gate 2: Loading security record
  if (securityRecord === undefined) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-sm text-[#5C5A54]">Comprobando bóveda de seguridad...</p>
      </div>
    );
  }

  // Gate 2a: First-time setup or Unlock with Master Password
  if (!isUnlocked) {
    const isInitialSetup = securityRecord === null;
    const remainingLockSeconds = Math.max(0, Math.ceil((lockoutUntil - nowMs) / 1000));

    if (isInitialSetup && !isPrimaryAdmin) {
      return (
        <section className="max-w-lg mx-auto px-4 py-16 sm:py-24">
          <div className="border border-[#E4E1DA] bg-white p-8 sm:p-10">
            <h1 className="font-serif text-2xl font-medium text-[#161614]">
              Panel pendiente de configuración inicial
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#5C5A54]">
              La cuenta propietaria principal debe acceder primero para establecer la contraseña maestra del panel de administración.
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-6 px-4 py-2 border border-[#E4E1DA] text-xs font-medium text-[#161614] cursor-pointer"
            >
              Cerrar sesión
            </button>
          </div>
        </section>
      );
    }

    return (
      <section className="max-w-lg mx-auto px-4 py-16 sm:py-24">
        <button
          type="button"
          onClick={onExitAdmin}
          className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-[#5C5A54] hover:text-[#161614] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al blog
        </button>

        <div className="border border-[#E4E1DA] bg-white p-8 sm:p-10">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="w-10 h-10 border border-[#E4E1DA] flex items-center justify-center text-[#14532D]">
              <KeyRound className="w-5 h-5" />
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-[#5C5A54] hover:text-[#161614] underline underline-offset-4 cursor-pointer"
            >
              Cerrar sesión
            </button>
          </div>

          <h1 className="font-serif text-3xl font-medium text-[#161614]">
            {isInitialSetup
              ? 'Configura tu contraseña maestra'
              : 'Introduce la contraseña de acceso'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#5C5A54]">
            {isInitialSetup
              ? 'Establece una contraseña protegida (mínimo 8 caracteres). Se almacenará cifrada con SHA-256 y sal criptográfica para blindar el acceso al editor.'
              : `Cuenta verificada (${user.email}). Introduce la contraseña maestra para desbloquear el gestor de rutas.`}
          </p>

          <form
            onSubmit={isInitialSetup ? handleCreateMasterPassword : handleUnlockWithPassword}
            className="mt-6 space-y-4"
          >
            <div>
              <label
                htmlFor="admin-master-password"
                className="block text-xs font-medium text-[#161614] mb-1.5"
              >
                Contraseña maestra
              </label>
              <div className="relative">
                <input
                  id="admin-master-password"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  disabled={remainingLockSeconds > 0}
                  required
                  minLength={8}
                  autoComplete={isInitialSetup ? 'new-password' : 'current-password'}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-3.5 py-2.5 pr-10 border border-[#D4D0C7] bg-[#FAFAF8] text-sm text-[#161614] focus:outline-none focus:border-[#14532D]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5C5A54] hover:text-[#161614] p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isInitialSetup && (
              <div>
                <label
                  htmlFor="admin-master-password-confirm"
                  className="block text-xs font-medium text-[#161614] mb-1.5"
                >
                  Repite la contraseña maestra
                </label>
                <input
                  id="admin-master-password-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 border border-[#D4D0C7] bg-[#FAFAF8] text-sm text-[#161614] focus:outline-none focus:border-[#14532D]"
                />
              </div>
            )}

            {passwordError && (
              <div className="p-3 border border-red-300 bg-red-50 text-xs text-red-800">
                {passwordError}
                {remainingLockSeconds > 0 && (
                  <span className="block mt-1 font-mono tabular-nums">
                    Espera {remainingLockSeconds}s para volver a intentarlo.
                  </span>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={savingPassword || remainingLockSeconds > 0}
              className="w-full py-3 px-4 bg-[#14532D] text-white text-sm font-medium hover:bg-[#0F3F22] transition-colors cursor-pointer disabled:opacity-50"
            >
              {savingPassword
                ? 'Guardando protección...'
                : isInitialSetup
                ? 'Guardar contraseña y entrar'
                : 'Desbloquear panel'}
            </button>
          </form>
        </div>
      </section>
    );
  }

  // Unlocked Admin Workspace
  const filteredAdminRoutes =
    modeFilter === 'all' ? routes : routes.filter((r) => r.modes.includes(modeFilter));

  const showEditor = isCreating || editingId !== null;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Top Admin Header */}
      <div className="pb-6 border-b border-[#E4E1DA] flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <span className="text-xs text-[#14532D] font-medium">
            {isPrimaryAdmin ? 'Propietario principal' : 'Administrador autorizado'} · {user.email}
          </span>
          <h1 className="mt-1 font-serif text-3xl sm:text-4xl font-medium text-[#161614]">
            Gestor de rutas por Cataluña
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!showEditor && (
            <button
              type="button"
              onClick={startNewRoute}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#14532D] text-white text-xs font-medium hover:bg-[#0F3F22] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nueva ficha de ruta
            </button>
          )}
          {isPrimaryAdmin && (
            <button
              type="button"
              onClick={() => {
                setAdminManageError(null);
                setShowAdminsModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-[#E4E1DA] bg-white text-xs font-medium text-[#161614] hover:bg-[#F2F0EB] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Users className="w-3.5 h-3.5" />
              Cuentas autorizadas ({authorizedAdmins.length + 1})
            </button>
          )}
          {isPrimaryAdmin && (
            <button
              type="button"
              onClick={() => {
                setChangePassMsg(null);
                setShowChangePasswordModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-[#E4E1DA] bg-white text-xs font-medium text-[#161614] hover:bg-[#F2F0EB] transition-colors cursor-pointer whitespace-nowrap"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Cambiar contraseña
            </button>
          )}
          <button
            type="button"
            onClick={handleLockPanel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-[#E4E1DA] bg-white text-xs font-medium text-[#161614] hover:bg-[#F2F0EB] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Unlock className="w-3.5 h-3.5" />
            Bloquear
          </button>
          <button
            type="button"
            onClick={onExitAdmin}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-[#E4E1DA] bg-white text-xs font-medium text-[#5C5A54] hover:text-[#161614] hover:bg-[#F2F0EB] transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Ver blog
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-[#E4E1DA] bg-white text-xs font-medium text-[#5C5A54] hover:text-[#161614] hover:bg-[#F2F0EB] transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        </div>
      </div>

      {formSuccess && (
        <div className="mt-6 p-4 border border-[#14532D]/30 bg-[#14532D]/5 text-sm text-[#14532D] flex items-center justify-between gap-4">
          <span>{formSuccess}</span>
          <button
            type="button"
            onClick={() => setFormSuccess(null)}
            className="text-xs underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {routesError && (
        <div className="mt-6 p-4 border border-red-300 bg-red-50 text-sm text-red-800">
          {routesError}
        </div>
      )}

      {/* EDITOR FORM */}
      {showEditor ? (
        <form onSubmit={handleSaveRoute} className="mt-8 space-y-10">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-serif text-2xl font-medium text-[#161614]">
              {editingId ? 'Editar ficha de ruta' : 'Añadir nueva ficha de ruta'}
            </h2>
            <button
              type="button"
              onClick={cancelEditing}
              className="px-4 py-2 border border-[#E4E1DA] bg-white text-xs font-medium text-[#5C5A54] hover:text-[#161614] cursor-pointer"
            >
              Cancelar y volver al listado
            </button>
          </div>

          {formError && (
            <div className="p-4 border border-red-300 bg-red-50 text-sm text-red-800">
              {formError}
            </div>
          )}

          {/* Sección 1: Título e introducción */}
          <div className="border border-[#E4E1DA] bg-white p-6 sm:p-8 space-y-6">
            <div className="pb-4 border-b border-[#E4E1DA] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-xl font-medium text-[#161614]">
                  1. Título e introducción
                </h3>
                <p className="text-xs text-[#5C5A54] mt-0.5">
                  Encabezado editorial, comarca y fotografía principal de la salida.
                </p>
              </div>
              <label className="inline-flex items-center gap-2.5 text-xs font-medium text-[#161614] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm((p) => ({ ...p, published: e.target.checked }))}
                  className="w-4 h-4 accent-[#14532D]"
                />
                Publicada en el blog
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-[#161614] mb-1.5">
                  Título de la ruta *
                </label>
                <input
                  type="text"
                  required
                  maxLength={140}
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ej. Coll de Pal y bosques del Cadí-Moixeró"
                  className="w-full px-3.5 py-2.5 border border-[#D4D0C7] bg-[#FAFAF8] text-sm focus:outline-none focus:border-[#14532D]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#161614] mb-1.5">
                  Comarca o zona *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={form.comarca}
                  onChange={(e) => setForm((p) => ({ ...p, comarca: e.target.value }))}
                  placeholder="Ej. Berguedà"
                  className="w-full px-3.5 py-2.5 border border-[#D4D0C7] bg-[#FAFAF8] text-sm focus:outline-none focus:border-[#14532D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#161614] mb-1.5">
                Introducción *
              </label>
              <textarea
                required
                rows={3}
                maxLength={1200}
                value={form.introduction}
                onChange={(e) => setForm((p) => ({ ...p, introduction: e.target.value }))}
                placeholder="Resumen introductorio que presenta el carácter de la ruta y su atractivo principal..."
                className="w-full px-3.5 py-2.5 border border-[#D4D0C7] bg-[#FAFAF8] text-sm leading-relaxed focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              <div className="md:col-span-8 space-y-3">
                <label className="block text-xs font-medium text-[#161614]">
                  Imagen de portada (URL o subir archivo) *
                </label>
                <input
                  type="text"
                  value={form.coverImage}
                  onChange={(e) => setForm((p) => ({ ...p, coverImage: e.target.value }))}
                  placeholder="https://... o sube una foto desde tu ordenador"
                  className="w-full px-3.5 py-2.5 border border-[#D4D0C7] bg-[#FAFAF8] text-xs font-mono focus:outline-none focus:border-[#14532D]"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 border border-[#D4D0C7] bg-[#FAFAF8] hover:bg-[#F2F0EB] text-xs font-medium text-[#161614] cursor-pointer transition-colors">
                    <ImagePlus className="w-4 h-4 text-[#14532D]" />
                    {uploadingImage ? 'Comprimiendo...' : 'Subir foto desde dispositivo'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="sr-only"
                    />
                  </label>
                  <span className="text-[11px] text-[#5C5A54]">
                    Se optimiza automáticamente para carga rápida.
                  </span>
                </div>
              </div>
              <div className="md:col-span-4 border border-[#E4E1DA] bg-[#F2F0EB] aspect-[4/3] overflow-hidden">
                <EditorialImage
                  src={form.coverImage}
                  alt="Vista previa de portada"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Ficha técnica de la ruta */}
          <div className="border border-[#E4E1DA] bg-white p-6 sm:p-8 space-y-6">
            <div className="pb-4 border-b border-[#E4E1DA]">
              <h3 className="font-serif text-xl font-medium text-[#161614]">
                2. Ficha técnica de la ruta
              </h3>
              <p className="text-xs text-[#5C5A54] mt-0.5">
                Al marcar coche, moto o a pie, la ruta se clasificará automáticamente en esas subpáginas.
              </p>
            </div>

            <div>
              <span className="block text-xs font-medium text-[#161614] mb-2.5">
                ¿Cómo puede realizarse esta ruta? (Puedes elegir varias opciones) *
              </span>
              <div className="flex flex-wrap gap-3">
                {(['coche', 'moto', 'a_pie', 'otros'] as RouteMode[]).map((mode) => {
                  const active = form.modes.includes(mode);
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => toggleMode(mode)}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#14532D] border-[#14532D] text-white'
                          : 'bg-[#FAFAF8] border-[#D4D0C7] text-[#161614] hover:border-[#14532D]'
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5" />}
                      {MODE_LABELS[mode]}
                    </button>
                  );
                })}
              </div>

              {form.modes.includes('otros') && (
                <div className="mt-3 max-w-md">
                  <input
                    type="text"
                    maxLength={120}
                    value={form.otherModeDetail}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, otherModeDetail: e.target.value }))
                    }
                    placeholder="Especifica otro medio (ej. BTT, gravel, autocaravana...)"
                    className="w-full px-3.5 py-2 border border-[#D4D0C7] bg-[#FAFAF8] text-xs focus:outline-none focus:border-[#14532D]"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#161614] mb-1.5">
                  Distancia total (km) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5000"
                  required
                  value={form.distanceKm}
                  onChange={(e) => setForm((p) => ({ ...p, distanceKm: e.target.value }))}
                  placeholder="Ej. 64.5"
                  className="w-full px-3.5 py-2.5 border border-[#D4D0C7] bg-[#FAFAF8] text-sm font-mono tabular-nums focus:outline-none focus:border-[#14532D]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#161614] mb-1.5">
                  Duración estimada *
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={form.duration}
                  onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
                  placeholder="Ej. 2 h 30 min"
                  className="w-full px-3.5 py-2.5 border border-[#D4D0C7] bg-[#FAFAF8] text-sm focus:outline-none focus:border-[#14532D]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#161614] mb-1.5">
                  Dificultad *
                </label>
                <select
                  value={form.difficulty}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, difficulty: e.target.value as RouteDifficulty }))
                  }
                  className="w-full px-3.5 py-2.5 border border-[#D4D0C7] bg-[#FAFAF8] text-sm focus:outline-none focus:border-[#14532D]"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#161614] mb-1.5">
                  Punto de inicio
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={form.startPoint}
                  onChange={(e) => setForm((p) => ({ ...p, startPoint: e.target.value }))}
                  placeholder="Ej. Bagà"
                  className="w-full px-3.5 py-2.5 border border-[#D4D0C7] bg-[#FAFAF8] text-sm focus:outline-none focus:border-[#14532D]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#161614] mb-1.5">
                  Desnivel (opcional)
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={form.elevationGain}
                  onChange={(e) => setForm((p) => ({ ...p, elevationGain: e.target.value }))}
                  placeholder="Ej. +950 m"
                  className="w-full px-3.5 py-2.5 border border-[#D4D0C7] bg-[#FAFAF8] text-sm font-mono focus:outline-none focus:border-[#14532D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-xs font-medium text-[#161614] mb-1.5">
                  Mapa de Wikiloc (URL de la ruta o código &lt;iframe&gt;)
                </label>
                <input
                  type="text"
                  maxLength={2000}
                  value={form.wikilocUrl}
                  onChange={(e) => setForm((p) => ({ ...p, wikilocUrl: e.target.value }))}
                  placeholder="https://es.wikiloc.com/rutas-..."
                  className="w-full px-3.5 py-2.5 border border-[#D4D0C7] bg-[#FAFAF8] text-xs font-mono focus:outline-none focus:border-[#14532D]"
                />
                <p className="mt-1 text-[11px] text-[#5C5A54]">
                  Pega el enlace de Wikiloc o el iframe de inserción para incrustar el mapa automáticamente.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#161614] mb-1.5">
                  Mapa de Google Maps (URL, lugar o código &lt;iframe&gt;)
                </label>
                <input
                  type="text"
                  maxLength={2000}
                  value={form.googleMapsUrl}
                  onChange={(e) => setForm((p) => ({ ...p, googleMapsUrl: e.target.value }))}
                  placeholder="https://www.google.com/maps/place/... o nombre del lugar"
                  className="w-full px-3.5 py-2.5 border border-[#D4D0C7] bg-[#FAFAF8] text-xs font-mono focus:outline-none focus:border-[#14532D]"
                />
                <p className="mt-1 text-[11px] text-[#5C5A54]">
                  Acepta enlaces de Google Maps, coordenadas, nombres de lugar o código iframe.
                </p>
              </div>
            </div>
          </div>

          {/* Sección 3: Cuerpo del artículo */}
          <div className="border border-[#E4E1DA] bg-white p-6 sm:p-8 space-y-5">
            <div className="pb-4 border-b border-[#E4E1DA] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-xl font-medium text-[#161614]">
                  3. Cuerpo del artículo
                </h3>
                <p className="text-xs text-[#5C5A54] mt-0.5">
                  Crónica libre de la salida. Puedes añadir subtítulos, listas, citas e imágenes intercaladas.
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-[#F2F0EB]">
                <button
                  type="button"
                  onClick={() => setArticlePreview(false)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    !articlePreview ? 'bg-white text-[#161614]' : 'text-[#5C5A54]'
                  }`}
                >
                  Escribir
                </button>
                <button
                  type="button"
                  onClick={() => setArticlePreview(true)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    articlePreview ? 'bg-white text-[#161614]' : 'text-[#5C5A54]'
                  }`}
                >
                  Vista previa
                </button>
              </div>
            </div>

            {!articlePreview ? (
              <>
                <div className="flex flex-wrap items-center gap-2 pb-2">
                  <button
                    type="button"
                    onClick={() => insertMarkdownSnippet('\n## ', '\n')}
                    className="px-2.5 py-1.5 border border-[#E4E1DA] bg-[#FAFAF8] hover:bg-[#F2F0EB] text-xs font-medium cursor-pointer"
                  >
                    Subtítulo
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdownSnippet('**', '**')}
                    className="px-2.5 py-1.5 border border-[#E4E1DA] bg-[#FAFAF8] hover:bg-[#F2F0EB] text-xs font-semibold cursor-pointer"
                  >
                    Negrita
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdownSnippet('*', '*')}
                    className="px-2.5 py-1.5 border border-[#E4E1DA] bg-[#FAFAF8] hover:bg-[#F2F0EB] text-xs italic cursor-pointer"
                  >
                    Cursiva
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdownSnippet('\n- ', '')}
                    className="px-2.5 py-1.5 border border-[#E4E1DA] bg-[#FAFAF8] hover:bg-[#F2F0EB] text-xs cursor-pointer"
                  >
                    Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdownSnippet('\n> ', '\n')}
                    className="px-2.5 py-1.5 border border-[#E4E1DA] bg-[#FAFAF8] hover:bg-[#F2F0EB] text-xs cursor-pointer"
                  >
                    Cita destacada
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInlineImageError(null);
                      setShowInlineImageModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#14532D] bg-[#14532D]/5 text-[#14532D] hover:bg-[#14532D] hover:text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    Adjuntar imagen al texto
                  </button>
                </div>

                <textarea
                  ref={articleTextareaRef}
                  required
                  rows={14}
                  value={form.articleBody}
                  onChange={(e) => setForm((p) => ({ ...p, articleBody: e.target.value }))}
                  placeholder="Describe el recorrido paso a paso, miradores, tramos más bonitos y anécdotas de la salida..."
                  className="w-full p-4 border border-[#D4D0C7] bg-[#FAFAF8] text-sm leading-relaxed font-sans focus:outline-none focus:border-[#14532D]"
                />
              </>
            ) : (
              <div className="p-6 border border-[#E4E1DA] bg-[#FAFAF8]">
                {form.articleBody.trim() ? (
                  <ArticleRenderer content={form.articleBody} />
                ) : (
                  <p className="text-sm text-[#5C5A54]">
                    Escribe contenido en el artículo para previsualizar el formato editorial.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Secciones 4 y 5: Recomendaciones y Consejos finales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-[#E4E1DA] bg-white p-6 sm:p-8 space-y-3">
              <h3 className="font-serif text-xl font-medium text-[#161614]">
                4. Apartado de recomendaciones
              </h3>
              <p className="text-xs text-[#5C5A54]">
                Mejor época del año, paradas recomendadas, restaurantes o miradores.
              </p>
              <textarea
                rows={6}
                maxLength={15000}
                value={form.recommendations}
                onChange={(e) => setForm((p) => ({ ...p, recommendations: e.target.value }))}
                placeholder="Ej. Parar a desayunar en el refugio o visitar el mirador al atardecer..."
                className="w-full p-3.5 border border-[#D4D0C7] bg-[#FAFAF8] text-sm leading-relaxed focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div className="border border-[#E4E1DA] bg-white p-6 sm:p-8 space-y-3">
              <h3 className="font-serif text-xl font-medium text-[#161614]">
                5. Apartado final de consejos
              </h3>
              <p className="text-xs text-[#5C5A54]">
                Seguridad, aparcamiento, gasolina, agua, estado del asfalto o sendero.
              </p>
              <textarea
                rows={6}
                maxLength={15000}
                value={form.tips}
                onChange={(e) => setForm((p) => ({ ...p, tips: e.target.value }))}
                placeholder="Ej. Llevar agua suficiente, revisar gasolineras abiertas en festivos..."
                className="w-full p-3.5 border border-[#D4D0C7] bg-[#FAFAF8] text-sm leading-relaxed focus:outline-none focus:border-[#14532D]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={cancelEditing}
              className="px-5 py-3 border border-[#E4E1DA] bg-white text-sm font-medium text-[#5C5A54] hover:text-[#161614] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingRoute}
              className="px-6 py-3 bg-[#14532D] text-white text-sm font-medium hover:bg-[#0F3F22] transition-colors cursor-pointer disabled:opacity-50"
            >
              {savingRoute
                ? 'Guardando ficha...'
                : editingId
                ? 'Guardar cambios de la ruta'
                : 'Publicar ficha de ruta'}
            </button>
          </div>
        </form>
      ) : (
        /* ROUTE MANAGEMENT LIST */
        <div className="mt-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F2F0EB]">
              {(['all', 'coche', 'moto', 'a_pie', 'otros'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setModeFilter(tab)}
                  className={`px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    modeFilter === tab
                      ? 'bg-white text-[#161614]'
                      : 'text-[#5C5A54] hover:text-[#161614]'
                  }`}
                >
                  {tab === 'all' ? `Todas (${routes.length})` : MODE_LABELS[tab]}
                </button>
              ))}
            </div>

            {routes.length === 0 && !loadingRoutes && user?.email && (
              <button
                type="button"
                onClick={() => void forceSeedStarterRoutes(user.uid, user.email!)}
                className="px-4 py-2 border border-[#14532D] text-xs font-medium text-[#14532D] hover:bg-[#14532D] hover:text-white transition-colors cursor-pointer"
              >
                Importar 3 rutas de ejemplo por Cataluña
              </button>
            )}
          </div>

          {loadingRoutes ? (
            <div className="border border-[#E4E1DA] bg-white p-12 text-center text-sm text-[#5C5A54]">
              Cargando archivo de rutas...
            </div>
          ) : filteredAdminRoutes.length === 0 ? (
            <div className="border border-[#E4E1DA] bg-white p-12 text-center">
              <p className="font-serif text-xl text-[#161614]">No hay rutas en esta selección</p>
              <p className="mt-2 text-sm text-[#5C5A54]">
                Crea una nueva ficha para que aparezca automáticamente en el blog y sus subpáginas.
              </p>
              <button
                type="button"
                onClick={startNewRoute}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#14532D] text-white text-xs font-medium hover:bg-[#0F3F22] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Añadir primera ruta
              </button>
            </div>
          ) : (
            <div className="border border-[#E4E1DA] bg-white divide-y divide-[#E4E1DA]">
              {filteredAdminRoutes.map((route) => (
                <div
                  key={route.id}
                  className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-24 h-18 shrink-0 border border-[#E4E1DA] bg-[#F2F0EB] overflow-hidden hidden sm:block">
                      <EditorialImage
                        src={route.coverImage}
                        alt={route.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5C5A54]">
                        <span
                          className={`font-medium ${
                            route.published ? 'text-[#14532D]' : 'text-amber-700'
                          }`}
                        >
                          {route.published ? 'Publicada' : 'Borrador'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{route.comarca}</span>
                        <span aria-hidden="true">·</span>
                        <span>{route.modes.map((m) => MODE_LABELS[m]).join(', ')}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{route.distanceKm} km</span>
                      </div>
                      <h3 className="mt-1 font-serif text-lg font-medium text-[#161614] truncate">
                        {route.title}
                      </h3>
                      <p className="mt-1 text-xs text-[#5C5A54] line-clamp-1">
                        {route.introduction}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {route.published && (
                      <button
                        type="button"
                        onClick={() => onPreviewRoute(route.id)}
                        className="px-3 py-2 border border-[#E4E1DA] text-xs font-medium text-[#5C5A54] hover:text-[#161614] hover:bg-[#F2F0EB] transition-colors cursor-pointer"
                      >
                        Ver en blog
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void toggleRoutePublished(route.id, !route.published)}
                      className="px-3 py-2 border border-[#E4E1DA] text-xs font-medium text-[#161614] hover:bg-[#F2F0EB] transition-colors cursor-pointer"
                    >
                      {route.published ? 'Ocultar' : 'Publicar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditRoute(route)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#E4E1DA] text-xs font-medium text-[#161614] hover:bg-[#F2F0EB] transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteRoute(route)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Authorized Admin Accounts (Primary Owner Only) */}
      {showAdminsModal && isPrimaryAdmin && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E1DA] max-w-lg w-full p-6 sm:p-7 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-serif text-2xl font-medium text-[#161614]">
                  Cuentas con permiso de administrador
                </h4>
                <p className="mt-1 text-xs text-[#5C5A54]">
                  Solo las cuentas listadas aquí podrán iniciar sesión con Google y editar rutas tras introducir la contraseña maestra.
                </p>
              </div>
            </div>

            <div className="border border-[#E4E1DA] divide-y divide-[#E4E1DA] max-h-56 overflow-y-auto">
              <div className="px-4 py-3 flex items-center justify-between gap-3 bg-[#FAFAF8]">
                <div className="min-w-0">
                  <p className="text-xs font-mono text-[#161614] truncate">{ADMIN_EMAIL}</p>
                  <p className="text-[11px] text-[#14532D]">Propietario principal (permanente)</p>
                </div>
              </div>

              {authorizedAdmins.map((admin) => (
                <div
                  key={admin.id}
                  className="px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-[#161614] truncate">{admin.email}</p>
                    {admin.label && (
                      <p className="text-[11px] text-[#5C5A54]">{admin.label}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeAuthorizedAdmin(admin.id)}
                    className="px-2.5 py-1 border border-red-200 text-xs text-red-700 hover:bg-red-50 cursor-pointer shrink-0"
                  >
                    Revocar
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddAuthorizedAdmin} className="space-y-3 pt-2 border-t border-[#E4E1DA]">
              <p className="text-xs font-medium text-[#161614]">
                Autorizar nueva cuenta de Google
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="email"
                  required
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="correo@gmail.com"
                  className="px-3 py-2 border border-[#D4D0C7] bg-[#FAFAF8] text-xs font-mono focus:outline-none focus:border-[#14532D]"
                />
                <input
                  type="text"
                  maxLength={80}
                  value={newAdminLabel}
                  onChange={(e) => setNewAdminLabel(e.target.value)}
                  placeholder="Nombre o nota (opcional)"
                  className="px-3 py-2 border border-[#D4D0C7] bg-[#FAFAF8] text-xs focus:outline-none focus:border-[#14532D]"
                />
              </div>
              {adminManageError && (
                <p className="text-xs text-red-700">{adminManageError}</p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdminsModal(false)}
                  className="px-4 py-2 border border-[#E4E1DA] text-xs font-medium text-[#5C5A54] cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={savingAdminUser}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#14532D] text-white text-xs font-medium hover:bg-[#0F3F22] cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {savingAdminUser ? 'Añadiendo...' : 'Autorizar cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Insert Inline Image into Article */}
      {showInlineImageModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E1DA] max-w-md w-full p-6 space-y-4">
            <h4 className="font-serif text-xl font-medium text-[#161614]">
              Adjuntar imagen al artículo
            </h4>
            <div>
              <label className="block text-xs font-medium text-[#161614] mb-1.5">
                URL de la imagen o sube una foto
              </label>
              <input
                type="text"
                value={inlineImageUrl}
                onChange={(e) => setInlineImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-[#D4D0C7] bg-[#FAFAF8] text-xs font-mono"
              />
              <label className="mt-2.5 inline-flex items-center gap-2 px-3 py-2 border border-[#D4D0C7] bg-[#FAFAF8] hover:bg-[#F2F0EB] text-xs font-medium cursor-pointer">
                <ImagePlus className="w-3.5 h-3.5 text-[#14532D]" />
                {uploadingImage ? 'Comprimiendo...' : 'Subir archivo desde ordenador'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleInlineUpload}
                  className="sr-only"
                />
              </label>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#161614] mb-1.5">
                Pie de foto (opcional)
              </label>
              <input
                type="text"
                value={inlineImageCaption}
                onChange={(e) => setInlineImageCaption(e.target.value)}
                placeholder="Ej. Vista del valle desde el collado"
                className="w-full px-3 py-2 border border-[#D4D0C7] bg-[#FAFAF8] text-sm"
              />
            </div>
            {inlineImageError && (
              <p className="text-xs text-red-700">{inlineImageError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowInlineImageModal(false)}
                className="px-4 py-2 border border-[#E4E1DA] text-xs font-medium text-[#5C5A54] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={insertInlineImageToArticle}
                className="px-4 py-2 bg-[#14532D] text-white text-xs font-medium hover:bg-[#0F3F22] cursor-pointer"
              >
                Insertar en el texto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {confirmDeleteRoute && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E1DA] max-w-md w-full p-6 space-y-4">
            <h4 className="font-serif text-xl font-medium text-[#161614]">
              Confirmar eliminación
            </h4>
            <p className="text-sm text-[#5C5A54] leading-relaxed">
              ¿Seguro que deseas eliminar permanentemente la ruta{' '}
              <strong className="text-[#161614]">{confirmDeleteRoute.title}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteRoute(null)}
                className="px-4 py-2 border border-[#E4E1DA] text-xs font-medium text-[#5C5A54] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-700 text-white text-xs font-medium hover:bg-red-800 cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : 'Eliminar ruta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Change Master Password */}
      {showChangePasswordModal && isPrimaryAdmin && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <form
            onSubmit={handleChangeMasterPassword}
            className="bg-white border border-[#E4E1DA] max-w-md w-full p-6 space-y-4"
          >
            <h4 className="font-serif text-xl font-medium text-[#161614]">
              Cambiar contraseña maestra
            </h4>
            <div>
              <label className="block text-xs font-medium text-[#161614] mb-1.5">
                Nueva contraseña (mínimo 8 caracteres)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newMasterPass}
                onChange={(e) => setNewMasterPass(e.target.value)}
                className="w-full px-3 py-2 border border-[#D4D0C7] bg-[#FAFAF8] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#161614] mb-1.5">
                Confirmar nueva contraseña
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmNewMasterPass}
                onChange={(e) => setConfirmNewMasterPass(e.target.value)}
                className="w-full px-3 py-2 border border-[#D4D0C7] bg-[#FAFAF8] text-sm"
              />
            </div>
            {changePassMsg && <p className="text-xs text-red-700">{changePassMsg}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(false)}
                className="px-4 py-2 border border-[#E4E1DA] text-xs font-medium text-[#5C5A54] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingPassword}
                className="px-4 py-2 bg-[#14532D] text-white text-xs font-medium hover:bg-[#0F3F22] cursor-pointer"
              >
                {savingPassword ? 'Actualizando...' : 'Guardar nueva contraseña'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
