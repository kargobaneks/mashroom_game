import { ENEMIES } from '../config/enemies';
import { FREEZER } from '../config/mechanisms';
import { PLAYER_PHYSICS as P } from '../config/physics';
import type { HeroId } from '../systems/Flow';
import type { Action, PlayerId } from '../systems/InputState';
import { newVitals, takeHit, type Vitals } from './health';
import type { Facing, Rect } from './geom';
import { overlaps } from './geom';
import type { Item, ThrowDir } from './Item';
import { moveBody, type Body } from './physics';
import type { World } from './World';

/** Состояния игрока из ТЗ. carry — стоит, идёт или прыгает с предметом в руках. */
export type PlayerState =
  | 'idle'
  | 'walk'
  | 'crouch'
  | 'jump'
  | 'fall'
  | 'carry'
  | 'throw'
  | 'hidden'
  | 'held'
  | 'stunned'
  | 'hurt'
  | 'dead'
  | 'respawn';

/** То, что игрок может держать над головой: предмет или напарника. */
export type Carried =
  | { readonly kind: 'item'; readonly item: Item }
  | { readonly kind: 'player'; readonly player: Player };

/** Ввод одного игрока на шаг (см. systems/InputState.PlayerInput). */
export interface InputView {
  down(a: Action): boolean;
  pressed(a: Action): boolean;
  released(a: Action): boolean;
}

/** Состояния, в которых игрок управляем. */
const CONTROLLED: ReadonlySet<PlayerState> = new Set([
  'idle',
  'walk',
  'crouch',
  'jump',
  'fall',
  'carry',
  'throw',
]);

export class Player implements Body {
  x: number;
  y: number;
  w: number = P.hitboxStanding.width;
  h: number = P.hitboxStanding.height;
  vx = 0;
  vy = 0;
  onGround = false;
  facing: Facing = 1;
  state: PlayerState = 'fall';
  /** Таймер текущего состояния (hurt, stunned, dead, respawn), кадры. */
  stateTimer = 0;
  /** Кадры анимации броска. */
  throwTimer = 0;
  readonly vitals: Vitals = newVitals();
  carrying: Carried | null = null;
  heldBy: Player | null = null;
  /** Летит, брошенный напарником: не управляется и не получает урона до приземления. */
  thrownFlight = false;
  /** Брошенный напарник уже ударил босса в этом полёте. */
  thrownHit = false;
  /** Прыжок начат кнопкой — его можно оборвать, отпустив кнопку. */
  jumping = false;
  crouching = false;
  dropThroughTimer = 0;
  coyoteTimer = 0;
  jumpBufferTimer = 0;
  /** Прилипшие звёздочки-сноски. */
  slowStacks = 0;
  slowTimer = 0;
  timecodes = 0;
  /** Кадр последней попытки «реплики дуэтом». */
  duetFrame = -Infinity;
  /** Отладка: неуязвимость (F1). */
  god = false;

  constructor(
    readonly id: PlayerId,
    readonly hero: HeroId,
    /** Низ-центр. */
    x: number,
    y: number,
  ) {
    this.x = x - this.w / 2;
    this.y = y - this.h;
  }

  get active(): boolean {
    return this.vitals.lives > 0 && this.state !== 'dead';
  }

  get out(): boolean {
    return this.vitals.lives <= 0;
  }

  get controlled(): boolean {
    return CONTROLLED.has(this.state);
  }

  get invulnerable(): boolean {
    return (
      this.god ||
      this.vitals.invuln > 0 ||
      this.thrownFlight ||
      this.state === 'hidden' ||
      this.state === 'held' ||
      this.state === 'dead' ||
      this.state === 'respawn'
    );
  }

  get carriedItem(): Item | null {
    return this.carrying?.kind === 'item' ? this.carrying.item : null;
  }

  /** Поставить ногами в точку (низ-центр). */
  placeAt(x: number, y: number): void {
    this.setStanding();
    this.x = x - this.w / 2;
    this.y = y - this.h;
    this.vx = 0;
    this.vy = 0;
  }

  update(input: InputView, world: World): void {
    if (this.vitals.invuln > 0) this.vitals.invuln--;
    if (this.slowTimer > 0 && --this.slowTimer === 0) this.slowStacks = 0;
    if (this.dropThroughTimer > 0) this.dropThroughTimer--;
    if (this.throwTimer > 0) this.throwTimer--;

    switch (this.state) {
      case 'dead':
        if (--this.stateTimer <= 0) world.onDeathFinished(this);
        return;
      case 'respawn':
        if (--this.stateTimer <= 0) {
          this.state = 'fall';
          this.vitals.invuln = P.invulnerableFrames;
        }
        return;
      case 'held':
        if (input.pressed('jump')) this.breakFree();
        return;
      case 'hidden':
        this.updateHidden(input, world);
        return;
      case 'stunned':
      case 'hurt':
        this.physics(world, false);
        if (--this.stateTimer <= 0) this.recomputeState();
        return;
      default:
        this.updateControlled(input, world);
    }
  }

