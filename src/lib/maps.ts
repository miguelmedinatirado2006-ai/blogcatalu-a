export interface ParsedMapEmbed {
  embedUrl: string | null;
  externalUrl: string | null;
}

function extractIframeSrc(input: string): string | null {
  const match = input.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  return match ? match[1].trim() : null;
}

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function parseWikilocInput(rawInput: string): ParsedMapEmbed {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { embedUrl: null, externalUrl: null };
  }

  const iframeSrc = extractIframeSrc(trimmed);
  if (iframeSrc && isSafeHttpUrl(iframeSrc)) {
    const idMatch = iframeSrc.match(/[?&]id=(\d+)/);
    return {
      embedUrl: iframeSrc,
      externalUrl: idMatch ? `https://www.wikiloc.com/wikiloc/view.do?id=${idMatch[1]}` : iframeSrc,
    };
  }

  if (!isSafeHttpUrl(trimmed)) {
    return { embedUrl: null, externalUrl: null };
  }

  // Extract Wikiloc numeric trail ID from URLs like .../ruta-ejemplo-12345678 or ?id=12345678
  const queryIdMatch = trimmed.match(/[?&]id=(\d+)/);
  const trailingIdMatch = trimmed.match(/-(\d{5,12})(?:[/?#]|$)/);
  const trailId = queryIdMatch?.[1] ?? trailingIdMatch?.[1];

  if (trailId) {
    return {
      embedUrl: `https://es.wikiloc.com/wikiloc/spatialArtifacts.do?event=view&id=${trailId}&measures=on&title=on&near=on&images=on&maptype=H`,
      externalUrl: trimmed,
    };
  }

  return {
    embedUrl: null,
    externalUrl: trimmed,
  };
}

export function parseGoogleMapsInput(rawInput: string, fallbackLocation?: string): ParsedMapEmbed {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    if (fallbackLocation && fallbackLocation.trim()) {
      const q = encodeURIComponent(`${fallbackLocation.trim()}, Cataluña`);
      return {
        embedUrl: `https://maps.google.com/maps?q=${q}&t=&z=11&ie=UTF8&iwloc=&output=embed`,
        externalUrl: `https://www.google.com/maps/search/?api=1&query=${q}`,
      };
    }
    return { embedUrl: null, externalUrl: null };
  }

  const iframeSrc = extractIframeSrc(trimmed);
  if (iframeSrc && isSafeHttpUrl(iframeSrc)) {
    return {
      embedUrl: iframeSrc,
      externalUrl: iframeSrc.includes('/maps/embed')
        ? fallbackLocation
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackLocation)}`
          : 'https://www.google.com/maps'
        : iframeSrc,
    };
  }

  if (isSafeHttpUrl(trimmed)) {
    if (trimmed.includes('output=embed') || trimmed.includes('/maps/embed')) {
      return {
        embedUrl: trimmed,
        externalUrl: trimmed.replace('&output=embed', ''),
      };
    }

    // Try extracting coordinates @lat,lng or q=...
    const coordMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
      const q = `${coordMatch[1]},${coordMatch[2]}`;
      return {
        embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(q)}&t=&z=12&ie=UTF8&iwloc=&output=embed`,
        externalUrl: trimmed,
      };
    }

    try {
      const parsed = new URL(trimmed);
      const qParam = parsed.searchParams.get('q') || parsed.searchParams.get('query');
      if (qParam) {
        return {
          embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(qParam)}&t=&z=12&ie=UTF8&iwloc=&output=embed`,
          externalUrl: trimmed,
        };
      }
      const placeMatch = parsed.pathname.match(/\/maps\/place\/([^/]+)/);
      if (placeMatch) {
        const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
        return {
          embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(placeName)}&t=&z=12&ie=UTF8&iwloc=&output=embed`,
          externalUrl: trimmed,
        };
      }
    } catch {
      // Fallback handled below
    }

    const fallbackQuery = fallbackLocation?.trim()
      ? `${fallbackLocation.trim()}, Cataluña`
      : 'Cataluña';
    return {
      embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(fallbackQuery)}&t=&z=10&ie=UTF8&iwloc=&output=embed`,
      externalUrl: trimmed,
    };
  }

  // Plain place name or coordinates entered directly
  const encoded = encodeURIComponent(trimmed);
  return {
    embedUrl: `https://maps.google.com/maps?q=${encoded}&t=&z=12&ie=UTF8&iwloc=&output=embed`,
    externalUrl: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
  };
}
