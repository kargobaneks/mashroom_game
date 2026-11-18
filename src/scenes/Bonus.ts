import { spriteFrameName } from '../art/sprites';
import { CLAW } from '../config/bonus';
import { DISPLAY } from '../config/display';
import { SPRITES_TEXTURE } from '../render/spriteAtlas';
import { ClawGame } from '../sim/bonus/ClawGame';
import { rewardCarry, type PlayerCarry } from '../sim/health';
import { playSfx } from '../systems/Audio';
import type { PlayerId } from '../systems/InputState';
import { partnerOf } from '../systems/Flow';
import { t } from '../systems/Text';
import { PALETTE } from '../ui/palette';
import { uiText } from '../ui/text';
import { BaseScene } from './BaseScene';

/** Автомат: корпус, стекло, рейка, лотки. Цвета NES. */
const MACHINE = {
  body: 0xd82800,
  bodyEdge: 0x881400,
  glass: 0x0000bc,
  glassAlpha: 0.35,
  rail: 0xbcbcbc,
  chute: 0x000000,
  cable: 0x7c7c7c,
} as const;
/** Строка счёта игроков под автоматом. */
const SCORE_Y = 222;

/**
 * Бонус-игры между уровнями (ТЗ: «События между уровнями»). «Кран» — автомат с мерчем
 * подкаста: кружка = сердце, звезда = жизнь, 30 секунд, в коопе у каждого свой кран.
 * Выигрыш добавляется к сердцам и жизням, которые перейдут в следующий уровень.
 */
export class Bonus extends BaseScene<{ game: 'crane' }> {
  private claw: ClawGame | null = null;
  private ids: PlayerId[] = [1];
  private sprites = new Map<object, Phaser.GameObjects.Sprite>();
  private cables: Phaser.GameObjects.Rectangle[] = [];
  private timerText!: Phaser.GameObjects.BitmapText;
  private scores: Phaser.GameObjects.BitmapText[] = [];
  private result: Phaser.GameObjects.BitmapText | null = null;
  private delivered = 0;

  constructor() {
    super('Bonus');
  }

  protected build(): void {
    this.claw = null;
    this.sprites = new Map();
    this.cables = [];
    this.scores = [];
    this.result = null;
    this.delivered = 0;
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.ids = this.run.players === 2 ? [1, 2] : [1];
    this.claw = new ClawGame(this.ids, this.run.step + 1);
    this.drawMachine();
    uiText(this, 8, 8, `${t('scene.bonus')}: ${t('bonus.crane').toUpperCase()}`);
    uiText(this, 8, 20, t('bonus.crane.help'), { color: PALETTE.gray });
    this.timerText = uiText(this, DISPLAY.width - 40, 8, '', { color: PALETTE.peach });
    for (const id of this.ids) {
      const x = id === 1 ? 16 : DISPLAY.width / 2 + 8;
      this.scores.push(uiText(this, x, SCORE_Y, ''));
    }
    this.sync();
  }

  private heroOf(id: PlayerId) {
    return id === 1 ? this.run.hero : partnerOf(this.run.hero);
  }

  private drawMachine(): void {
    const b = CLAW.box;
    const pad = 6;
    this.add
      .rectangle(b.x - pad, b.y - pad - 6, b.w + pad * 2, b.h + pad * 2 + 6, MACHINE.body)
      .setOrigin(0)
      .setStrokeStyle(2, MACHINE.bodyEdge);
    this.add.rectangle(b.x, b.y, b.w, b.h, 0x000000).setOrigin(0);
    this.add.rectangle(b.x, b.y, b.w, b.h, MACHINE.glass, MACHINE.glassAlpha).setOrigin(0);
    // Рейка крана.
    this.add.rectangle(b.x, CLAW.claw.restY - 6, b.w, 3, MACHINE.rail).setOrigin(0);
    // Лотки выдачи с инициалами игроков.
    for (const c of this.claw?.claws ?? []) {
      const x = c.chuteX - CLAW.chuteW / 2;
      this.add
        .rectangle(x, b.y + b.h - 4, CLAW.chuteW, 4, MACHINE.chute)
        .setOrigin(0)
        .setStrokeStyle(1, MACHINE.rail);
      uiText(this, c.chuteX - 3, b.y + b.h + 2, t(`hero.${this.heroOf(c.player)}.initial`), {
        color: PALETTE.peach,
      });
    }
  }

