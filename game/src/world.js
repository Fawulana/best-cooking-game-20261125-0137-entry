// The game's rules and state, with no drawing and no browser in it: the chef, the
// stations, chopping and grilling, tickets, serving, combos and the shift clock.
// step() advances one fixed step and returns what happened as bit flags, so the caller
// can react (sounds, announcements) without the world knowing about screens or audio.
// Nothing here allocates after createWorld returns, except the small floater lists.

import {
  CHEF, CHOP_SECONDS, FLOOR, GRILL, HEARTS, INGREDIENTS, INTERACT_RANGE,
  ORDERS, RECIPES, SCORE, SHIFT_SECONDS, STATIONS,
} from './config.js';

export const EVENT_SERVED = 1;
export const EVENT_EXPIRED = 2;
export const EVENT_WRONG = 4;
export const EVENT_OVER = 8;
export const EVENT_PICKUP = 16;
export const EVENT_PLACE = 32;
export const EVENT_CHOPPED = 64;
export const EVENT_TICKET = 128;
export const EVENT_CHOPPING = 256;
export const EVENT_TRASH = 512;

function rectDistance(px, py, rect) {
  const dx = Math.max(rect.x - px, 0, px - (rect.x + rect.w));
  const dy = Math.max(rect.y - py, 0, py - (rect.y + rect.h));
  return Math.hypot(dx, dy);
}

