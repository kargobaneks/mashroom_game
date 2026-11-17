import { DEBUG_KEYS, DEBUG_SLOW_MOTION_STEPS } from '../config/controls';
import { DISPLAY } from '../config/display';
import { LEVEL_IDS, PARK_LEVELS, type LevelId } from '../config/levels';
import { BALANCE } from '../config/balance';
import { artTextureKey, bossPartIndex, LEVELS } from '../data/levels';
import { Hud } from '../render/Hud';
import { LevelView } from '../render/LevelView';
import { parseTiledLevel } from '../sim/level';
import { World, type PlayerCarry, type PlayerSetup, type WorldEvent } from '../sim/World';
import { playMusic, playSfx, stopMusic } from '../systems/Audio';
import { partnerOf, runAtLevel } from '../systems/Flow';
import { ACTIONS, type PlayerId } from '../systems/InputState';
import { t } from '../systems/Text';
import { DialogueBox } from '../ui/DialogueBox';
import { Menu } from '../ui/Menu';
import { LEVEL_BACKGROUNDS, PALETTE } from '../ui/palette';
import { uiText } from '../ui/text';
import { BaseScene } from './BaseScene';

/** Пауза после победы над боссом / конца игры перед следующим экраном, кадры. */
const AFTER_EVENT_FRAMES = 60;
/** Переход между частями уровня: затемнение и проявление, мс. */
const PART_FADE_MS = 400;
const OVERLAY_DEPTH = 3000;

type Mode =
  | { kind: 'play' }
  | { kind: 'dialogue'; box: DialogueBox; then: () => void }
  | { kind: 'paused'; menu: Menu; objects: Phaser.GameObjects.GameObject[] }
  | { kind: 'levelSelect'; menu: Menu; objects: Phaser.GameObjects.GameObject[] }
  | { kind: 'wait'; frames: number; then: () => void }
  /** Мир продолжает идти, пока не выполнится условие (босс опускается на пол). */
  | { kind: 'watch'; until: () => boolean; then: () => void };

/** Данные сцены: уровень, часть (0 — с начала), перенос игроков из прошлой части. */
interface LevelSceneData {
  level: LevelId;
  part?: number;
  carry?: readonly PlayerCarry[];
  /** Отладка F2: сразу к арене. */
  warpToBoss?: boolean;
}

export class Level extends BaseScene<LevelSceneData> {
  private world: World | null = null;
  private view: LevelView | null = null;
  private hud: Hud | null = null;
  private mode: Mode = { kind: 'play' };
  private slowMotion = false;
  private god = false;
  private stepCounter = 0;
  private levelId: LevelId = 1;
  private partIndex = 0;
  /** Заглушка для уровней без карты. */
  private monitors: { id: PlayerId; text: Phaser.GameObjects.BitmapText }[] = [];

  constructor() {
    super('Level');
  }

  protected build({ level, part = 0, carry = [], warpToBoss = false }: LevelSceneData): void {
    this.levelId = level;
    this.partIndex = part;
    this.mode = { kind: 'play' };
    this.world = null;
    this.slowMotion = false;
    this.god = false;
    if (import.meta.env.DEV) this.bindDebugKeys();

    const asset = LEVELS[level]?.[part];
    if (!asset) {
      this.buildStub(level);
      return;
    }
    const run = this.run;
    const setup: PlayerSetup[] =
      run.players === 2
        ? [
            { id: 1, hero: run.hero },
            { id: 2, hero: partnerOf(run.hero) },
          ]
        : [{ id: 1, hero: run.hero }];
    const map = asset.map;
    // Начало уровня — с тем, что принесли из прошлых уровней и бонус-игр.
    const carryIn = part === 0 && carry.length === 0 ? this.run.carry : carry;
    this.world = new World(parseTiledLevel(map), setup, level * 10 + part, carryIn);
    if (warpToBoss) this.world.warpToBoss();
    if (part > 0) this.cameras.main.fadeIn(PART_FADE_MS, 0, 0, 0);
    playMusic(this, `level${level}`);
    this.cameras.main.setBackgroundColor(PALETTE.black);
    this.view = new LevelView(this, this.world, map, asset.artTileset, {
      tileset: asset.artTileset,
      textureKey: artTextureKey(asset.artTileset),
    });
    this.hud = new Hud(this, this.world);
    this.syncCamera();
    this.view.sync();
    this.hud.update();
  }