  // ——— управляемые состояния ———

  private updateControlled(input: InputView, world: World): void {
    if (this.thrownFlight) {
      this.physics(world, false);
      if (this.onGround) this.thrownFlight = false;
      this.recomputeState();
      return;
    }

    const item = this.carriedItem;
    const heavy = item?.heavy ?? false;

    // Вниз на земле: с предметом — спрятаться, без — присесть.
    // Вниз + прыжок с предметом на тонкой платформе — спрыгнуть (с ящиком в руках тоже).
    let droppedWithItem = false;
    if (
      this.onGround &&
      item &&
      input.down('down') &&
      input.pressed('jump') &&
      this.standsOnOneway(world)
    ) {
      this.dropThroughTimer = P.dropThroughFrames;
      droppedWithItem = true;
    } else if (this.onGround && input.pressed('down') && !input.pressed('jump') && item?.hideable) {
      this.enterHide(item);
      return;
    }
    const wantCrouch = this.onGround && input.down('down') && this.carrying === null;
    this.setCrouch(wantCrouch, world);

    // Ходьба: мгновенная скорость, как на NES.
    // Паника на 100% (арена Уралова): влево и вправо меняются местами.
    const flip = world.controlsInverted ? -1 : 1;
    const dir = ((input.down('right') ? 1 : 0) - (input.down('left') ? 1 : 0)) * flip;
    if (dir !== 0) this.facing = dir > 0 ? 1 : -1;
    const base = heavy ? P.walkSpeedHeavyItem : this.carrying ? P.walkSpeedLightItem : P.walkSpeed;
    const slow = 1 / (1 + this.slowStacks);
    const target = this.crouching ? 0 : dir * base * slow;
    if (this.onGround && world.onIce(this)) {
      // Скользкий пол холодильника: разгон и торможение не сразу (ТЗ: «инерция 0,05»).
      const d = target - this.vx;
      this.vx += Math.max(-FREEZER.ice.accel, Math.min(FREEZER.ice.accel, d));
    } else {
      this.vx = target;
    }

    // Прыжок, спрыгивание с тонкой платформы.
    if (this.onGround) this.coyoteTimer = P.coyoteFrames;
    else if (this.coyoteTimer > 0) this.coyoteTimer--;
    if (input.pressed('jump') && !droppedWithItem) this.jumpBufferTimer = P.jumpBufferFrames + 1;
    else if (this.jumpBufferTimer > 0) this.jumpBufferTimer--;

    const canJump = this.onGround || this.coyoteTimer > 0;
    if (this.jumpBufferTimer > 0 && canJump) {
      this.jumpBufferTimer = 0;
      if (this.crouching) {
        this.tryDropThrough(world);
      } else {
        this.vy = heavy ? P.jumpVelocityHeavyItem : P.jumpVelocity;
        this.jumping = true;
        this.coyoteTimer = 0;
        this.onGround = false;
        // Звёздочки стряхиваются прыжком.
        this.slowStacks = 0;
        this.slowTimer = 0;
        world.emit({ type: 'sfx', name: 'jump' });
      }
    }
    if (this.jumping && !input.down('jump') && this.vy < P.jumpCutVelocity)
      this.vy = P.jumpCutVelocity;

    // Действие: бросить то, что в руках, или взять — уперевшись (стрелка в сторону предмета зажата).
    // ↑ + действие с пустыми руками — реплика дуэтом.
    if (input.pressed('action')) {
      if (this.carrying) this.throwCarried(this.throwDirection(input), world);
      else if (input.down('up')) world.registerDuet(this);
      else if (this.crouching) this.tryDropThrough(world);
      else if (input.down(this.facing * flip > 0 ? 'right' : 'left')) this.tryPickUp(world);
    }

    this.physics(world, true);
    this.recomputeState();
  }

  private throwDirection(input: InputView): ThrowDir {
    if (input.down('up')) return 'up';
    if (input.down('down')) return 'ground';
    return 'forward';
  }

