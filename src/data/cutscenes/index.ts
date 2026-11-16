import l3End1 from '../../../assets/cutscenes/l3_end_1.png';
import l3End2 from '../../../assets/cutscenes/l3_end_2.png';
import l3End3 from '../../../assets/cutscenes/l3_end_3.png';
import type { PlayerId } from '../../systems/InputState';
import l3End from './l3_end.json';

/** Кто говорит: ведущий игрока 1 или 2, помощник; null — рассказчик (без имени). */
export type Speaker = 'player1' | 'player2' | 'grpzdc' | null;

/** Кадр кат-сцены (ТЗ: «Сцена — JSON-список кадров { bg, portrait, speaker, textKey }»). */
export interface CutsceneFrame {
  /** Иллюстрация под текстовым окном (ключ из CUTSCENE_IMAGES); null — без картинки. */
  readonly bg: string | null;
  readonly speaker: Speaker;
  readonly textKey: string;
  /** Ведущие на картинке: низ-центр в координатах картинки. */
  readonly actors?: readonly {
    readonly player: PlayerId;
    readonly x: number;
    readonly y: number;
  }[];
  /** Надписи (вывески) нашим шрифтом: центр-верх в координатах картинки. */
  readonly labels?: readonly { readonly textKey: string; readonly x: number; readonly y: number }[];
}

/** Картинки кат-сцен (генерируются `npm run levels` в assets/cutscenes/). */
export const CUTSCENE_IMAGES: Readonly<Record<string, string>> = {
  l3_end_1: l3End1,
  l3_end_2: l3End2,
  l3_end_3: l3End3,
};

/** Кат-сцены с раскадровкой. Остальные пока — одно окно с текстом `cutscene.<id>`. */
export const CUTSCENES: Readonly<Record<string, readonly CutsceneFrame[]>> = {
  l3_end: l3End.frames as CutsceneFrame[],
};

export const cutsceneTextureKey = (bg: string): string => `cut-${bg}`;

export function framesOf(id: string): readonly CutsceneFrame[] {
  return CUTSCENES[id] ?? [{ bg: null, speaker: null, textKey: `cutscene.${id}` }];
}
