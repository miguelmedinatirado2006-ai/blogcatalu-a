import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { STARTER_ROUTES } from '../data/starterRoutes';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  ADMIN_EMAIL,
  AuthorizedAdminItem,
  RouteDifficulty,
  RouteFormData,
  RouteItem,
  RouteMode,
} from '../types/route';

function timestampToMs(val: unknown): number {
  if (val instanceof Timestamp) {
    return val.toMillis();
  }
  if (typeof val === 'number') {
    return val;
  }
  return Date.now();
}

export function emailToAdminDocId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

function docToRouteItem(id: string, data: Record<string, unknown>): RouteItem {
  return {
    id,
    title: String(data.title || ''),
    comarca: String(data.comarca || ''),
    introduction: String(data.introduction || ''),
    coverImage: String(data.coverImage || ''),
    modes: Array.isArray(data.modes) ? (data.modes as RouteMode[]) : ['coche'],
    otherModeDetail: typeof data.otherModeDetail === 'string' ? data.otherModeDetail : '',
    distanceKm: typeof data.distanceKm === 'number' ? data.distanceKm : Number(data.distanceKm) || 0,
    duration: String(data.duration || ''),
    difficulty: (data.difficulty as RouteDifficulty) || 'Moderada',
    startPoint: typeof data.startPoint === 'string' ? data.startPoint : '',
    elevationGain: typeof data.elevationGain === 'string' ? data.elevationGain : '',
    wikilocUrl: String(data.wikilocUrl || ''),
    googleMapsUrl: String(data.googleMapsUrl || ''),
    articleBody: String(data.articleBody || ''),
    recommendations: String(data.recommendations || ''),
    tips: String(data.tips || ''),
    authorId: String(data.authorId || ''),
    authorEmail: typeof data.authorEmail === 'string' ? data.authorEmail : '',
    published: Boolean(data.published),
    createdAtMs: timestampToMs(data.createdAt),
    updatedAtMs: timestampToMs(data.updatedAt),
  };
}

