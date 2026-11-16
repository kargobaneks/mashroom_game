import { BALANCE } from '../config/balance';
import { rewardCarry } from '../sim/health';
import { playSfx } from '../systems/Audio';
import type { PlayerId } from '../systems/InputState';
import { t } from '../systems/Text';
import { Menu } from '../ui/Menu';
import { PALETTE } from '../ui/palette';
import { uiText } from '../ui/text';
import { BaseScene } from './BaseScene';

/** Пункты меню: «хайп» — 0, «смысл» — 1. */
const MEANING = 1;
/** Результат не пролистывается тем же (или двойным) нажатием, кадры. */
const RESULT_LOCK_FRAMES = 20;

/**
 * Выбор провода после уровня 1 (ТЗ: «События между уровнями»). «Смысл» — бомба гаснет,
 * +1 жизнь каждому игроку; «хайп» — взрыв конфетти, ничего не теряем.
 */
export class WireChoice extends BaseScene {
  private menu!: Menu;
  private picked: number | null = null;
  private lock = 0;

  constructor() {
    super('WireChoice');
  }

  protected build(): void {
    this.picked = null;
    uiText(this, 32, 64, t('scene.wire'));
    this.menu = new Menu(
      this,
      [{ label: t('wire.hype') }, { label: t('wire.meaning') }],
      40,
      96,
      16,
    );
    uiText(this, 32, 208, t('hint.menu'), { color: PALETTE.gray });
  }

  protected tick(): void {
    if (this.picked !== null) {
      if (this.lock > 0) this.lock--;
      else if (this.controls.anyPressed('jump', 'start')) this.finish();
      return;
    }
    const pick = this.menu.update(this.controls);
    if (pick === null) return;
    this.picked = pick;
    this.lock = RESULT_LOCK_FRAMES;
    const meaning = pick === MEANING;
    playSfx(this, meaning ? 'life' : 'bossDefeated');
    uiText(this, 32, 144, t(meaning ? 'wire.meaning.result' : 'wire.hype.result'), {
      color: meaning ? PALETTE.lime : PALETTE.peach,
    });
    uiText(this, 32, 224, t('hint.confirm'), { color: PALETTE.gray });
  }

  private finish(): void {
    const ids: PlayerId[] = this.run.players === 2 ? [1, 2] : [1];
    const lives = this.picked === MEANING ? BALANCE.wireMeaningLives : 0;
    this.go({
      type: 'done',
      carry: rewardCarry(this.run.carry, ids, () => ({ hearts: 0, lives })),
    });
  }
}
