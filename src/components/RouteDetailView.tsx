import { ArrowLeft, Compass, ExternalLink, MapPin } from 'lucide-react';
import { parseGoogleMapsInput, parseWikilocInput } from '../lib/maps';
import { MODE_LABELS, RouteItem } from '../types/route';
import { ArticleRenderer } from './ArticleRenderer';
import { EditorialImage } from './EditorialImage';

interface RouteDetailViewProps {
  route: RouteItem;
  onBack: () => void;
  onNavigateCategory: (category: 'coche' | 'moto' | 'a_pie') => void;
}

export function RouteDetailView({
  route,
  onBack,
  onNavigateCategory,
}: RouteDetailViewProps) {
  const wikiloc = parseWikilocInput(route.wikilocUrl);
  const googleMaps = parseGoogleMapsInput(
    route.googleMapsUrl,
    route.startPoint || route.comarca || route.title
  );

  const formattedDate = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(route.createdAtMs));

  const modeLabels = route.modes.map((m) => {
    if (m === 'otros' && route.otherModeDetail) {
      return `Otros (${route.otherModeDetail})`;
    }
    return MODE_LABELS[m];
  });

  return (
    <article className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#5C5A54] hover:text-[#161614] transition-colors cursor-pointer py-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al archivo de rutas
        </button>

        <div className="flex items-center gap-3 text-xs text-[#5C5A54]">
          {route.modes
            .filter((m): m is 'coche' | 'moto' | 'a_pie' => m !== 'otros')
            .map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onNavigateCategory(mode)}
                className="hover:text-[#14532D] underline underline-offset-4 decoration-[#D4D0C7] hover:decoration-[#14532D] transition-colors cursor-pointer"
              >
                Ver más en {MODE_LABELS[mode]}
              </button>
            ))}
        </div>
      </div>

      {/* 1. Título e introducción */}
      <header className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#5C5A54]">
          <span className="font-medium text-[#14532D]">{route.comarca}</span>
          <span aria-hidden="true">·</span>
          <span>{modeLabels.join(' · ')}</span>
          <span aria-hidden="true">·</span>
          <span>{formattedDate}</span>
        </div>

        <h1 className="mt-4 font-serif text-3xl sm:text-5xl font-medium text-[#161614] leading-[1.12] tracking-tight">
          {route.title}
        </h1>

        <p className="mt-6 text-lg sm:text-xl leading-relaxed text-[#4A4842] font-normal">
          {route.introduction}
        </p>
      </header>

      <div className="mt-8 sm:mt-10 border border-[#E4E1DA] bg-[#F2F0EB] overflow-hidden">
        <EditorialImage
          src={route.coverImage}
          alt={route.title}
          className="w-full max-h-[560px] object-cover block"
        />
      </div>

      {/* 2. Ficha técnica de la ruta */}
      <section aria-labelledby="ficha-tecnica-heading" className="mt-10 sm:mt-12 border-y border-[#E4E1DA] py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2
            id="ficha-tecnica-heading"
            className="font-serif text-2xl font-medium text-[#161614]"
          >
            Ficha técnica de la ruta
          </h2>
          <span className="text-xs font-mono text-[#5C5A54] tabular-nums">
            {route.difficulty}
          </span>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-y-6 gap-x-6">
          <div>
            <dt className="text-xs text-[#5C5A54]">Cómo realizarla</dt>
            <dd className="mt-1.5 text-sm font-medium text-[#161614]">
              {modeLabels.join(', ')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#5C5A54]">Distancia total</dt>
            <dd className="mt-1.5 text-sm font-mono tabular-nums font-medium text-[#161614]">
              {route.distanceKm} km
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#5C5A54]">Duración estimada</dt>
            <dd className="mt-1.5 text-sm font-mono tabular-nums font-medium text-[#161614]">
              {route.duration}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#5C5A54]">Dificultad</dt>
            <dd className="mt-1.5 text-sm font-medium text-[#14532D]">
              {route.difficulty}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#5C5A54]">Punto de inicio</dt>
            <dd className="mt-1.5 text-sm font-medium text-[#161614]">
              {route.startPoint || route.comarca}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#5C5A54]">Desnivel</dt>
            <dd className="mt-1.5 text-sm font-mono tabular-nums font-medium text-[#161614]">
              {route.elevationGain || 'No especificado'}
            </dd>
          </div>
        </dl>

        {/* Mapas: Wikiloc & Google Maps */}
        {(wikiloc.externalUrl || wikiloc.embedUrl || googleMaps.embedUrl || googleMaps.externalUrl) && (
          <div className="mt-10 pt-8 border-t border-[#E4E1DA] grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mapa de Wikiloc */}
            <div className="border border-[#E4E1DA] bg-white flex flex-col">
              <div className="px-5 py-4 border-b border-[#E4E1DA] flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[#161614]">
                  <Compass className="w-4 h-4 text-[#14532D]" />
                  <span>Mapa de Wikiloc</span>
                </div>
                {wikiloc.externalUrl && (
                  <a
                    href={wikiloc.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#14532D] hover:underline whitespace-nowrap shrink-0"
                  >
                    Abrir en Wikiloc
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              {wikiloc.embedUrl ? (
                <div className="relative w-full h-[320px] bg-[#F2F0EB]">
                  <iframe
                    title={`Mapa Wikiloc de ${route.title}`}
                    src={wikiloc.embedUrl}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : (
                <div className="p-6 flex-1 flex flex-col justify-center items-start bg-[#FAFAF8]">
                  <p className="text-sm text-[#5C5A54] leading-relaxed">
                    {wikiloc.externalUrl
                      ? 'Esta ruta incluye enlace directo al track en Wikiloc para consultar el perfil topográfico o descargar el archivo GPX.'
                      : 'No se ha adjuntado mapa de Wikiloc para esta ruta.'}
                  </p>
                  {wikiloc.externalUrl && (
                    <a
                      href={wikiloc.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#14532D] text-white hover:bg-[#0F3F22] transition-colors"
                    >
                      Ver track en Wikiloc
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Mapa de Google Maps */}
            <div className="border border-[#E4E1DA] bg-white flex flex-col">
              <div className="px-5 py-4 border-b border-[#E4E1DA] flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[#161614]">
                  <MapPin className="w-4 h-4 text-[#14532D]" />
                  <span>Mapa de Google Maps</span>
                </div>
                {googleMaps.externalUrl && (
                  <a
                    href={googleMaps.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#14532D] hover:underline whitespace-nowrap shrink-0"
                  >
                    Abrir en Google Maps
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              {googleMaps.embedUrl ? (
                <div className="relative w-full h-[320px] bg-[#F2F0EB]">
                  <iframe
                    title={`Mapa Google Maps de ${route.title}`}
                    src={googleMaps.embedUrl}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : (
                <div className="p-6 flex-1 flex flex-col justify-center items-start bg-[#FAFAF8]">
                  <p className="text-sm text-[#5C5A54]">
                    No se ha especificado ubicación en Google Maps para esta ruta.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 3. Cuerpo del artículo + 4. Recomendaciones + 5. Consejos finales */}
      <div className="mt-10 sm:mt-14 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-8">
          <ArticleRenderer content={route.articleBody} />
        </div>

        <aside className="lg:col-span-4 space-y-8 lg:sticky lg:top-24">
          {route.recommendations && (
            <section className="border border-[#E4E1DA] bg-white p-6">
              <h2 className="font-serif text-xl font-medium text-[#161614]">
                01. Recomendaciones
              </h2>
              <div className="mt-4 pt-4 border-t border-[#E4E1DA] text-sm leading-relaxed text-[#3D3C37] whitespace-pre-line">
                {route.recommendations}
              </div>
            </section>
          )}

          {route.tips && (
            <section className="border border-[#E4E1DA] bg-[#F2F0EB]/60 p-6">
              <h2 className="font-serif text-xl font-medium text-[#161614]">
                02. Consejos finales
              </h2>
              <div className="mt-4 pt-4 border-t border-[#E4E1DA] text-sm leading-relaxed text-[#3D3C37] whitespace-pre-line">
                {route.tips}
              </div>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
