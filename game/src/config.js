// Sizzle & Serve — every tuning number, colour, recipe and station in one place.
// The kitchen is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** A full shift: 3 minutes on the clock. */
export const SHIFT_SECONDS = 180;

export const CHEF = { radius: 20, speed: 270 };

export const HEARTS = 3;

/** How long a chop takes while the key is held at the board, in seconds. */
export const CHOP_SECONDS = 1.1;

/** Grill timing, in seconds of cooking: raw, then perfect, then burnt. */
export const GRILL = { perfectFrom: 4, burntFrom: 9, slots: 2 };

/** Orders: how fast tickets arrive and how long a guest waits, easing in as the shift goes on. */
export const ORDERS = {
  firstAfter: 3,
  intervalStart: 16,
  intervalEnd: 9,
  maxOpen: 4,
  patienceStart: 52,
  patienceEnd: 36,
  spawnStopBeforeEnd: 12,
};

/** Score: base per dish plus a speed bonus, multiplied by the combo. */
export const SCORE = { basePerIngredient: 25, speedBonusMax: 80, comboStep: 0.25, comboCap: 3 };

export const INTERACT_RANGE = 58;

/** Ingredients. `chop` means the board turns it into its chopped form; `grill` means the
 *  grill cooks it. `state` on a carried ingredient is raw, chopped, cooked or burnt. */
export const INGREDIENTS = {
  bun: { name: 'Bun', chop: false, grill: false, color: '#e8b06a', dark: '#b97f36' },
  bread: { name: 'Bread', chop: false, grill: false, color: '#f0d49a', dark: '#c9a45e' },
  patty: { name: 'Patty', chop: false, grill: true, color: '#a86a4a', dark: '#6e3f28' },
  cheese: { name: 'Cheese', chop: false, grill: false, color: '#ffc93c', dark: '#e09e12' },
  tomato: { name: 'Tomato', chop: true, grill: false, color: '#e5534b', dark: '#b03028' },
  lettuce: { name: 'Lettuce', chop: true, grill: false, color: '#7bc96f', dark: '#4a9e3f' },
  onion: { name: 'Onion', chop: true, grill: false, color: '#f3e3f0', dark: '#c9a6c2' },
};

/** One entry is { kind, state }: state 'raw' (or 'chopped' / 'cooked' where the recipe asks). */
export const RECIPES = [
  {
    id: 'sunny-stack',
    name: 'Sunny Stack',
    price: 14,
    needs: [
      { kind: 'bun', state: 'raw' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'cheese', state: 'raw' },
      { kind: 'tomato', state: 'chopped' },
      { kind: 'bun', state: 'raw' },
    ],
  },
  {
    id: 'garden-bowl',
    name: 'Garden Bowl',
    price: 11,
    needs: [
      { kind: 'lettuce', state: 'chopped' },
      { kind: 'tomato', state: 'chopped' },
      { kind: 'onion', state: 'chopped' },
    ],
  },
  {
    id: 'melty-toast',
    name: 'Melty Toast',
    price: 9,
    needs: [
      { kind: 'bread', state: 'raw' },
      { kind: 'cheese', state: 'raw' },
      { kind: 'tomato', state: 'chopped' },
    ],
  },
  {
    id: 'double-sizzle',
    name: 'Double Sizzle',
    price: 18,
    needs: [
      { kind: 'bun', state: 'raw' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'cheese', state: 'raw' },
      { kind: 'lettuce', state: 'chopped' },
    ],
  },
  {
    id: 'crunch-bruschetta',
    name: 'Crunch Bruschetta',
    price: 10,
    needs: [
      { kind: 'bread', state: 'raw' },
      { kind: 'tomato', state: 'chopped' },
      { kind: 'cheese', state: 'raw' },
    ],
  },
];

/**
 * The kitchen's stations. Counters are solid: the chef walks the floor between them.
 * Crates line the left wall, the board / grill / assembly run across the middle, the
 * serving window and the plate stack sit on the right, the bin is bottom-right.
 */
export const STATIONS = [
  { id: 'crate-bun', kind: 'crate', ingredient: 'bun', x: 24, y: 128, w: 116, h: 74 },
  { id: 'crate-patty', kind: 'crate', ingredient: 'patty', x: 24, y: 218, w: 116, h: 74 },
  { id: 'crate-cheese', kind: 'crate', ingredient: 'cheese', x: 24, y: 308, w: 116, h: 74 },
  { id: 'crate-tomato', kind: 'crate', ingredient: 'tomato', x: 24, y: 398, w: 116, h: 74 },
  { id: 'crate-lettuce', kind: 'crate', ingredient: 'lettuce', x: 24, y: 488, w: 116, h: 74 },
  { id: 'crate-onion', kind: 'crate', ingredient: 'onion', x: 24, y: 578, w: 116, h: 74 },
  { id: 'board', kind: 'board', x: 300, y: 128, w: 190, h: 84 },
  { id: 'grill', kind: 'grill', x: 560, y: 128, w: 220, h: 84 },
  { id: 'assembly', kind: 'assembly', x: 850, y: 128, w: 190, h: 84 },
  { id: 'plates', kind: 'plates', x: 1108, y: 128, w: 148, h: 84 },
  { id: 'window', kind: 'window', x: 1108, y: 268, w: 148, h: 120 },
  { id: 'bread', kind: 'crate', ingredient: 'bread', x: 1108, y: 444, w: 148, h: 74 },
  { id: 'trash', kind: 'trash', x: 1108, y: 574, w: 148, h: 78 },
];

/** The walkable floor, inside the walls and the counters' outer edge. */
export const FLOOR = { x: 0, y: 108, width: 1280, height: 612 };

export const PALETTE = {
  backdrop: '#2b1d16',
  wall: '#a34a2a',
  wallTop: '#c96b3f',
  floorA: '#f2e3c6',
  floorB: '#e9d2a8',
  counter: '#8a5a33',
  counterTop: '#b07a45',
  counterEdge: '#6b4423',
  board: '#e8c98f',
  boardEdge: '#b98d4f',
  grill: '#3c3a3d',
  grillHot: '#ff7a2f',
  plate: '#fdfdf6',
  plateEdge: '#c9c4b4',
  text: '#2b1d16',
  cream: '#fff6e3',
  muted: '#8a6f52',
  gold: '#f2c94c',
  red: '#e5534b',
  green: '#5aa84f',
  ticket: '#fff8e7',
  ticketEdge: '#d9b380',
  hud: '#241812',
  danger: '#d92b1f',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best shift score is kept between visits (this browser only). */
export const BEST_KEY = 'sizzle-and-serve.best';