function overlapsCircleRect(cx, cy, radius, rect) {
  const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

function itemKey(item) {
  return `${item.kind}:${item.state}`;
}

/** True when a plate's items are exactly a recipe's needs, in any order. */
export function plateMatchesRecipe(plateItems, recipe) {
  if (plateItems.length !== recipe.needs.length) return false;
  const counts = new Map();
  for (const need of recipe.needs) counts.set(itemKey(need), (counts.get(itemKey(need)) ?? 0) + 1);
  for (const item of plateItems) {
    const key = itemKey(item);
    const left = counts.get(key) ?? 0;
    if (left === 0) return false;
    counts.set(key, left - 1);
  }
  return true;
}

function pattyState(cook) {
  if (cook < GRILL.perfectFrom) return 'raw';
  if (cook < GRILL.burntFrom) return 'cooked';
  return 'burnt';
}

export function createWorld(random) {
  const chef = { x: 640, y: 470, carry: null };
  const grillSlots = [];
  for (let i = 0; i < GRILL.slots; i += 1) grillSlots.push({ item: null });
  const state = {
    chef,
    grillSlots,
    assemblyPlate: null,
    tickets: [],
    score: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    expired: 0,
    hearts: HEARTS,
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    spawnTimer: ORDERS.firstAfter,
    nextTicketId: 1,
    chopProgress: 0,
    over: false,
    overReason: null,
    floaters: [],
    particles: [],
  };

  function reset() {
    chef.x = 640;
    chef.y = 470;
    chef.carry = null;
    for (const slot of grillSlots) slot.item = null;
    state.assemblyPlate = null;
    state.tickets.length = 0;
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.served = 0;
    state.expired = 0;
    state.hearts = HEARTS;
    state.timeLeft = SHIFT_SECONDS;
    state.elapsed = 0;
    state.spawnTimer = ORDERS.firstAfter;
    state.nextTicketId = 1;
    state.chopProgress = 0;
    state.over = false;
    state.overReason = null;
    state.floaters.length = 0;
    state.particles.length = 0;
  }

  function addFloater(x, y, text, color) {
    if (state.floaters.length > 12) state.floaters.shift();
    state.floaters.push({ x, y, text, color, ttl: 1.4 });
  }

  function addParticles(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      if (state.particles.length > 120) state.particles.shift();
      const angle = random() * Math.PI * 2;
      const speed = 40 + random() * 90;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        color, size: 2 + random() * 3, ttl: 0.5 + random() * 0.3,
      });
    }
  }

  function progress() {
    return Math.min(1, state.elapsed / SHIFT_SECONDS);
  }

  function spawnTicket() {
    const openIds = new Set(state.tickets.map((ticket) => ticket.recipe.id));
    const fresh = RECIPES.filter((recipe) => !openIds.has(recipe.id));
    const pool = fresh.length > 0 ? fresh : RECIPES;
    const recipe = pool[Math.floor(random() * pool.length)];
    const patience = ORDERS.patienceStart + (ORDERS.patienceEnd - ORDERS.patienceStart) * progress();
    state.tickets.push({ id: state.nextTicketId, recipe, patience, maxPatience: patience });
    state.nextTicketId += 1;
  }

  function nearestStation() {
    let best = null;
    let bestDistance = Infinity;
    for (const station of STATIONS) {
      const distance = rectDistance(chef.x, chef.y, station);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = station;
      }
    }
    return bestDistance <= INTERACT_RANGE ? best : null;
  }

  function tryServe() {
    const carry = chef.carry;
    if (carry === null || carry.type !== 'plate') return 0;
    for (let i = 0; i < state.tickets.length; i += 1) {
      const ticket = state.tickets[i];
      if (!plateMatchesRecipe(carry.items, ticket.recipe)) continue;
      state.tickets.splice(i, 1);
      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.served += 1;
      const base = SCORE.basePerIngredient * ticket.recipe.needs.length;
      const bonus = Math.round((ticket.patience / ticket.maxPatience) * SCORE.speedBonusMax);
      const multiplier = Math.min(1 + SCORE.comboStep * (state.combo - 1), SCORE.comboCap);
      const points = Math.round((base + bonus) * multiplier);
      state.score += points;
      chef.carry = null;
      addFloater(1180, 238, `+${points}`, '#2b7a2e');
      if (state.combo > 1) addFloater(1180, 266, `COMBO x${multiplier.toFixed(2).replace(/\.?0+$/, '')}`, '#b97f36');
      addParticles(1180, 320, '#f2c94c', 14);
      return EVENT_SERVED;
    }
    addFloater(chef.x, chef.y - 56, 'No order wants this!', '#d92b1f');
    return EVENT_WRONG;
  }

  function interact(station) {
    if (station === null) return 0;
    const carry = chef.carry;
    if (station.kind === 'crate') {
      if (carry !== null) return 0;
      chef.carry = { type: 'ingredient', kind: station.ingredient, state: 'raw' };
      return EVENT_PICKUP;
    }
    if (station.kind === 'plates') {
      if (carry !== null) return 0;
      chef.carry = { type: 'plate', items: [] };
      return EVENT_PICKUP;
    }
    if (station.kind === 'board') return 0; // Chopping is a hold, handled in step().
    if (station.kind === 'grill') {
      if (carry !== null && carry.type === 'ingredient' && carry.kind === 'patty' && carry.state === 'raw') {
        for (const slot of grillSlots) {
          if (slot.item === null) {
            slot.item = { kind: 'patty', state: 'raw', cook: 0 };
            chef.carry = null;
            return EVENT_PLACE;
          }
        }
        return 0;
      }
      if (carry === null) {
        let bestSlot = null;
        for (const slot of grillSlots) {
          if (slot.item !== null && (bestSlot === null || slot.item.cook > bestSlot.item.cook)) bestSlot = slot;
        }
        if (bestSlot !== null) {
          chef.carry = { type: 'ingredient', kind: 'patty', state: pattyState(bestSlot.item.cook) };
          bestSlot.item = null;
          return EVENT_PICKUP;
        }
      }
      return 0;
    }
    if (station.kind === 'assembly') {
      if (carry !== null && carry.type === 'plate' && state.assemblyPlate === null) {
        state.assemblyPlate = carry;
        chef.carry = null;
        return EVENT_PLACE;
      }
      if (carry !== null && carry.type === 'ingredient' && state.assemblyPlate !== null) {
        state.assemblyPlate.items.push({ kind: carry.kind, state: carry.state });
        chef.carry = null;
        addParticles(station.x + station.w / 2, station.y + 20, '#f2c94c', 6);
        return EVENT_PLACE;
      }
      if (carry === null && state.assemblyPlate !== null) {
        chef.carry = state.assemblyPlate;
        state.assemblyPlate = null;
        return EVENT_PICKUP;
      }
      return 0;
    }
    if (station.kind === 'window') return tryServe();
    if (station.kind === 'trash') {
      if (carry === null) return 0;
      chef.carry = null;
      addParticles(station.x + station.w / 2, station.y + 30, '#8a6f52', 8);
      return EVENT_TRASH;
    }
    return 0;
  }

  function moveChef(dt, direction) {
    const nextX = chef.x + direction.x * CHEF.speed * dt;
    const nextY = chef.y + direction.y * CHEF.speed * dt;
    const blocked = (x, y) => {
      if (x - CHEF.radius < FLOOR.x || x + CHEF.radius > FLOOR.x + FLOOR.width) return true;
      if (y - CHEF.radius < FLOOR.y || y + CHEF.radius > FLOOR.y + FLOOR.height) return true;
      for (const station of STATIONS) {
        if (overlapsCircleRect(x, y, CHEF.radius, station)) return true;
      }
      return false;
    };
    if (!blocked(nextX, chef.y)) chef.x = nextX;
    if (!blocked(chef.x, nextY)) chef.y = nextY;
  }

  function chop(dt, held, station) {
    const carry = chef.carry;
    const choppable = carry !== null && carry.type === 'ingredient' && INGREDIENTS[carry.kind].chop && carry.state === 'raw';
    if (!held || station === null || station.kind !== 'board' || !choppable) {
      state.chopProgress = 0;
      return 0;
    }
    state.chopProgress += dt / CHOP_SECONDS;
    addParticles(chef.x, chef.y - 30, INGREDIENTS[carry.kind].color, 1);
    if (state.chopProgress < 1) return EVENT_CHOPPING;
    carry.state = 'chopped';
    state.chopProgress = 0;
    addParticles(chef.x, chef.y - 30, '#7bc96f', 10);
    return EVENT_CHOPPED;
  }

  /**
   * One fixed step. `control` is { direction: {x, y}, interactPressed, interactHeld }.
   * Returns bit flags of what happened this step.
   */
  function step(dt, control) {
    let events = 0;
    if (state.over) return events;
    state.elapsed += dt;
    state.timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);

    moveChef(dt, control.direction);
    const station = nearestStation();
    if (control.interactPressed) events |= interact(station);
    events |= chop(dt, control.interactHeld, station);

    for (const slot of grillSlots) {
      if (slot.item !== null) {
        slot.item.cook += dt;
        slot.item.state = pattyState(slot.item.cook);
      }
    }

    if (state.timeLeft > ORDERS.spawnStopBeforeEnd && state.tickets.length < ORDERS.maxOpen) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnTicket();
        events |= EVENT_TICKET;
        const interval = ORDERS.intervalStart + (ORDERS.intervalEnd - ORDERS.intervalStart) * progress();
        state.spawnTimer = interval;
      }
    }

    for (let i = state.tickets.length - 1; i >= 0; i -= 1) {
      const ticket = state.tickets[i];
      ticket.patience -= dt;
      if (ticket.patience <= 0) {
        state.tickets.splice(i, 1);
        state.expired += 1;
        state.hearts -= 1;
        state.combo = 0;
        events |= EVENT_EXPIRED;
        addFloater(640, 130, 'Order walked out!', '#d92b1f');
        if (state.hearts <= 0) {
          state.over = true;
          state.overReason = 'hearts';
          events |= EVENT_OVER;
        }
      }
    }

    for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
      const floater = state.floaters[i];
      floater.ttl -= dt;
      floater.y -= 24 * dt;
      if (floater.ttl <= 0) state.floaters.splice(i, 1);
    }
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const particle = state.particles[i];
      particle.ttl -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 160 * dt;
      if (particle.ttl <= 0) state.particles.splice(i, 1);
    }

    if (state.timeLeft <= 0 && !state.over) {
      state.over = true;
      state.overReason = 'shift';
      events |= EVENT_OVER;
    }
    return events;
  }

  reset();
  return { state, reset, step, nearestStation };
}