  /** Гравитация, движение, столкновения, экран, опасные тайлы. */
  private physics(world: World, clampToScreen: boolean): void {
    const g = P.gravity + world.extraGravityAt(this);
    this.vy = Math.min(this.vy + g, P.maxFallSpeed);
    // Ветер от крыльев босса сдувает (и в прыжке, и с ящиком).
    const wind = this.state === 'hidden' ? 0 : world.windFor(this);
    this.vx += wind;
    const res = moveBody(this, world.grid, {
      dropThrough: this.dropThroughTimer > 0,
      solids: world.solidsFor(this),
      platforms: world.platformsFor(this),
    });
    if (!res.hitWall) this.vx -= wind;
    if (this.onGround) this.jumping = false;
    if (clampToScreen || this.state === 'hurt' || this.state === 'stunned')
      world.camera.clamp(this);
    // Опасная поверхность (горячая плита) обжигает, только если на ней стоять.
    if (this.onGround && world.grid.standsOnHazard(this))
      world.damagePlayer(this, this.x + this.w / 2 - this.facing);
  }

  recomputeState(): void {
    if (this.throwTimer > 0) this.state = 'throw';
    else if (this.crouching) this.state = 'crouch';
    else if (this.carrying) this.state = 'carry';
    else if (!this.onGround) this.state = this.vy < 0 ? 'jump' : 'fall';
    else this.state = this.vx !== 0 ? 'walk' : 'idle';
  }

  private setCrouch(on: boolean, world: World): void {
    if (on === this.crouching) return;
    if (on) {
      const bottom = this.y + this.h;
      this.h = P.hitboxCrouching.height;
      this.y = bottom - this.h;
      this.crouching = true;
      return;
    }
    // Встать можно, только если над головой нет потолка.
    const standing: Rect = {
      x: this.x,
      y: this.y + this.h - P.hitboxStanding.height,
      w: this.w,
      h: P.hitboxStanding.height,
    };
    if (world.grid.rectHitsSolid(standing)) return;
    this.setStanding();
  }

  private setStanding(): void {
    if (!this.crouching && this.h === P.hitboxStanding.height) return;
    const bottom = this.y + this.h;
    this.h = P.hitboxStanding.height;
    this.y = bottom - this.h;
    this.crouching = false;
  }

  /**
   * Спрыгнуть с тонкой платформы. Основная комбинация по ТЗ — ↓ + прыжок; ↓ + действие с пустыми
   * руками тоже работает (как ↓ + B в оригинале; с предметом это бросок по земле).
   */
  private tryDropThrough(world: World): void {
    if (!this.standsOnOneway(world)) return;
    this.dropThroughTimer = P.dropThroughFrames;
    this.setCrouch(false, world);
  }

  private standsOnOneway(world: World): boolean {
    const T = world.grid.size;
    const ty = Math.floor((this.y + this.h + 1) / T);
    const tx0 = Math.floor(this.x / T);
    const tx1 = Math.floor((this.x + this.w - 0.001) / T);
    let anyOneway = false;
    for (let tx = tx0; tx <= tx1; tx++) {
      if (world.grid.isSolid(tx, ty)) return false;
      if (world.grid.isOneway(tx, ty)) anyOneway = true;
    }
    return anyOneway;
  }

  // ——— взять / бросить ———

  /** Область «уперевшись в предмет» перед игроком. */
  reachRect(): Rect {
    return {
      x: this.facing > 0 ? this.x + this.w : this.x - P.pickupReach,
      y: this.y,
      w: P.pickupReach,
      h: this.h,
    };
  }

  private tryPickUp(world: World): void {
    const reach = this.reachRect();
    const item = world.items.find((it) => it.canBePickedUp && overlaps(reach, it));
    if (item) {
      item.state = 'carried';
      item.owner = this;
      this.carrying = { kind: 'item', item };
      world.revealContents(item);
      world.emit({ type: 'sfx', name: 'pickup' });
      return;
    }
    const partner = world.players.find(
      (p) =>
        p !== this && p.controlled && !p.thrownFlight && p.carrying === null && overlaps(reach, p),
    );
    if (partner) {
      partner.setStanding();
      partner.state = 'held';
      partner.heldBy = this;
      partner.vx = 0;
      partner.vy = 0;
      this.carrying = { kind: 'player', player: partner };
      world.emit({ type: 'sfx', name: 'pickup' });
    }
  }

  throwCarried(dir: ThrowDir, world: World): void {
    const c = this.carrying;
    if (!c) return;
    this.carrying = null;
    this.throwTimer = P.throwFrames;
    if (c.kind === 'item') world.throwItem(c.item, this, dir);
    else c.player.launchAsThrown(this.facing, dir);
    world.emit({ type: 'sfx', name: 'throw' });
  }

