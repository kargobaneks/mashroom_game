import type Phaser from 'phaser';
import { DISPLAY } from '../config/display';
import type { Player } from '../sim/Player';
import type { World } from '../sim/World';
import { t } from '../systems/Text';
import { PALETTE } from '../ui/palette';
import { uiText } from '../ui/text';

const HUD_DEPTH = 1000;
const MARGIN = 8;
const BOSS_BAR = { width: 96, height: 4, y: 16 } as const;
/** Шкала паники (арена Уралова): под «хронометражем». Мигает, пока управление инвертировано. */
const PANIC_BAR = { width: 64, height: 3, y: 24, labelGap: 4, blinkFrames: 8 } as const;

/**
 * HUD поверх игры, как в оригинале: внизу слева — инициал и сердечки игрока 1,
 * справа — игрока 2; вверху по центру на арене — «хронометраж» босса.
 */
export class Hud {
  private readonly players: {
    p: Player;
    initial: Phaser.GameObjects.BitmapText;
    hearts: Phaser.GameObjects.BitmapText;
  }[];
  private readonly bossName: Phaser.GameObjects.BitmapText;
  private readonly bossBarBg: Phaser.GameObjects.Rectangle;
  private readonly bossBar: Phaser.GameObjects.Rectangle;
  private readonly panicLabel: Phaser.GameObjects.BitmapText;
  private readonly panicBg: Phaser.GameObjects.Rectangle;
  private readonly panicBar: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    private readonly world: World,
  ) {
    const fix = <
      T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth,
    >(
      o: T,
    ): T => {
      o.setScrollFactor(0);
      o.setDepth(HUD_DEPTH);
      return o;
    };
    const y = DISPLAY.height - 28;
    this.players = world.players.map((p) => {
      const right = p.id === 2;
      const x = right ? DISPLAY.width - MARGIN : MARGIN;
      const initial = fix(uiText(scene, x, y, t(`hero.${p.hero}.initial`)));
      const hearts = fix(uiText(scene, x, y + 11, '', { color: PALETTE.red }));
      if (right) {
        initial.setOrigin(1, 0);
        hearts.setOrigin(1, 0);
      }
      return { p, initial, hearts };
    });
    this.bossName = fix(uiText(scene, DISPLAY.width / 2, 4, '', { align: 'center' })).setVisible(
      false,
    );
    const bx = (DISPLAY.width - BOSS_BAR.width) / 2;
    this.bossBarBg = fix(
      scene.add
        .rectangle(bx, BOSS_BAR.y, BOSS_BAR.width, BOSS_BAR.height, PALETTE.darkGray)
        .setOrigin(0),
    );
    this.bossBar = fix(
      scene.add
        .rectangle(bx, BOSS_BAR.y, BOSS_BAR.width, BOSS_BAR.height, PALETTE.pink)
        .setOrigin(0),
    );
    this.bossBarBg.setVisible(false);
    this.bossBar.setVisible(false);
    const px = (DISPLAY.width - PANIC_BAR.width) / 2;
    this.panicLabel = fix(uiText(scene, px - PANIC_BAR.labelGap, PANIC_BAR.y - 2, t('hud.panic')))
      .setOrigin(1, 0)
      .setVisible(false);
    this.panicBg = fix(
      scene.add
        .rectangle(px, PANIC_BAR.y, PANIC_BAR.width, PANIC_BAR.height, PALETTE.darkGray)
        .setOrigin(0),
    ).setVisible(false);
    this.panicBar = fix(
      scene.add
        .rectangle(px, PANIC_BAR.y, PANIC_BAR.width, PANIC_BAR.height, PALETTE.red)
        .setOrigin(0),
    ).setVisible(false);
  }

  update(): void {
    for (const { p, initial, hearts } of this.players) {
      const v = p.vitals;
      initial.setTint(p.out ? PALETTE.gray : PALETTE.white);
      hearts.setText(
        p.out
          ? ''
          : '♥'.repeat(Math.max(0, v.hearts)) + '♡'.repeat(Math.max(0, v.maxHearts - v.hearts)),
      );
    }
    const boss = this.world.boss;
    const on = boss !== null && !boss.waiting;
    this.bossName.setVisible(on);
    this.bossBarBg.setVisible(on);
    this.bossBar.setVisible(on);
    if (boss && on) {
      this.bossName.setText(t(`boss.${boss.name}.name`));
      this.bossBar.width = Math.round((BOSS_BAR.width * Math.max(0, boss.hp)) / boss.maxHp);
    }
    const w = this.world;
    const panicOn = on && boss.name === 'uralov' && !boss.defeated;
    const blinkOff = w.controlsInverted && Math.floor(w.frame / PANIC_BAR.blinkFrames) % 2 === 1;
    this.panicLabel.setVisible(panicOn);
    this.panicBg.setVisible(panicOn);
    this.panicBar.setVisible(panicOn && !blinkOff);
    this.panicBar.width = Math.max(1, Math.round((PANIC_BAR.width * w.panic) / 100));
  }
}
