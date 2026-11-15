import { PALETTE } from '../ui/palette';
import { newRun, routeOf, type HeroId, type PlayerCount } from '../systems/Flow';
import { t } from '../systems/Text';
import { Menu } from '../ui/Menu';
import { uiText } from '../ui/text';
import { BaseScene } from './BaseScene';

const HEROES: readonly HeroId[] = ['sergey', 'ivan'];

/** «1 игрок / 2 игрока», в соло — выбор ведущего. В коопе игрок 1 — Сергей, игрок 2 — Иван. */
export class PlayerSelect extends BaseScene {
  private menu!: Menu;
  private stage: 'count' | 'hero' = 'count';

  constructor() {
    super('PlayerSelect');
  }

  protected build(): void {
    this.showCount();
  }

  protected tick(): void {
    const picked = this.menu.update(this.controls);
    if (picked === null) return;
    if (this.stage === 'count') {
      if (picked === 0) this.showHeroes();
      else this.begin(2, 'sergey');
    } else {
      this.begin(1, HEROES[picked] ?? 'sergey');
    }
  }

  private showCount(): void {
    this.stage = 'count';
    this.children.removeAll(true);
    uiText(this, 32, 64, t('select.title'));
    this.menu = new Menu(
      this,
      [{ label: t('select.onePlayer') }, { label: t('select.twoPlayers') }],
      40,
      96,
      16,
    );
    uiText(this, 32, 208, t('hint.menu'), { color: PALETTE.gray });
  }

  private showHeroes(): void {
    this.stage = 'hero';
    this.children.removeAll(true);
    uiText(this, 32, 64, t('select.hero'));
    this.menu = new Menu(
      this,
      HEROES.map((h) => ({ label: t(`hero.${h}`) })),
      40,
      96,
      16,
    );
    uiText(this, 32, 208, t('hint.menu'), { color: PALETTE.gray });
  }

  private begin(players: PlayerCount, hero: HeroId): void {
    const run = newRun(players, hero);
    this.startRun(run, routeOf(run));
  }
}