  private sprite(key: object, id: string, frame: string): Phaser.GameObjects.Sprite {
    let s = this.sprites.get(key);
    if (!s) {
      s = this.add.sprite(0, 0, SPRITES_TEXTURE, spriteFrameName(id, frame)).setOrigin(0);
      this.sprites.set(key, s);
    }
    return s.setFrame(spriteFrameName(id, frame));
  }

  private sync(): void {
    const g = this.claw;
    if (!g) return;
    for (const p of g.prizes) {
      const s = this.sprite(p, p.kind === 'mug' ? 'coffee' : 'star', 'a');
      s.setPosition(Math.round(p.x), Math.round(p.y)).setVisible(!p.gone).setDepth(2);
    }
    g.claws.forEach((c, i) => {
      const cable =
        this.cables[i] ?? this.add.rectangle(0, 0, 2, 1, MACHINE.cable).setOrigin(0).setDepth(1);
      this.cables[i] = cable;
      const top = CLAW.claw.restY - 4;
      cable.setPosition(Math.round(c.x + c.w / 2 - 1), top).setSize(2, Math.max(1, c.y - top));
      const open = c.state === 'idle' || c.state === 'drop';
      this.sprite(c, 'claw', open ? 'open' : 'closed')
        .setPosition(Math.round(c.x), Math.round(c.y))
        .setDepth(3);
    });
    const sec = Math.ceil(g.timer / 60);
    this.timerText.setText(`${Math.floor(sec / 60)}'${String(sec % 60).padStart(2, '0')}`);
    this.ids.forEach((id, i) => {
      const w = g.won.get(id)!;
      this.scores[i]!.setText(`${t(`hero.${this.heroOf(id)}.initial`)}: ♥${w.mug}  ★${w.star}`);
    });
  }

  protected tick(): void {
    const g = this.claw;
    if (!g) return;
    if (this.result) {
      if (this.controls.anyPressed('jump', 'start'))
        this.go({ type: 'done', carry: this.carryOut() });
      return;
    }
    g.step({ 1: this.controls.player(1), 2: this.controls.player(2) });
    const total = this.ids.reduce((n, id) => n + g.total(id), 0);
    if (total > this.delivered) {
      playSfx(this, 'pickup');
      this.delivered = total;
    }
    this.sync();
    if (g.finished) this.showResult();
  }

  private showResult(): void {
    const g = this.claw!;
    const lines = this.ids.map((id) => {
      const w = g.won.get(id)!;
      return t('bonus.crane.result', {
        who: t(`hero.${this.heroOf(id)}`),
        hearts: w.mug,
        lives: w.star,
      });
    });
    this.add
      .rectangle(24, 80, DISPLAY.width - 48, 72, PALETTE.black)
      .setOrigin(0)
      .setStrokeStyle(1, PALETTE.white)
      .setDepth(10);
    this.result = uiText(this, 32, 88, [t('bonus.crane.over'), ...lines].join('\n')).setDepth(11);
    uiText(this, 32, 136, t('hint.confirm'), { color: PALETTE.gray }).setDepth(11);
    playSfx(this, 'life');
  }

  /** Выигрыш — к сердцам и жизням, которые перейдут в следующий уровень. */
  private carryOut(): PlayerCarry[] {
    const g = this.claw!;
    return rewardCarry(this.run.carry, this.ids, (id) => {
      const w = g.won.get(id)!;
      return { hearts: w.mug, lives: w.star };
    });
  }
}
