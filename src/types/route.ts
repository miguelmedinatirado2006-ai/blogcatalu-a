export type RouteMode = 'coche' | 'moto' | 'a_pie' | 'otros';

export type RouteDifficulty = 'Fácil' | 'Moderada' | 'Difícil' | 'Exigente';

export type SubpageCategory = 'coche' | 'moto' | 'a_pie';

export const ADMIN_EMAIL = 'miguelmedinatirado2006@gmail.com';

export const MODE_LABELS: Record<RouteMode, string> = {
  coche: 'Coche',
  moto: 'Moto',
  a_pie: 'A pie',
  otros: 'Otros',
};

export const DIFFICULTIES: RouteDifficulty[] = ['Fácil', 'Moderada', 'Difícil', 'Exigente'];

export interface RouteItem {
  id: string;
  title: string;
  comarca: string;
  introduction: string;
  coverImage: string;
  modes: RouteMode[];
  otherModeDetail?: string;
  distanceKm: number;
  duration: string;
  difficulty: RouteDifficulty;
  startPoint?: string;
  elevationGain?: string;
  wikilocUrl: string;
  googleMapsUrl: string;
  articleBody: string;
  recommendations: string;
  tips: string;
  authorId: string;
  authorEmail?: string;
  published: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  isStarterPreview?: boolean;
}

export interface AuthorizedAdminItem {
  id: string;
  email: string;
  label: string;
  active: boolean;
  createdAtMs: number;
}

export interface RouteFormData {
  title: string;
  comarca: string;
  introduction: string;
  coverImage: string;
  modes: RouteMode[];
  otherModeDetail: string;
  distanceKm: string;
  duration: string;
  difficulty: RouteDifficulty;
  startPoint: string;
  elevationGain: string;
  wikilocUrl: string;
  googleMapsUrl: string;
  articleBody: string;
  recommendations: string;
  tips: string;
  published: boolean;
}
