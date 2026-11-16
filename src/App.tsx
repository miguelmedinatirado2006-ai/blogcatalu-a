import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ArrowRight, Menu, Search, X } from 'lucide-react';
import { AdminPanel } from './components/AdminPanel';
import { EditorialImage } from './components/EditorialImage';
import { RouteCard } from './components/RouteCard';
import { RouteDetailView } from './components/RouteDetailView';
import { STARTER_ROUTES } from './data/starterRoutes';
import { auth } from './lib/firebase';
import {
  fetchPublicCatalogInitialized,
  subscribePublicRoutes,
} from './lib/routesService';
import {
  DIFFICULTIES,
  RouteDifficulty,
  RouteItem,
  SubpageCategory,
} from './types/route';

type AppView =
  | { kind: 'home' }
  | { kind: 'category'; category: SubpageCategory }
  | { kind: 'route'; routeId: string }
  | { kind: 'admin' };

const CATEGORY_COPY: Record<
  SubpageCategory,
  {
    title: string;
    subtitle: string;
    description: string;
  }
> = {
  coche: {
    title: 'Rutas en coche por Cataluña',
    subtitle: 'Carreteras panorámicas y escapadas por comarcas',
    description:
      'Itinerarios seleccionados para disfrutar al volante entre sierras interiores, valles pirenaicos, puertos de montaña y pueblos de piedra con paradas recomendadas.',
  },
  moto: {
    title: 'Rutas en moto por Cataluña',
    subtitle: 'Trazados de curvas, asfalto limpio y puertos clásicos',
    description:
      'Salidas matinales y jornadas completas sobre dos ruedas por carreteras secundarias catalanas, con datos de distancia, dificultad y tracks de Wikiloc.',
  },
  a_pie: {
    title: 'Rutas a pie por Cataluña',
    subtitle: 'Senderos, desfiladeros y travesías de montaña',
    description:
      'Caminatas señalizadas, pasos excavados en la roca y senderos forestales por parques naturales de Cataluña con ficha técnica y consejos prácticos.',
  },
};