  protected tick(): void {
    switch (this.mode.kind) {
      case 'dialogue':
        if (this.mode.box.update(this.controls)) {
          const then = this.mode.then;
          this.mode = { kind: 'play' };
          then();
        }
        return;
      case 'paused':
        this.tickPause(this.mode.menu);
        return;
      case 'levelSelect':
        this.tickLevelSelect(this.mode.menu);
        return;
      case 'wait':
        if (--this.mode.frames <= 0) this.mode.then();
        return;
      case 'watch': {
        const w = this.world;
        if (w) {
          w.stepCinematic();
          this.syncCamera();
          this.view?.sync();
          this.hud?.update();
        }
        if (this.mode.until()) this.mode.then();
        return;
      }
      case 'play':
        break;
    }

    const world = this.world;
    if (!world) {
      this.tickStub();
      return;
    }
    if (this.controls.anyPressed('start')) {
      this.openPause();
      return;
    }
    this.stepCounter++;
    if (!this.slowMotion || this.stepCounter % DEBUG_SLOW_MOTION_STEPS === 0) {
      world.step({ 1: this.controls.player(1), 2: this.controls.player(2) });
    }
    for (const ev of world.drainEvents()) this.onWorldEvent(ev);
    this.syncCamera();
    this.view?.sync();
    this.hud?.update();
  }

  private syncCamera(): void {
    if (!this.world) return;
    this.cameras.main.setScroll(Math.round(this.world.camera.x), Math.round(this.world.camera.y));
  }

  private onWorldEvent(ev: WorldEvent): void {
    const world = this.world;
    if (!world) return;
    switch (ev.type) {
      case 'bossIntro':
        playMusic(this, 'boss');
        this.mode = {
          kind: 'dialogue',
          box: new DialogueBox(this, t(`boss.${ev.boss}.name`), t(`boss.${ev.boss}.intro`)),
          then: () => world.resume(),
        };
        return;
      case 'bossPhase':
        // Вторая фаза Агранович: подвал превращается в съёмочную площадку — цветной свет.
        if (world.boss?.name !== 'agranovich') return;
        this.view?.tintArea(
          world.camera.segment,
          LEVEL_BACKGROUNDS.filmSet,
          LEVEL_BACKGROUNDS.filmSetAlpha,
        );
        return;
      case 'bossDefeated': {
        stopMusic(this);
        playSfx(this, 'bossDefeated');
        const boss = world.boss;
        // Гость приведён в чувство: заглушка слетает облаком, он опускается на пол и говорит.
        if (boss) this.view?.burstFrom(boss);
        this.mode = {
          kind: 'watch',
          until: () => boss?.landed ?? true,
          then: () => {
            this.mode = {
              kind: 'dialogue',
              box: new DialogueBox(
                this,
                t(`boss.${boss?.name}.name`),
                t(`boss.${boss?.name}.outro`),
              ),
              then: () => this.go({ type: 'done', carry: world.carryOut() }),
            };
          },
        };
        return;
      }
      case 'exit':
        // Игрок вошёл в дверь: экран гаснет, следующая часть проявляется из темноты.
        playSfx(this, 'trigger');
        this.mode = { kind: 'wait', frames: Number.POSITIVE_INFINITY, then: () => undefined };
        this.cameras.main.fadeOut(PART_FADE_MS, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.nextPart(world));
        return;
      case 'helper':
        // Петровский: реплика, сердца уже восстановлены.
        this.mode = {
          kind: 'dialogue',
          box: new DialogueBox(this, t(`helper.${ev.who}.name`), t(`helper.${ev.who}.line`)),
          then: () => world.resume(),
        };
        return;
      case 'gameOver':
        stopMusic(this);
        this.mode = {
          kind: 'wait',
          frames: AFTER_EVENT_FRAMES,
          then: () => this.go({ type: 'gameOver' }),
        };
        return;
      case 'sfx':
        playSfx(this, ev.name);
        return;
      case 'duet':
        playSfx(this, 'duet');
        return;
      case 'pickup':
        playSfx(this, ev.kind === 'star' ? 'life' : ev.kind);
        return;
    }
  }

  /** Следующая часть уровня: здоровье, жизни и таймкоды переносятся. */
  private nextPart(world: World): void {
    const parts = LEVELS[this.levelId] ?? [];
    if (this.partIndex + 1 >= parts.length) {
      this.go({ type: 'done', carry: world.carryOut() });
      return;
    }
    this.restartLevel({ level: this.levelId, part: this.partIndex + 1, carry: world.carryOut() });
  }

  private restartLevel(data: LevelSceneData): void {
    this.scene.restart(data);
  }

  // ——— пауза ———

  private openPause(): void {
    const world = this.world;
    if (!world) return;
    const objects: Phaser.GameObjects.GameObject[] = [];
    const add = <
      T extends Phaser.GameObjects.GameObject &
        Phaser.GameObjects.Components.ScrollFactor &
        Phaser.GameObjects.Components.Depth,
    >(
      o: T,
    ): T => {
      o.setScrollFactor(0).setDepth(OVERLAY_DEPTH);
      objects.push(o);
      return o;
    };
    add(this.add.rectangle(0, 0, DISPLAY.width, DISPLAY.height, PALETTE.black, 0.85).setOrigin(0));
    add(uiText(this, DISPLAY.width / 2, 24, t('pause.title'), { align: 'center' }));
    let y = 48;
    for (const p of world.players) {
      const line = `${t(`hero.${p.hero}`)}: ${t('hud.lives', { n: p.vitals.lives })}  ${t('hud.timecodes', { n: p.timecodes })}`;
      add(uiText(this, 24, y, line, { color: PALETTE.peach }));
      y += 12;
    }
    add(
      uiText(this, 24, y, t('pause.letters', { n: 0, need: BALANCE.metamodernLetters }), {
        color: PALETTE.gray,
      }),
    );
    add(
      uiText(
        this,
        24,
        y + 12,
        t('pause.keys', { n: this.run.parkKeys.length, need: PARK_LEVELS.length }),
        { color: PALETTE.gray },
      ),
    );
    const menu = new Menu(this, this.pauseItems(), 40, 136, 16);
    menu.setDepth(OVERLAY_DEPTH).setScrollFactor(0);
    this.mode = { kind: 'paused', menu, objects: [...objects, ...menu.objects] };
  }