export async function fetchPublicCatalogInitialized(): Promise<boolean> {
  const path = 'publicMeta/status';
  try {
    const snap = await getDoc(doc(db, 'publicMeta', 'status'));
    return snap.exists() && Boolean(snap.data()?.initialized);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribePublicRoutes(
  onData: (routes: RouteItem[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'routes';
  const q = query(collection(db, 'routes'), where('published', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => docToRouteItem(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeAllRoutesAdmin(
  userEmail: string,
  isPrimary: boolean,
  onData: (routes: RouteItem[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'routes';
  if (isPrimary) {
    return onSnapshot(
      collection(db, 'routes'),
      (snapshot) => {
        const items = snapshot.docs
          .map((d) => docToRouteItem(d.id, d.data() as Record<string, unknown>))
          .sort((a, b) => b.createdAtMs - a.createdAtMs);
        onData(items);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch (wrapped) {
          onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );
  }

  // Delegated admins: combine published routes + own drafts in compliance with Query Enforcer rules
  let publishedMap = new Map<string, RouteItem>();
  let ownDraftsMap = new Map<string, RouteItem>();

  const emitMerged = () => {
    const merged = new Map<string, RouteItem>([...publishedMap, ...ownDraftsMap]);
    const list = Array.from(merged.values()).sort((a, b) => b.createdAtMs - a.createdAtMs);
    onData(list);
  };

  const unsubPub = onSnapshot(
    query(collection(db, 'routes'), where('published', '==', true)),
    (snapshot) => {
      publishedMap = new Map(
        snapshot.docs.map((d) => [d.id, docToRouteItem(d.id, d.data() as Record<string, unknown>)])
      );
      emitMerged();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  const unsubOwn = onSnapshot(
    query(collection(db, 'routes'), where('authorEmail', '==', userEmail.toLowerCase())),
    (snapshot) => {
      ownDraftsMap = new Map(
        snapshot.docs.map((d) => [d.id, docToRouteItem(d.id, d.data() as Record<string, unknown>)])
      );
      emitMerged();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  return () => {
    unsubPub();
    unsubOwn();
  };
}

function buildValidatedPayload(form: RouteFormData) {
  const cleanTitle = form.title.trim().slice(0, 140);
  const cleanComarca = form.comarca.trim().slice(0, 80);
  const cleanIntro = form.introduction.trim().slice(0, 1200);
  const cleanCover = form.coverImage.trim().slice(0, 250000);
  const validModes = Array.from(
    new Set(form.modes.filter((m): m is RouteMode => ['coche', 'moto', 'a_pie', 'otros'].includes(m)))
  ).slice(0, 4);

  const rawKm = Number(String(form.distanceKm).replace(',', '.'));
  const distanceKm = Number.isFinite(rawKm) ? Math.min(5000, Math.max(0, Math.round(rawKm * 10) / 10)) : 0;

  return {
    title: cleanTitle,
    comarca: cleanComarca,
    introduction: cleanIntro,
    coverImage: cleanCover,
    modes: validModes,
    otherModeDetail: form.modes.includes('otros') ? form.otherModeDetail.trim().slice(0, 120) : '',
    distanceKm,
    duration: form.duration.trim().slice(0, 60),
    difficulty: form.difficulty,
    startPoint: form.startPoint.trim().slice(0, 120),
    elevationGain: form.elevationGain.trim().slice(0, 60),
    wikilocUrl: form.wikilocUrl.trim().slice(0, 2000),
    googleMapsUrl: form.googleMapsUrl.trim().slice(0, 2000),
    articleBody: form.articleBody.trim().slice(0, 450000),
    recommendations: form.recommendations.trim().slice(0, 15000),
    tips: form.tips.trim().slice(0, 15000),
    published: Boolean(form.published),
  };
}

function slugifyId(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || 'ruta'}-${suffix}`;
}

export async function markCatalogInitialized(authorId: string): Promise<void> {
  const publicPath = 'publicMeta/status';
  try {
    await setDoc(doc(db, 'publicMeta', 'status'), {
      initialized: true,
      updatedBy: authorId,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, publicPath);
  }
}

export async function createRoute(
  form: RouteFormData,
  authorId: string,
  authorEmail: string
): Promise<string> {
  const id = slugifyId(form.title);
  const path = `routes/${id}`;
  const payload = buildValidatedPayload(form);

  try {
    await setDoc(doc(db, 'routes', id), {
      ...payload,
      authorId,
      authorEmail: authorEmail.toLowerCase(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await markCatalogInitialized(authorId);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateRoute(routeId: string, form: RouteFormData): Promise<void> {
  const path = `routes/${routeId}`;
  const payload = buildValidatedPayload(form);

  try {
    await updateDoc(doc(db, 'routes', routeId), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleRoutePublished(routeId: string, nextPublished: boolean): Promise<void> {
  const path = `routes/${routeId}`;
  try {
    await updateDoc(doc(db, 'routes', routeId), {
      published: nextPublished,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteRoute(routeId: string): Promise<void> {
  const path = `routes/${routeId}`;
  try {
    await deleteDoc(doc(db, 'routes', routeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedStarterRoutesIfNeeded(
  authorId: string,
  authorEmail: string
): Promise<boolean> {
  const metaPath = 'adminMeta/blogState';
  try {
    const metaSnap = await getDoc(doc(db, 'adminMeta', 'blogState'));
    if (metaSnap.exists() && metaSnap.data()?.seeded) {
      return false;
    }
    const existingRoutesSnap = await getDocs(
      query(collection(db, 'routes'), where('published', '==', true))
    );
    if (existingRoutesSnap.empty) {
      for (const starter of STARTER_ROUTES) {
        const id = slugifyId(starter.title);
        await setDoc(doc(db, 'routes', id), {
          ...starter,
          authorId,
          authorEmail: authorEmail.toLowerCase(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
    await setDoc(doc(db, 'adminMeta', 'blogState'), {
      seeded: true,
      updatedBy: authorId,
      updatedAt: serverTimestamp(),
    });
    await markCatalogInitialized(authorId);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, metaPath);
  }
}

export async function forceSeedStarterRoutes(
  authorId: string,
  authorEmail: string
): Promise<void> {
  const path = 'routes';
  try {
    for (const starter of STARTER_ROUTES) {
      const id = slugifyId(starter.title);
      await setDoc(doc(db, 'routes', id), {
        ...starter,
        authorId,
        authorEmail: authorEmail.toLowerCase(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await setDoc(doc(db, 'adminMeta', 'blogState'), {
      seeded: true,
      updatedBy: authorId,
      updatedAt: serverTimestamp(),
    });
    await markCatalogInitialized(authorId);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export interface AdminSecurityRecord {
  passwordHash: string;
  salt: string;
}

export async function getAdminSecurity(): Promise<AdminSecurityRecord | null> {
  const path = 'adminSettings/security';
  try {
    const snap = await getDoc(doc(db, 'adminSettings', 'security'));
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data();
    return {
      passwordHash: String(data.passwordHash),
      salt: String(data.salt),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveAdminSecurity(
  passwordHash: string,
  salt: string,
  authorId: string
): Promise<void> {
  const path = 'adminSettings/security';
  try {
    await setDoc(doc(db, 'adminSettings', 'security'), {
      passwordHash,
      salt,
      updatedBy: authorId,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function checkUserIsAuthorizedAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (normalized === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  const docId = emailToAdminDocId(normalized);
  const path = `authorizedAdmins/${docId}`;
  try {
    const snap = await getDoc(doc(db, 'authorizedAdmins', docId));
    if (!snap.exists()) {
      return false;
    }
    const data = snap.data();
    return data.active === true && String(data.email).toLowerCase() === normalized;
  } catch (error) {
    // Permission denied means user is not an authorized admin
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('insufficient')) {
      return false;
    }
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeAuthorizedAdmins(
  onData: (admins: AuthorizedAdminItem[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'authorizedAdmins';
  const q = query(
    collection(db, 'authorizedAdmins'),
    where('ownerEmail', '==', ADMIN_EMAIL.toLowerCase())
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: AuthorizedAdminItem[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            email: String(data.email || ''),
            label: typeof data.label === 'string' ? data.label : '',
            active: Boolean(data.active),
            createdAtMs: timestampToMs(data.createdAt),
          };
        })
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function addAuthorizedAdmin(
  email: string,
  label: string,
  ownerUid: string
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const docId = emailToAdminDocId(normalized);
  const path = `authorizedAdmins/${docId}`;
  try {
    await setDoc(doc(db, 'authorizedAdmins', docId), {
      email: normalized,
      label: label.trim().slice(0, 80),
      active: true,
      ownerEmail: ADMIN_EMAIL.toLowerCase(),
      addedBy: ownerUid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeAuthorizedAdmin(adminId: string): Promise<void> {
  const path = `authorizedAdmins/${adminId}`;
  try {
    await deleteDoc(doc(db, 'authorizedAdmins', adminId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