function parseHashToView(hash: string): AppView {
  const clean = hash.replace(/^#/, '');
  if (clean === '/coche') return { kind: 'category', category: 'coche' };
  if (clean === '/moto') return { kind: 'category', category: 'moto' };
  if (clean === '/a-pie') return { kind: 'category', category: 'a_pie' };
  if (clean === '/admin') return { kind: 'admin' };
  if (clean.startsWith('/ruta/')) {
    const id = decodeURIComponent(clean.slice('/ruta/'.length));
    if (id) return { kind: 'route', routeId: id };
  }
  return { kind: 'home' };
}

function viewToHash(view: AppView): string {
  switch (view.kind) {
    case 'home':
      return '#/';
    case 'category':
      return view.category === 'a_pie' ? '#/a-pie' : `#/${view.category}`;
    case 'route':
      return `#/ruta/${encodeURIComponent(view.routeId)}`;
    case 'admin':
      return '#/admin';
  }
}

const PREVIEW_ROUTES: RouteItem[] = STARTER_ROUTES.map((item, idx) => ({
  ...item,
  id: `starter-${idx}`,
  authorId: 'editorial',
  createdAtMs: Date.now() - idx * 86400000,
  updatedAtMs: Date.now() - idx * 86400000,
  isStarterPreview: true,
}));

export default function App() {
  const [view, setView] = useState<AppView>(() => parseHashToView(window.location.hash));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Secret 5-tap admin access state (completely invisible to visitors)
  const logoClickCountRef = useRef(0);
  const logoResetTimerRef = useRef<number | null>(null);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Public routes state
  const [firestoreRoutes, setFirestoreRoutes] = useState<RouteItem[]>([]);
  const [catalogInitialized, setCatalogInitialized] = useState<boolean>(false);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filter state for home & category views
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | RouteDifficulty>('all');

  useEffect(() => {
    const handleHashChange = () => {
      setView(parseHashToView(window.location.hash));
      setMobileMenuOpen(false);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Keyboard shortcut Ctrl+Shift+A / Cmd+Shift+A for secret admin access
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        navigate({ kind: 'admin' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let active = true;
    fetchPublicCatalogInitialized()
      .then((initialized) => {
        if (active) setCatalogInitialized(initialized);
      })
      .catch(() => {
        // Non-fatal fallback
      });

    const unsub = subscribePublicRoutes(
      (items) => {
        if (!active) return;
        setFirestoreRoutes(items);
        setLoadingRoutes(false);
        setLoadError(null);
      },
      (err) => {
        if (!active) return;
        setLoadError(err.message);
        setLoadingRoutes(false);
      }
    );

    return () => {
      active = false;
      unsub();
    };
  }, []);

  function navigate(nextView: AppView) {
    const nextHash = viewToHash(nextView);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    } else {
      setView(nextView);
    }
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleLogoClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();

    if (logoResetTimerRef.current !== null) {
      window.clearTimeout(logoResetTimerRef.current);
    }

    logoClickCountRef.current += 1;

    if (logoClickCountRef.current >= 5) {
      logoClickCountRef.current = 0;
      logoResetTimerRef.current = null;
      navigate({ kind: 'admin' });
      return;
    }

    logoResetTimerRef.current = window.setTimeout(() => {
      logoClickCountRef.current = 0;
      logoResetTimerRef.current = null;
    }, 2500);

    // Normal single click returns to home if not already there
    if (view.kind !== 'home') {
      navigate({ kind: 'home' });
    }
  }

  function handleExploreClick() {
    if (view.kind !== 'home') {
      navigate({ kind: 'home' });
      window.setTimeout(() => {
        document.getElementById('archivo-rutas')?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    } else {
      document.getElementById('archivo-rutas')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Use real Firestore routes once initialized or non-empty; otherwise show curated starter preview routes
  const visibleRoutes = useMemo(() => {
    if (firestoreRoutes.length > 0 || catalogInitialized) {
      return firestoreRoutes;
    }
    return PREVIEW_ROUTES;
  }, [firestoreRoutes, catalogInitialized]);

  const carRoutes = useMemo(
    () => visibleRoutes.filter((r) => r.modes.includes('coche')),
    [visibleRoutes]
  );
  const motoRoutes = useMemo(
    () => visibleRoutes.filter((r) => r.modes.includes('moto')),
    [visibleRoutes]
  );
  const hikeRoutes = useMemo(
    () => visibleRoutes.filter((r) => r.modes.includes('a_pie')),
    [visibleRoutes]
  );

  const filterList = (list: RouteItem[]) => {
    return list.filter((r) => {
      if (difficultyFilter !== 'all' && r.difficulty !== difficultyFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.comarca.toLowerCase().includes(q) ||
          r.introduction.toLowerCase().includes(q)
        );
      }
      return true;
    });
  };

  const activeCategory: SubpageCategory | null =
    view.kind === 'category' ? view.category : null;

  const selectedRoute =
    view.kind === 'route'
      ? visibleRoutes.find((r) => r.id === view.routeId) || null
      : null;

  const filteredHomeRoutes = filterList(visibleRoutes);
  const leadRoute =
    !searchQuery.trim() && difficultyFilter === 'all' && filteredHomeRoutes.length > 0
      ? filteredHomeRoutes[0]
      : null;
  const secondaryHomeRoutes = leadRoute
    ? filteredHomeRoutes.slice(1)
    : filteredHomeRoutes;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#161614]">
      {/* Strictly 1-row, 3-zone Top Bar Contract (no visible admin buttons) */}
      <header className="sticky top-0 z-40 bg-[#FAFAF8]/95 backdrop-blur-sm border-b border-[#E4E1DA]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element wordmark (5 rapid clicks opens hidden Admin access) */}
          <a
            href="#/"
            onClick={handleLogoClick}
            className="font-serif text-xl sm:text-2xl font-medium tracking-tight text-[#161614] whitespace-nowrap shrink-0 select-none"
          >
            Rutas Cataluña
          </a>

          {/* Zone 2: 4 single-line navigation links */}
          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5C5A54]"
          >
            <button
              type="button"
              onClick={() => navigate({ kind: 'home' })}
              className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                view.kind === 'home'
                  ? 'text-[#161614] border-[#14532D]'
                  : 'border-transparent hover:text-[#161614]'
              }`}
            >
              Inicio
            </button>
            <button
              type="button"
              onClick={() => navigate({ kind: 'category', category: 'coche' })}
              className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                activeCategory === 'coche'
                  ? 'text-[#161614] border-[#14532D]'
                  : 'border-transparent hover:text-[#161614]'
              }`}
            >
              Coche
            </button>
            <button
              type="button"
              onClick={() => navigate({ kind: 'category', category: 'moto' })}
              className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                activeCategory === 'moto'
                  ? 'text-[#161614] border-[#14532D]'
                  : 'border-transparent hover:text-[#161614]'
              }`}
            >
              Moto
            </button>
            <button
              type="button"
              onClick={() => navigate({ kind: 'category', category: 'a_pie' })}
              className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                activeCategory === 'a_pie'
                  ? 'text-[#161614] border-[#14532D]'
                  : 'border-transparent hover:text-[#161614]'
              }`}
            >
              A pie
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExploreClick}
              className="px-4 py-2 text-xs font-medium bg-[#14532D] text-white hover:bg-[#0F3F22] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Explorar rutas
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Abrir menú"
              className="md:hidden p-2 text-[#161614] border border-[#E4E1DA] bg-white cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-[#E4E1DA] bg-white px-4 py-3 flex items-center gap-5 overflow-x-auto text-sm font-medium">
            <button
              type="button"
              onClick={() => navigate({ kind: 'home' })}
              className={`py-1 whitespace-nowrap cursor-pointer ${
                view.kind === 'home' ? 'text-[#14532D] font-semibold' : 'text-[#5C5A54]'
              }`}
            >
              Inicio
            </button>
            <button
              type="button"
              onClick={() => navigate({ kind: 'category', category: 'coche' })}
              className={`py-1 whitespace-nowrap cursor-pointer ${
                activeCategory === 'coche' ? 'text-[#14532D] font-semibold' : 'text-[#5C5A54]'
              }`}
            >
              Coche
            </button>
            <button
              type="button"
              onClick={() => navigate({ kind: 'category', category: 'moto' })}
              className={`py-1 whitespace-nowrap cursor-pointer ${
                activeCategory === 'moto' ? 'text-[#14532D] font-semibold' : 'text-[#5C5A54]'
              }`}
            >
              Moto
            </button>
            <button
              type="button"
              onClick={() => navigate({ kind: 'category', category: 'a_pie' })}
              className={`py-1 whitespace-nowrap cursor-pointer ${
                activeCategory === 'a_pie' ? 'text-[#14532D] font-semibold' : 'text-[#5C5A54]'
              }`}
            >
              A pie
            </button>
          </nav>
        )}
      </header>

      <main className="flex-1">
        {view.kind === 'admin' ? (
          <AdminPanel
            user={user}
            authReady={authReady}
            onPreviewRoute={(routeId) => navigate({ kind: 'route', routeId })}
            onExitAdmin={() => navigate({ kind: 'home' })}
          />
        ) : view.kind === 'route' ? (
          selectedRoute ? (
            <RouteDetailView
              route={selectedRoute}
              onBack={() => navigate({ kind: 'home' })}
              onNavigateCategory={(category) => navigate({ kind: 'category', category })}
            />
          ) : (
            <section className="max-w-3xl mx-auto px-4 py-20 text-center">
              <h1 className="font-serif text-3xl font-medium text-[#161614]">
                {loadingRoutes ? 'Cargando ficha de ruta...' : 'Ruta no encontrada'}
              </h1>
              {!loadingRoutes && (
                <>
                  <p className="mt-3 text-sm text-[#5C5A54]">
                    Es posible que la ruta haya sido eliminada o permanezca en borrador.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate({ kind: 'home' })}
                    className="mt-6 px-5 py-2.5 bg-[#14532D] text-white text-xs font-medium cursor-pointer"
                  >
                    Volver a portada
                  </button>
                </>
              )}
            </section>
          )
        ) : view.kind === 'category' ? (
          /* SUBPÁGINAS: COCHE / MOTO / A PIE */
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <header className="max-w-3xl pb-8 border-b border-[#E4E1DA]">
              <span className="text-xs font-medium text-[#14532D] tracking-wide">
                {CATEGORY_COPY[view.category].subtitle}
              </span>
              <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-medium text-[#161614] tracking-tight">
                {CATEGORY_COPY[view.category].title}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-[#5C5A54]">
                {CATEGORY_COPY[view.category].description}
              </p>
            </header>

            {/* Filter & Search Bar */}
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F2F0EB]">
                <button
                  type="button"
                  onClick={() => setDifficultyFilter('all')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    difficultyFilter === 'all'
                      ? 'bg-white text-[#161614]'
                      : 'text-[#5C5A54] hover:text-[#161614]'
                  }`}
                >
                  Todas
                </button>
                {DIFFICULTIES.map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficultyFilter(diff)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      difficultyFilter === diff
                        ? 'bg-white text-[#161614]'
                        : 'text-[#5C5A54] hover:text-[#161614]'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[#5C5A54] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar comarca o ruta..."
                  className="w-full pl-9 pr-3.5 py-2 border border-[#E4E1DA] bg-white text-sm text-[#161614] focus:outline-none focus:border-[#14532D]"
                />
              </div>
            </div>

            {(() => {
              const categoryBase =
                view.category === 'coche'
                  ? carRoutes
                  : view.category === 'moto'
                  ? motoRoutes
                  : hikeRoutes;
              const categoryFiltered = filterList(categoryBase);

              if (loadingRoutes && firestoreRoutes.length === 0 && catalogInitialized) {
                return (
                  <div className="mt-10 border border-[#E4E1DA] bg-white p-12 text-center text-sm text-[#5C5A54]">
                    Cargando rutas...
                  </div>
                );
              }

              if (categoryFiltered.length === 0) {
                return (
                  <div className="mt-10 border border-[#E4E1DA] bg-white p-12 text-center">
                    <p className="font-serif text-xl text-[#161614]">
                      No hay rutas publicadas en esta categoría todavía
                    </p>
                    <p className="mt-2 text-sm text-[#5C5A54]">
                      Las rutas que incluyan esta modalidad en su ficha técnica aparecerán aquí automáticamente.
                    </p>
                  </div>
                );
              }

              return (
                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryFiltered.map((route) => (
                    <RouteCard
                      key={route.id}
                      route={route}
                      onSelect={(id) => navigate({ kind: 'route', routeId: id })}
                    />
                  ))}
                </div>
              );
            })()}
          </section>
        ) : (
          /* PÁGINA PRINCIPAL (INICIO) */
          <>
            {/* Editorial Hero Split */}
            <section className="border-b border-[#E4E1DA] bg-white">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
                  <div className="lg:col-span-6 flex flex-col justify-center">
                    <span className="text-xs font-medium text-[#14532D] tracking-wide">
                      Cuaderno de campo · Cataluña
                    </span>
                    <h1 className="mt-4 font-serif text-4xl sm:text-5xl lg:text-[3.35rem] font-medium text-[#161614] leading-[1.08] tracking-tight">
                      Caminos, puertos y senderos por toda Cataluña
                    </h1>
                    <p className="mt-5 text-base sm:text-lg leading-relaxed text-[#5C5A54] max-w-xl">
                      Bitácora editorial de salidas clasificadas en coche, moto o a pie, con fichas técnicas verificadas, mapas de Wikiloc y Google Maps, crónicas ilustradas y consejos prácticos.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-4">
                      <a
                        href="#archivo-rutas"
                        className="inline-flex items-center gap-2 px-5 py-3 bg-[#14532D] text-white text-sm font-medium hover:bg-[#0F3F22] transition-colors"
                      >
                        Explorar rutas
                        <ArrowRight className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => navigate({ kind: 'category', category: 'a_pie' })}
                        className="px-4 py-3 text-sm font-medium text-[#161614] border border-[#E4E1DA] hover:bg-[#FAFAF8] transition-colors cursor-pointer"
                      >
                        Ver senderos a pie
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-6 border border-[#E4E1DA] bg-[#F2F0EB] overflow-hidden min-h-[300px] lg:min-h-[420px]">
                    <EditorialImage
                      src="/src/assets/images/hero_catalonia_pyrenees_1794834007028.jpg"
                      alt="Carretera de montaña en los Pirineos catalanes al atardecer"
                      className="w-full h-full object-cover block"
                    />
                  </div>
                </div>

                {/* Full-width 4-column category strip below the split */}
                <div className="mt-12 pt-8 border-t border-[#E4E1DA] grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <a
                    href="#archivo-rutas"
                    className="group block text-left focus-visible:outline-none"
                  >
                    <span className="text-xs text-[#5C5A54]">Archivo completo</span>
                    <div className="mt-1 flex items-baseline justify-between gap-2">
                      <span className="font-serif text-xl font-medium text-[#161614] group-hover:text-[#14532D] transition-colors">
                        Todas las rutas
                      </span>
                      <span className="font-mono text-sm tabular-nums text-[#14532D]">
                        {visibleRoutes.length}
                      </span>
                    </div>
                  </a>

                  <button
                    type="button"
                    onClick={() => navigate({ kind: 'category', category: 'coche' })}
                    className="group block text-left cursor-pointer focus-visible:outline-none"
                  >
                    <span className="text-xs text-[#5C5A54]">Subpágina</span>
                    <div className="mt-1 flex items-baseline justify-between gap-2">
                      <span className="font-serif text-xl font-medium text-[#161614] group-hover:text-[#14532D] transition-colors">
                        En coche
                      </span>
                      <span className="font-mono text-sm tabular-nums text-[#14532D]">
                        {carRoutes.length}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate({ kind: 'category', category: 'moto' })}
                    className="group block text-left cursor-pointer focus-visible:outline-none"
                  >
                    <span className="text-xs text-[#5C5A54]">Subpágina</span>
                    <div className="mt-1 flex items-baseline justify-between gap-2">
                      <span className="font-serif text-xl font-medium text-[#161614] group-hover:text-[#14532D] transition-colors">
                        En moto
                      </span>
                      <span className="font-mono text-sm tabular-nums text-[#14532D]">
                        {motoRoutes.length}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate({ kind: 'category', category: 'a_pie' })}
                    className="group block text-left cursor-pointer focus-visible:outline-none"
                  >
                    <span className="text-xs text-[#5C5A54]">Subpágina</span>
                    <div className="mt-1 flex items-baseline justify-between gap-2">
                      <span className="font-serif text-xl font-medium text-[#161614] group-hover:text-[#14532D] transition-colors">
                        A pie
                      </span>
                      <span className="font-mono text-sm tabular-nums text-[#14532D]">
                        {hikeRoutes.length}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </section>

            {/* Route Catalog Section */}
            <section
              id="archivo-rutas"
              className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#E4E1DA]">
                <div>
                  <h2 className="font-serif text-3xl font-medium text-[#161614]">
                    Últimas salidas publicadas
                  </h2>
                  <p className="mt-1.5 text-sm text-[#5C5A54]">
                    Cada ficha se clasifica automáticamente según cómo puede realizarse.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F2F0EB]">
                    <button
                      type="button"
                      onClick={() => setDifficultyFilter('all')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        difficultyFilter === 'all'
                          ? 'bg-white text-[#161614]'
                          : 'text-[#5C5A54] hover:text-[#161614]'
                      }`}
                    >
                      Todas
                    </button>
                    {DIFFICULTIES.map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setDifficultyFilter(diff)}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                          difficultyFilter === diff
                            ? 'bg-white text-[#161614]'
                            : 'text-[#5C5A54] hover:text-[#161614]'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>

                  <div className="relative sm:w-64">
                    <Search className="w-4 h-4 text-[#5C5A54] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar comarca o título..."
                      className="w-full pl-9 pr-3.5 py-2 border border-[#E4E1DA] bg-white text-sm text-[#161614] focus:outline-none focus:border-[#14532D]"
                    />
                  </div>
                </div>
              </div>

              {loadError && (
                <div className="mt-8 p-4 border border-red-300 bg-red-50 text-sm text-red-800">
                  {loadError}
                </div>
              )}

              {loadingRoutes && firestoreRoutes.length === 0 && catalogInitialized ? (
                <div className="mt-10 border border-[#E4E1DA] bg-white p-12 text-center text-sm text-[#5C5A54]">
                  Cargando rutas de Cataluña...
                </div>
              ) : filteredHomeRoutes.length === 0 ? (
                <div className="mt-10 border border-[#E4E1DA] bg-white p-12 text-center">
                  <p className="font-serif text-xl text-[#161614]">
                    No hay rutas que coincidan con tu búsqueda
                  </p>
                  <p className="mt-2 text-sm text-[#5C5A54]">
                    Prueba a limpiar los filtros o explora una de las subpáginas principales.
                  </p>
                </div>
              ) : (
                <div className="mt-10 space-y-10">
                  {leadRoute && (
                    <RouteCard
                      route={leadRoute}
                      variant="featured"
                      onSelect={(id) => navigate({ kind: 'route', routeId: id })}
                    />
                  )}

                  {secondaryHomeRoutes.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {secondaryHomeRoutes.map((route) => (
                        <RouteCard
                          key={route.id}
                          route={route}
                          onSelect={(id) => navigate({ kind: 'route', routeId: id })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Quiet Editorial Footer (no visible admin link) */}
      <footer className="border-t border-[#E4E1DA] bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <span className="font-serif text-lg font-medium text-[#161614]">
              Rutas Cataluña
            </span>
            <p className="mt-1 text-xs text-[#5C5A54]">
              Archivo personal de itinerarios en coche, moto y a pie por las comarcas catalanas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#5C5A54]">
            <button
              type="button"
              onClick={() => navigate({ kind: 'category', category: 'coche' })}
              className="hover:text-[#161614] cursor-pointer"
            >
              Rutas en coche
            </button>
            <button
              type="button"
              onClick={() => navigate({ kind: 'category', category: 'moto' })}
              className="hover:text-[#161614] cursor-pointer"
            >
              Rutas en moto
            </button>
            <button
              type="button"
              onClick={() => navigate({ kind: 'category', category: 'a_pie' })}
              className="hover:text-[#161614] cursor-pointer"
            >
              Rutas a pie
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