  /** Напарник брошен: летит по дуге и приземляется на ноги. */
  private launchAsThrown(facing: Facing, dir: ThrowDir): void {
    this.heldBy = null;
    this.thrownFlight = true;
    this.thrownHit = false;
    this.facing = facing;
    // ↑ + действие — напарник летит вверх (по боссу над головой), иначе — дугой вперёд.
    this.vx = dir === 'up' ? 0 : P.partnerThrowVx * facing;
    this.vy = dir === 'up' ? P.partnerThrowUpVy : P.partnerThrowVy;
    this.state = 'jump';
  }

  /** Вырваться из рук напарника прыжком. */
  breakFree(): void {
    const carrier = this.heldBy;
    if (carrier) carrier.carrying = null;
    this.heldBy = null;
    this.vy = P.breakFreeVelocity;
    this.vx = 0;
    this.state = 'jump';
  }

  /** Бросить или уронить всё, что в руках (удар, гибель). */
  dropCarried(): void {
    const c = this.carrying;
    if (!c) return;
    this.carrying = null;
    if (c.kind === 'item') c.item.drop();
    else c.player.breakFree();
  }

  // ——— укрытие ———

  private enterHide(item: Item): void {
    this.setStanding();
    const bottom = this.y + this.h;
    this.h = P.hitboxCrouching.height;
    this.y = bottom - this.h;
    this.crouching = true;
    this.vx = 0;
    this.state = 'hidden';
    item.state = 'hiding';
  }

  private updateHidden(input: InputView, world: World): void {
    this.vx = 0;
    this.physics(world, true);
    const item = this.carriedItem;
    if (!item) {
      this.crouching = false;
      this.setStanding();
      this.recomputeState();
      return;
    }
    const exitKeys: readonly Action[] = ['left', 'right', 'up', 'jump', 'action', 'start'];
    if (!exitKeys.some((a) => input.pressed(a))) return;
    item.state = 'carried';
    this.crouching = false;
    this.setStanding();
    this.state = 'carry';
    // Действие из укрытия — бросок по земле.
    if (input.pressed('action')) this.throwCarried('ground', world);
    // Прыжок из укрытия на тонкой платформе (↓ ещё зажата) — спрыгнуть вниз вместе с ящиком.
    else if (input.pressed('jump') && input.down('down') && this.standsOnOneway(world)) {
      this.dropThroughTimer = P.dropThroughFrames;
    }
  }

  // ——— урон ———

  /** Удар: сердце, отброс, неуязвимость. Возвращает true, если удар прошёл. */
  hit(fromX: number, world: World): boolean {
    if (this.invulnerable) return false;
    const res = takeHit(this.vitals);
    if (res === 'ignored') return false;
    this.dropCarried();
    this.setStanding();
    if (res === 'killed') {
      this.kill(world);
      return true;
    }
    const away: Facing = fromX <= this.x + this.w / 2 ? 1 : -1;
    this.vx = P.knockback.x * away;
    this.vy = P.knockback.y;
    this.jumping = false;
    this.state = 'hurt';
    this.stateTimer = P.hurtFrames;
    world.emit({ type: 'sfx', name: 'hurt' });
    return true;
  }

  /** Оглушение (попал напарник или «реплика дуэтом» не касается игроков). Сердце не теряется. */
  stun(): void {
    if (this.state === 'dead' || this.state === 'held' || this.state === 'respawn') return;
    this.dropCarried();
    this.setStanding();
    this.vx = 0;
    this.state = 'stunned';
    this.stateTimer = P.stunFrames;
  }

  kill(world: World): void {
    if (this.state === 'dead') return;
    this.dropCarried();
    if (this.heldBy) this.breakFree();
    this.setStanding();
    this.thrownFlight = false;
    this.vx = 0;
    this.vy = 0;
    this.state = 'dead';
    this.stateTimer = P.deathFrames;
    world.emit({ type: 'sfx', name: 'death' });
  }

  /** Прилипла звёздочка-сноска. */
  addSlow(): void {
    this.slowStacks = Math.min(ENEMIES.asterisk.maxStacks, this.slowStacks + 1);
    this.slowTimer = ENEMIES.asterisk.slowFrames;
  }

  startRespawn(x: number, y: number): void {
    this.placeAt(x, y);
    this.state = 'respawn';
    this.stateTimer = P.respawnFrames;
    this.jumping = false;
    this.thrownFlight = false;
    this.slowStacks = 0;
    this.slowTimer = 0;
  }
}
