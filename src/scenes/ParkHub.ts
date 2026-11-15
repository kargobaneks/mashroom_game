import { PALETTE } from '../ui/palette';
import { FINAL_LEVEL, PARK_LEVELS, type LevelId } from '../config/levels';
import { parkOptions } from '../systems/Flow';
import { t } from '../systems/Text';
import { Menu } from '../ui/Menu';
import { uiText } from '../ui/text';
import { BaseScene } from './BaseScene';

/** Хаб медиапарка: аттракционы 6–8 в любом порядке, ворота студии после трёх ключей. */
export class ParkHub extends BaseScene {
  private menu!: Menu;
  private choices: LevelId[] = [];

  constructor() {
    super('ParkHub');
  }

  protected build(): void {
    const { remaining, gateOpen } = parkOptions(this.run);
    const have = this.run.parkKeys.length;
    const need = PARK_LEVELS.length;
    uiText(this, 32, 48, t('scene.park'));
    uiText(this, 32, 64, t('park.keys', { have, need }), { color: PALETTE.peach });

    const items = PARK_LEVELS.map((l) => ({
      label: t(`level.${l}.name`),
      enabled: remaining.includes(l),
    }));
    items.push({
      label: gateOpen ? t('park.gate') : t('park.gateLocked', { have, need }),
      enabled: gateOpen,
    });
    this.choices = [...PARK_LEVELS, FINAL_LEVEL];
    this.menu = new Menu(this, items, 24, 96, 16);
    uiText(this, 32, 208, t('hint.menu'), { color: PALETTE.gray });
  }

  protected tick(): void {
    const picked = this.menu.update(this.controls);
    const level = picked === null ? undefined : this.choices[picked];
    if (level !== undefined) this.go({ type: 'parkPick', level });
  }
}