  private pauseItems(): { label: string }[] {
    return [
      { label: t('pause.resume') },
      { label: this.sound.mute ? t('pause.soundOff') : t('pause.soundOn') },
      { label: t('pause.quit') },
    ];
  }

  private tickPause(menu: Menu): void {
    if (this.controls.anyPressed('start')) {
      this.closeOverlay();
      return;
    }
    const picked = menu.update(this.controls);
    if (picked === 0) this.closeOverlay();
    else if (picked === 1) {
      this.sound.mute = !this.sound.mute;
      menu.setLabels(this.pauseItems());
    } else if (picked === 2) this.go({ type: 'quit' });
  }

  private closeOverlay(): void {
    if (this.mode.kind === 'paused' || this.mode.kind === 'levelSelect') {
      for (const o of this.mode.objects) o.destroy();
    }
    this.mode = { kind: 'play' };
  }

  // ——— отладка ———

  private bindDebugKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on(`keydown-${DEBUG_KEYS.god}`, () => {
      this.god = !this.god;
      this.world?.setGod(this.god);
    });
    kb.on(`keydown-${DEBUG_KEYS.warpToBoss}`, () => {
      if (this.mode.kind !== 'play' || !this.world) return;
      const bossPart = bossPartIndex(LEVELS[this.levelId] ?? []);
      if (bossPart < 0 || bossPart === this.partIndex) this.world.warpToBoss();
      else this.restartLevel({ level: this.levelId, part: bossPart, warpToBoss: true });
    });
    kb.on(`keydown-${DEBUG_KEYS.nextPart}`, () => {
      const parts = LEVELS[this.levelId] ?? [];
      if (this.mode.kind === 'play' && this.partIndex + 1 < parts.length)
        this.restartLevel({ level: this.levelId, part: this.partIndex + 1 });
    });
    kb.on(`keydown-${DEBUG_KEYS.levelSelect}`, () => {
      if (this.mode.kind === 'play') this.openLevelSelect();
    });
    kb.on(`keydown-${DEBUG_KEYS.hitboxes}`, () => {
      if (this.view) this.view.showHitboxes = !this.view.showHitboxes;
    });
    kb.on(`keydown-${DEBUG_KEYS.slowMotion}`, () => {
      this.slowMotion = !this.slowMotion;
    });
  }

  private openLevelSelect(): void {
    const bg = this.add
      .rectangle(0, 0, DISPLAY.width, DISPLAY.height, PALETTE.black, 0.9)
      .setOrigin(0);
    const title = uiText(this, 24, 16, t('debug.levelSelect'));
    for (const o of [bg, title]) o.setScrollFactor(0).setDepth(OVERLAY_DEPTH);
    const menu = new Menu(
      this,
      LEVEL_IDS.map((l) => ({ label: `${l}. ${t(`level.${l}.name`)}` })),
      24,
      36,
      14,
    );
    menu.setDepth(OVERLAY_DEPTH).setScrollFactor(0);
    this.mode = { kind: 'levelSelect', menu, objects: [bg, title, ...menu.objects] };
  }

  private tickLevelSelect(menu: Menu): void {
    if (this.controls.anyPressed('start')) {
      this.closeOverlay();
      return;
    }
    const picked = menu.update(this.controls);
    const level = picked === null ? undefined : LEVEL_IDS[picked];
    if (level === undefined) return;
    this.registry.set('run', runAtLevel(this.run, level));
    this.switchTo({ scene: 'Level', level });
  }

  // ——— заглушка для уровней без карты ———

  private buildStub(level: LevelId): void {
    this.cameras.main.setBackgroundColor(PALETTE.black);
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

  private tickStub(): void {
    const labels: Record<(typeof ACTIONS)[number], string> = {
      left: '←',
      right: '→',
      up: '↑',
      down: '↓',
      jump: 'J',
      action: 'A',
      start: 'S',
    };
    for (const m of this.monitors) {
      const p = this.controls.player(m.id);
      m.text.setText(ACTIONS.map((a) => (p.down(a) ? labels[a] : '·')).join(' '));
    }
    if (this.controls.anyPressed('jump')) this.go({ type: 'done' });
    else if (this.controls.anyPressed('action')) this.go({ type: 'gameOver' });
  }
}
