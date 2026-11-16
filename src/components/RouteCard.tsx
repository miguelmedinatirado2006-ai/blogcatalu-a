import { ArrowUpRight } from 'lucide-react';
import { MODE_LABELS, RouteItem } from '../types/route';
import { EditorialImage } from './EditorialImage';

interface RouteCardProps {
  route: RouteItem;
  variant?: 'featured' | 'grid';
  onSelect: (id: string) => void;
}

export function RouteCard({ route, variant = 'grid', onSelect }: RouteCardProps) {
  const modeSummary = route.modes.map((m) => MODE_LABELS[m]).join(' · ');

  if (variant === 'featured') {
    return (
      <article className="group border border-[#E4E1DA] bg-white transition-colors duration-200 hover:border-[#C9C4B8]">
        <button
          type="button"
          onClick={() => onSelect(route.id)}
          className="w-full text-left grid grid-cols-1 lg:grid-cols-12 items-stretch cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14532D]"
        >
          <div className="lg:col-span-7 overflow-hidden bg-[#F2F0EB] aspect-[16/10] lg:aspect-auto lg:min-h-[380px]">
            <EditorialImage
              src={route.coverImage}
              alt={route.title}
              className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
            />
          </div>
          <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tracking-wide text-[#5C5A54]">
                <span className="font-medium text-[#14532D]">{route.comarca}</span>
                <span aria-hidden="true">·</span>
                <span>{modeSummary}</span>
              </div>

              <h3 className="mt-4 font-serif text-2xl sm:text-3xl font-medium text-[#161614] leading-tight group-hover:text-[#14532D] transition-colors">
                {route.title}
              </h3>

              <p className="mt-4 text-sm sm:text-[15px] leading-relaxed text-[#5C5A54] line-clamp-4">
                {route.introduction}
              </p>
            </div>

            <div className="mt-8 pt-5 border-t border-[#E4E1DA] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-[#4A4842]">
                <span>{route.distanceKm} km</span>
                <span aria-hidden="true">/</span>
                <span>{route.duration}</span>
                <span aria-hidden="true">/</span>
                <span>{route.difficulty}</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#161614] group-hover:text-[#14532D] whitespace-nowrap shrink-0">
                Leer ficha
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </button>
      </article>
    );
  }

  return (
    <article className="group border border-[#E4E1DA] bg-white flex flex-col transition-colors duration-200 hover:border-[#C9C4B8]">
      <button
        type="button"
        onClick={() => onSelect(route.id)}
        className="w-full h-full text-left flex flex-col cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14532D]"
      >
        <div className="aspect-[4/3] w-full overflow-hidden bg-[#F2F0EB]">
          <EditorialImage
            src={route.coverImage}
            alt={route.title}
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          />
        </div>

        <div className="p-6 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5C5A54]">
              <span className="font-medium text-[#14532D]">{route.comarca}</span>
              <span aria-hidden="true">·</span>
              <span>{modeSummary}</span>
            </div>

            <h3 className="mt-2.5 font-serif text-xl font-medium text-[#161614] leading-snug group-hover:text-[#14532D] transition-colors">
              {route.title}
            </h3>

            <p className="mt-2.5 text-sm leading-relaxed text-[#5C5A54] line-clamp-3">
              {route.introduction}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E4E1DA] flex items-center justify-between gap-3 text-xs font-mono tabular-nums text-[#4A4842]">
            <span>{route.distanceKm} km</span>
            <span aria-hidden="true">·</span>
            <span>{route.duration}</span>
            <span aria-hidden="true">·</span>
            <span className="ml-auto font-sans font-medium text-[#161614]">{route.difficulty}</span>
          </div>
        </div>
      </button>
    </article>
  );
}
