import { PALETTE } from '../ui/palette';
import type { LevelId } from '../config/levels';
import { partnerOf } from '../systems/Flow';
import { ACTIONS, type PlayerId } from '../systems/InputState';
import { t } from '../systems/Text';
import { uiText } from '../ui/text';
import { BaseScene } from './BaseScene';

const ACTION_LABELS: Record<(typeof ACTIONS)[number], string> = {
  left: '←',
  right: '→',
  up: '↑',
  down: '↓',
  jump: 'J',
  action: 'A',
  start: 'S',
};

/**
 * Заглушка уровня. Показывает монитор ввода обоих игроков — так проверяется
 * клавиатура и геймпады до появления игрока (этап 1).
 */
export class Level extends BaseScene<{ level: LevelId }> {
  private monitors: { id: PlayerId; text: Phaser.GameObjects.BitmapText }[] = [];

  constructor() {
    super('Level');
  }

  protected build({ level }: { level: LevelId }): void {
    uiText(this, 8, 8, t('scene.level', { n: level }));
    uiText(this, 8, 24, t(`level.${level}.name`), { color: PALETTE.peach });
    uiText(this, 8, 56, t('hint.inputMonitor'), { color: PALETTE.gray });

    const p1 = this.run.hero;
    const ids: PlayerId[] = this.run.players === 2 ? [1, 2] : [1];
    this.monitors = ids.map((id, i) => {
      const hero = id === 1 ? p1 : partnerOf(p1);
      uiText(this, 8, 72 + i * 16, `P${id} ${t(`hero.${hero}`)}`);
      return { id, text: uiText(this, 88, 72 + i * 16, '', { color: PALETTE.lime }) };
    });
    uiText(this, 8, 208, t('hint.stubLevel'), { color: PALETTE.gray });
  }

  protected tick(): void {
    for (const m of this.monitors) {
      const p = this.controls.player(m.id);
      m.text.setText(ACTIONS.map((a) => (p.down(a) ? ACTION_LABELS[a] : '·')).join(' '));
    }
    if (this.controls.anyPressed('jump')) this.go({ type: 'done' });
    else if (this.controls.anyPressed('action')) this.go({ type: 'gameOver' });
  }
}
