// The screenshot scenes behind ?shot=play|serve|start|end. Each one stages a real
// kitchen state — the same world the game plays, with tickets, a dish mid-assembly,
// a patty on the grill and the clock running — and the renderer paints it twice, so
// the frame is exactly what the game looks like mid-shift. The same seed always gives
// the same frame.
import { RECIPES } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function ticket(recipeId, patience, maxPatience, id) {
  const recipe = RECIPES.find((item) => item.id === recipeId);
  return { id, recipe, patience, maxPatience };
}

function stageKitchen(world, setup) {
  world.reset();
  const state = world.state;
  setup(state);
}

/** Set `world` to the named scene and return the screen to draw over it and the best score. */
export function stageShot(name, world) {
  if (name === 'serve') {
    stageKitchen(world, (state) => {
      state.elapsed = 118;
      state.timeLeft = 62;
      state.score = 1240;
      state.combo = 4;
      state.bestCombo = 4;
      state.served = 9;
      state.hearts = 3;
      state.tickets.push(
        ticket('garden-bowl', 26, 44, 1),
        ticket('sunny-stack', 14, 50, 2),
        ticket('double-sizzle', 41, 48, 3),
      );
      state.chef.x = 1052;
      state.chef.y = 336;
      state.chef.carry = {
        type: 'plate',
        items: [
          { kind: 'lettuce', state: 'chopped' },
          { kind: 'tomato', state: 'chopped' },
          { kind: 'onion', state: 'chopped' },
        ],
      };
      state.grillSlots[0].item = { kind: 'patty', state: 'cooked', cook: 6.5 };
      state.floaters.push({ x: 1180, y: 238, text: '+240', color: '#2b7a2e', ttl: 1.4 });
      state.floaters.push({ x: 1180, y: 266, text: 'COMBO x1.75', color: '#b97f36', ttl: 1.4 });
    });
    return { screen: SCREEN_PLAY, best: 1480 };
  }
  if (name === 'start') {
    stageKitchen(world, (state) => {
      state.elapsed = 24;
      state.timeLeft = 156;
      state.score = 0;
      state.tickets.push(ticket('sunny-stack', 44, 50, 1), ticket('melty-toast', 30, 42, 2));
      state.chef.x = 640;
      state.chef.y = 470;
      state.assemblyPlate = {
        type: 'plate',
        items: [
          { kind: 'bun', state: 'raw' },
          { kind: 'patty', state: 'cooked' },
        ],
      };
      state.grillSlots[0].item = { kind: 'patty', state: 'cooked', cook: 5.2 };
    });
    return { screen: SCREEN_TITLE, best: 1480 };
  }
  if (name === 'end') {
    stageKitchen(world, (state) => {
      state.elapsed = 180;
      state.timeLeft = 0;
      state.score = 1480;
      state.combo = 0;
      state.bestCombo = 4;
      state.served = 11;
      state.expired = 1;
      state.hearts = 2;
      state.over = true;
      state.overReason = 'shift';
      state.chef.x = 640;
      state.chef.y = 470;
    });
    return { screen: SCREEN_OVER, best: 1480 };
  }
  // 'play' is the cover: the busiest honest frame — a rush in full swing.
  stageKitchen(world, (state) => {
    state.elapsed = 96;
    state.timeLeft = 84;
    state.score = 740;
    state.combo = 3;
    state.bestCombo = 3;
    state.served = 6;
    state.hearts = 3;
    state.tickets.push(
      ticket('sunny-stack', 21, 50, 1),
      ticket('garden-bowl', 38, 46, 2),
      ticket('melty-toast', 9, 40, 3),
    );
    state.chef.x = 1030;
    state.chef.y = 268;
    state.chef.carry = { type: 'ingredient', kind: 'tomato', state: 'chopped' };
    state.assemblyPlate = {
      type: 'plate',
      items: [
        { kind: 'bun', state: 'raw' },
        { kind: 'patty', state: 'cooked' },
        { kind: 'cheese', state: 'raw' },
      ],
    };
    state.grillSlots[0].item = { kind: 'patty', state: 'cooked', cook: 6.2 };
    state.grillSlots[1].item = { kind: 'patty', state: 'raw', cook: 1.5 };
    state.particles.push(
      { x: 660, y: 150, vx: 10, vy: -30, color: '#ff7a2f', size: 3, ttl: 0.6 },
      { x: 690, y: 145, vx: -8, vy: -40, color: '#ffb37a', size: 2, ttl: 0.5 },
    );
  });
  return { screen: SCREEN_PLAY, best: 1480 };
}
