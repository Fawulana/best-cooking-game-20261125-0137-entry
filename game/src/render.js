// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// kitchen is scaled to fit the window and centred, the margin filled with the backdrop.
// Everything is vector-drawn on one canvas: no images, no fonts to load, nothing over
// the network. Text that holds a number is rebuilt only when the number changes, so a
// frame allocates nothing.
import { FIELD, FLOOR, FONT, GRILL, INGREDIENTS, PALETTE, STATIONS } from './config.js';
import { plateMatchesRecipe } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TILE = 64;
const TICKET = { width: 168, height: 84, gap: 10, top: 12 };
const PANEL = { width: 640, line: 32 };

const fonts = new Map();
function font(size, weight = '') {
  const key = `${weight}${size}`;
  if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${FONT}`);
  return fonts.get(key);
}

function roundRect(context, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function circle(context, x, y, radius) {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
}

/** One ingredient, drawn as a little piece of food worth serving. */
export function drawIngredient(context, kind, state, x, y, size) {
  const def = INGREDIENTS[kind];
  const s = size / 2;
  context.save();
  context.translate(x, y);
  if (kind === 'bun') {
    context.fillStyle = def.dark;
    context.beginPath();
    context.ellipse(0, s * 0.25, s, s * 0.55, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = def.color;
    context.beginPath();
    context.ellipse(0, 0, s, s * 0.62, 0, Math.PI, 0);
    context.fill();
    context.fillStyle = '#fff6e3';
    for (const [sx, sy] of [[-0.45, -0.3], [0, -0.45], [0.45, -0.3]]) {
      circle(context, sx * s, sy * s, s * 0.09);
      context.fill();
    }
  } else if (kind === 'bread') {
    context.fillStyle = def.dark;
    roundRect(context, -s, -s * 0.8, s * 2, s * 1.6, s * 0.3);
    context.fill();
    context.fillStyle = def.color;
    roundRect(context, -s * 0.82, -s * 0.62, s * 1.64, s * 1.24, s * 0.25);
    context.fill();
  } else if (kind === 'patty') {
    const cooked = state === 'cooked';
    const burnt = state === 'burnt';
    context.fillStyle = burnt ? '#2e1c12' : cooked ? '#7a4a2c' : def.color;
    roundRect(context, -s, -s * 0.55, s * 2, s * 1.1, s * 0.5);
    context.fill();
    context.strokeStyle = burnt ? '#1a0f08' : '#5e3018';
    context.lineWidth = Math.max(1.5, s * 0.09);
    for (const gx of [-0.5, 0, 0.5]) {
      context.beginPath();
      context.moveTo(gx * s, -s * 0.4);
      context.lineTo(gx * s, s * 0.4);
      context.stroke();
    }
  } else if (kind === 'cheese') {
    context.fillStyle = def.color;
    context.beginPath();
    context.moveTo(-s, s * 0.6);
    context.lineTo(s, s * 0.6);
    context.lineTo(s, -s * 0.6);
    context.closePath();
    context.fill();
    context.fillStyle = def.dark;
    for (const [hx, hy] of [[0.1, 0.1], [0.45, -0.15], [0.3, 0.35]]) {
      circle(context, hx * s, hy * s, s * 0.11);
      context.fill();
    }
  } else if (kind === 'tomato') {
    if (state === 'chopped') {
      context.fillStyle = def.color;
      for (const [dx, dy] of [[-0.45, -0.2], [0.4, -0.35], [0, 0.35], [-0.1, -0.5]]) {
        roundRect(context, (dx - 0.32) * s, (dy - 0.28) * s, s * 0.64, s * 0.56, s * 0.12);
        context.fill();
      }
      context.fillStyle = '#ff8a7a';
      circle(context, -0.45 * s, -0.2 * s, s * 0.1);
      circle(context, 0.4 * s, -0.35 * s, s * 0.1);
      context.fill();
    } else {
      context.fillStyle = def.color;
      circle(context, 0, 0, s * 0.92);
      context.fill();
      context.fillStyle = '#ff8a7a';
      circle(context, 0, 0, s * 0.55);
      context.fill();
      context.fillStyle = '#ffd9d2';
      for (let i = 0; i < 5; i += 1) {
        const angle = (i / 5) * Math.PI * 2;
        context.beginPath();
        context.ellipse(Math.cos(angle) * s * 0.3, Math.sin(angle) * s * 0.3, s * 0.16, s * 0.08, angle, 0, Math.PI * 2);
        context.fill();
      }
    }
  } else if (kind === 'lettuce') {
    context.fillStyle = def.dark;
    for (const [lx, ly, r] of [[-0.4, 0.1, 0.55], [0.35, -0.15, 0.6], [0, 0.35, 0.5]]) {
      circle(context, lx * s, ly * s, r * s);
      context.fill();
    }
    context.fillStyle = def.color;
    for (const [lx, ly, r] of [[-0.35, 0.05, 0.45], [0.3, -0.1, 0.5], [0, 0.3, 0.4]]) {
      circle(context, lx * s, ly * s, r * s);
      context.fill();
    }
    if (state === 'chopped') {
      context.strokeStyle = def.dark;
      context.lineWidth = Math.max(1.5, s * 0.08);
      for (const [x1, y1, x2, y2] of [[-0.6, -0.3, 0.6, 0.2], [-0.5, 0.3, 0.5, -0.4]]) {
        context.beginPath();
        context.moveTo(x1 * s, y1 * s);
        context.lineTo(x2 * s, y2 * s);
        context.stroke();
      }
    }
  } else if (kind === 'onion') {
    if (state === 'chopped') {
      context.strokeStyle = def.color;
      context.lineWidth = Math.max(2, s * 0.12);
      for (const r of [0.35, 0.6, 0.85]) {
        context.beginPath();
        context.arc(0, 0, r * s, Math.PI * 0.15, Math.PI * 1.35);
        context.stroke();
      }
      context.fillStyle = '#b98aa8';
      circle(context, -0.2 * s, 0.1 * s, s * 0.12);
      context.fill();
    } else {
      context.fillStyle = def.color;
      circle(context, 0, 0, s * 0.9);
      context.fill();
      context.strokeStyle = def.dark;
      context.lineWidth = Math.max(1.5, s * 0.08);
      for (const r of [0.35, 0.6]) {
        circle(context, 0, 0, r * s);
        context.stroke();
      }
      context.fillStyle = '#7bc96f';
      context.beginPath();
      context.moveTo(-s * 0.15, -s * 0.85);
      context.lineTo(s * 0.15, -s * 0.85);
      context.lineTo(0, -s * 1.25);
      context.closePath();
      context.fill();
    }
  }
  context.restore();
}

/** A white plate carrying its ingredients in a row, for the assembly counter and the chef. */
function drawPlate(context, items, x, y, scale) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.fillStyle = PALETTE.plateEdge;
  context.beginPath();
  context.ellipse(0, 0, 46, 30, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = PALETTE.plate;
  context.beginPath();
  context.ellipse(0, -2, 42, 27, 0, 0, Math.PI * 2);
  context.fill();
  const n = items.length;
  items.forEach((item, i) => {
    const ix = n === 1 ? 0 : -26 + (52 * i) / (n - 1);
    drawIngredient(context, item.kind, item.state, ix, -4, 22);
  });
  context.restore();
}

function drawHeart(context, x, y, size, filled) {
  context.save();
  context.translate(x, y);
  context.scale(size / 20, size / 20);
  context.fillStyle = filled ? PALETTE.red : '#5a4030';
  context.beginPath();
  context.moveTo(0, 7);
  context.bezierCurveTo(-11, -3, -7, -11, 0, -5);
  context.bezierCurveTo(7, -11, 11, -3, 0, 7);
  context.fill();
  context.restore();
}

function stationHint(station, carry, assemblyPlate, grillSlots) {
  if (station === null) return '';
  if (station.kind === 'crate') return carry === null ? `E — Take ${INGREDIENTS[station.ingredient].name}` : '';
  if (station.kind === 'plates') return carry === null ? 'E — Take a plate' : '';
  if (station.kind === 'board') {
    if (carry !== null && carry.type === 'ingredient' && INGREDIENTS[carry.kind].chop && carry.state === 'raw') {
      return 'Hold E — Chop it!';
    }
    return 'Chopping board';
  }
  if (station.kind === 'grill') {
    if (carry !== null && carry.type === 'ingredient' && carry.kind === 'patty' && carry.state === 'raw') {
      return 'E — Grill the patty';
    }
    if (carry === null && grillSlots.some((slot) => slot.item !== null)) return 'E — Take the patty';
    return 'Grill — patties cook here';
  }
  if (station.kind === 'assembly') {
    if (carry !== null && carry.type === 'plate' && assemblyPlate === null) return 'E — Put the plate down';
    if (carry !== null && carry.type === 'ingredient' && assemblyPlate !== null) return 'E — Add to the plate';
    if (carry === null && assemblyPlate !== null) return 'E — Pick the plate up';
    return 'Assembly counter';
  }
  if (station.kind === 'window') {
    if (carry !== null && carry.type === 'plate') return 'E — Serve the dish!';
    return 'Serving window';
  }
  if (station.kind === 'trash') return carry !== null ? 'E — Bin it' : 'Bin';
  return '';
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align = 'left', weight = '') {
    context.font = font(size, weight);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function drawFloor() {
    for (let ty = 0; ty < Math.ceil(FIELD.height / TILE); ty += 1) {
      for (let tx = 0; tx < Math.ceil(FIELD.width / TILE); tx += 1) {
        context.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        context.fillRect(tx * TILE, 104 + ty * TILE, TILE, TILE);
      }
    }
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 104, FIELD.width, 10);
    context.fillStyle = PALETTE.wallTop;
    context.fillRect(0, 104, FIELD.width, 3);
    // A worn rug where the chef does most of the running: the floor's own centrepiece.
    context.fillStyle = 'rgba(217,138,90,0.22)';
    roundRect(context, 400, 340, 480, 260, 26);
    context.fill();
    context.strokeStyle = 'rgba(185,106,63,0.45)';
    context.lineWidth = 3;
    context.setLineDash([10, 8]);
    roundRect(context, 414, 354, 452, 232, 20);
    context.stroke();
    context.setLineDash([]);
  }

  function drawStation(station, state, time) {
    const { x, y, w, h } = station;
    const cx = x + w / 2;
    if (station.kind === 'crate') {
      context.fillStyle = PALETTE.counterEdge;
      roundRect(context, x, y, w, h, 8);
      context.fill();
      context.fillStyle = '#a9713f';
      roundRect(context, x + 5, y + 5, w - 10, h - 10, 6);
      context.fill();
      drawIngredient(context, station.ingredient, 'raw', cx, y + 30, 34);
      text(INGREDIENTS[station.ingredient].name, cx, y + h - 8, 15, PALETTE.cream, 'center', 'bold');
      return;
    }
    context.fillStyle = PALETTE.counter;
    roundRect(context, x, y, w, h, 10);
    context.fill();
    context.fillStyle = PALETTE.counterTop;
    roundRect(context, x + 4, y + 4, w - 8, 16, 6);
    context.fill();

    if (station.kind === 'board') {
      context.fillStyle = PALETTE.board;
      roundRect(context, x + 16, y + 26, w - 32, h - 36, 8);
      context.fill();
      context.strokeStyle = PALETTE.boardEdge;
      context.lineWidth = 2;
      roundRect(context, x + 16, y + 26, w - 32, h - 36, 8);
      context.stroke();
      text('CHOP', cx, y + h - 8, 14, PALETTE.cream, 'center', 'bold');
    } else if (station.kind === 'grill') {
      context.fillStyle = PALETTE.grill;
      roundRect(context, x + 12, y + 24, w - 24, h - 34, 8);
      context.fill();
      state.grillSlots.forEach((slot, i) => {
        const sx = x + 34 + i * 96;
        const sy = y + 46;
        context.fillStyle = '#232123';
        roundRect(context, sx - 40, sy - 18, 80, 36, 8);
        context.fill();
        if (slot.item !== null) {
          const flicker = 0.75 + 0.25 * Math.sin(time * 9 + i * 2.4);
          context.fillStyle = slot.item.state === 'burnt' ? '#3a2a1a' : PALETTE.grillHot;
          context.globalAlpha = 0.55 * flicker + 0.3;
          roundRect(context, sx - 40, sy - 18, 80, 36, 8);
          context.fill();
          context.globalAlpha = 1;
          drawIngredient(context, 'patty', slot.item.state, sx, sy, 30);
          const cookRatio = Math.min(1, slot.item.cook / GRILL.burntFrom);
          context.fillStyle = '#1c1a1c';
          context.fillRect(sx - 32, sy + 18, 64, 5);
          context.fillStyle = slot.item.state === 'burnt' ? PALETTE.red : slot.item.state === 'cooked' ? PALETTE.green : PALETTE.gold;
          context.fillRect(sx - 32, sy + 18, 64 * cookRatio, 5);
        }
      });
      text('GRILL', cx, y + h - 8, 14, PALETTE.cream, 'center', 'bold');
    } else if (station.kind === 'assembly') {
      if (state.assemblyPlate !== null) {
        drawPlate(context, state.assemblyPlate.items, cx, y + 48, 1.05);
      } else {
        context.fillStyle = 'rgba(255,246,227,0.35)';
        context.beginPath();
        context.ellipse(cx, y + 48, 40, 24, 0, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = PALETTE.cream;
        context.setLineDash([5, 5]);
        context.lineWidth = 2;
        context.stroke();
        context.setLineDash([]);
      }
      text('ASSEMBLE', cx, y + h - 8, 14, PALETTE.cream, 'center', 'bold');
    } else if (station.kind === 'plates') {
      for (let i = 0; i < 3; i += 1) {
        context.fillStyle = i === 2 ? PALETTE.plate : PALETTE.plateEdge;
        context.beginPath();
        context.ellipse(cx, y + 52 - i * 7, 42, 12, 0, 0, Math.PI * 2);
        context.fill();
      }
      text('PLATES', cx, y + h - 8, 14, PALETTE.cream, 'center', 'bold');
    } else if (station.kind === 'window') {
      const carry = state.chef.carry;
      const ready = carry !== null && carry.type === 'plate'
        && state.tickets.some((ticket) => plateMatchesRecipe(carry.items, ticket.recipe));
      context.fillStyle = ready ? '#7bc96f' : PALETTE.gold;
      roundRect(context, x + 8, y + 10, w - 16, 34, 8);
      context.fill();
      text('SERVE', cx, y + 34, 20, PALETTE.text, 'center', 'bold');
      context.fillStyle = '#6b4423';
      context.fillRect(x + 8, y + 52, w - 16, 8);
      // The little service bell.
      context.fillStyle = '#f2c94c';
      context.beginPath();
      context.arc(cx, y + 78, 16, Math.PI, 0);
      context.fill();
      context.fillRect(cx - 16, y + 76, 32, 5);
      context.fillStyle = '#8a6f52';
      context.fillRect(cx - 3, y + 62, 6, 6);
      text('Ring the bell!', cx, y + h - 8, 13, PALETTE.cream, 'center');
    } else if (station.kind === 'trash') {
      context.fillStyle = '#4a4038';
      roundRect(context, x + 34, y + 14, w - 68, h - 30, 8);
      context.fill();
      context.fillStyle = '#6b5f52';
      roundRect(context, x + 28, y + 8, w - 56, 12, 6);
      context.fill();
      text('BIN', cx, y + h - 8, 14, PALETTE.cream, 'center', 'bold');
    }
  }

  function drawChef(state, time) {
    const chef = state.chef;
    context.fillStyle = 'rgba(43,29,22,0.25)';
    context.beginPath();
    context.ellipse(chef.x, chef.y + 18, 22, 8, 0, 0, Math.PI * 2);
    context.fill();
    // Body: white coat with a terracotta apron.
    context.fillStyle = '#fdfdf6';
    circle(context, chef.x, chef.y, 20);
    context.fill();
    context.fillStyle = PALETTE.wall;
    context.beginPath();
    context.ellipse(chef.x, chef.y + 8, 13, 12, 0, 0, Math.PI);
    context.fill();
    // Head and toque.
    context.fillStyle = '#f2c49b';
    circle(context, chef.x, chef.y - 22, 13);
    context.fill();
    context.fillStyle = '#fdfdf6';
    circle(context, chef.x - 8, chef.y - 34, 8);
    circle(context, chef.x + 8, chef.y - 34, 8);
    circle(context, chef.x, chef.y - 38, 9);
    context.fill();
    context.fillRect(chef.x - 12, chef.y - 34, 24, 6);
    // Eyes look toward the nearest station.
    context.fillStyle = '#2b1d16';
    circle(context, chef.x - 4, chef.y - 22, 1.8);
    circle(context, chef.x + 4, chef.y - 22, 1.8);
    context.fill();

    const carry = chef.carry;
    if (carry !== null) {
      const bob = Math.sin(time * 3) * 2;
      if (carry.type === 'plate') {
        drawPlate(context, carry.items, chef.x, chef.y - 62 + bob, 0.85);
      } else {
        context.fillStyle = 'rgba(255,248,231,0.95)';
        circle(context, chef.x, chef.y - 58 + bob, 22);
        context.fill();
        context.strokeStyle = PALETTE.ticketEdge;
        context.lineWidth = 2;
        circle(context, chef.x, chef.y - 58 + bob, 22);
        context.stroke();
        drawIngredient(context, carry.kind, carry.state, chef.x, chef.y - 58 + bob, 28);
      }
    }

    if (state.chopProgress > 0) {
      const barX = chef.x - 26;
      const barY = chef.y - 92;
      context.fillStyle = 'rgba(43,29,22,0.7)';
      roundRect(context, barX, barY, 52, 8, 4);
      context.fill();
      context.fillStyle = PALETTE.green;
      roundRect(context, barX, barY, 52 * state.chopProgress, 8, 4);
      context.fill();
    }
  }

  function drawTickets(state, time) {
    const startX = 296;
    state.tickets.forEach((ticket, i) => {
      const x = startX + i * (TICKET.width + TICKET.gap);
      const urgent = ticket.patience < 10;
      const pulse = urgent ? 0.85 + 0.15 * Math.sin(time * 8) : 1;
      context.globalAlpha = pulse;
      context.fillStyle = PALETTE.ticket;
      roundRect(context, x, TICKET.top, TICKET.width, TICKET.height, 10);
      context.fill();
      context.strokeStyle = urgent ? PALETTE.danger : PALETTE.ticketEdge;
      context.lineWidth = urgent ? 3 : 2;
      roundRect(context, x, TICKET.top, TICKET.width, TICKET.height, 10);
      context.stroke();
      context.globalAlpha = 1;
      text(ticket.recipe.name, x + 10, TICKET.top + 20, 15, PALETTE.text, 'left', 'bold');
      text(`$${ticket.recipe.price}`, x + TICKET.width - 10, TICKET.top + 20, 15, '#b97f36', 'right', 'bold');
      const n = ticket.recipe.needs.length;
      ticket.recipe.needs.forEach((need, j) => {
        drawIngredient(context, need.kind, need.state, x + 18 + j * 30, TICKET.top + 44, 22);
      });
      const ratio = Math.max(0, ticket.patience / ticket.maxPatience);
      context.fillStyle = '#e5d3ae';
      roundRect(context, x + 10, TICKET.top + 68, TICKET.width - 20, 7, 3);
      context.fill();
      context.fillStyle = ratio > 0.5 ? PALETTE.green : ratio > 0.25 ? PALETTE.gold : PALETTE.danger;
      roundRect(context, x + 10, TICKET.top + 68, (TICKET.width - 20) * ratio, 7, 3);
      context.fill();
    });
    if (state.tickets.length === 0) {
      text('No orders yet — the lunch rush is coming…', startX + 8, TICKET.top + 46, 16, PALETTE.muted, 'left', 'italic');
    }
  }

  function drawHud(state, best, muted) {
    context.fillStyle = PALETTE.hud;
    context.fillRect(0, 0, FIELD.width, 104);
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 104, FIELD.width, 4);

    text('SIZZLE & SERVE', 20, 32, 24, PALETTE.gold, 'left', 'bold');
    text(`SCORE ${state.score}`, 20, 62, 20, PALETTE.cream, 'left');
    text(`BEST ${best}`, 20, 86, 14, PALETTE.muted, 'left');
    if (state.combo >= 2) {
      const mult = Math.min(1 + 0.25 * (state.combo - 1), 3);
      context.fillStyle = '#b97f36';
      roundRect(context, 196, 44, 92, 30, 15);
      context.fill();
      text(`COMBO x${mult.toFixed(2).replace(/\.?0+$/, '')}`, 242, 65, 16, '#fff6e3', 'center', 'bold');
    }

    drawTickets(state, state.elapsed);

    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = Math.floor(state.timeLeft % 60);
    const low = state.timeLeft <= 30;
    text(`${minutes}:${String(seconds).padStart(2, '0')}`, 1248, 44, 34, low ? PALETTE.danger : PALETTE.cream, 'right', 'bold');
    text('SHIFT', 1248, 66, 13, PALETTE.muted, 'right', 'bold');
    for (let i = 0; i < 3; i += 1) drawHeart(context, 1150 + i * 30, 88, 20, i < state.hearts);
    text(muted ? 'M — sound off' : 'M — mute', 1050, 88, 12, PALETTE.muted, 'right');
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      context.globalAlpha = Math.max(0, particle.ttl * 2);
      context.fillStyle = particle.color;
      circle(context, particle.x, particle.y, particle.size);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawFloaters(state) {
    for (const floater of state.floaters) {
      context.globalAlpha = Math.min(1, floater.ttl);
      text(floater.text, floater.x, floater.y, 26, floater.color, 'center', 'bold');
    }
    context.globalAlpha = 1;
  }

  function drawPanel(title, lines, prompt, height) {
    const width = PANEL.width;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(36,24,18,0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.ticket;
    roundRect(context, x, y, width, height, 16);
    context.fill();
    context.strokeStyle = PALETTE.ticketEdge;
    context.lineWidth = 3;
    roundRect(context, x, y, width, height, 16);
    context.stroke();
    text(title, FIELD.width / 2, y + 64, 44, PALETTE.text, 'center', 'bold');
    lines.forEach((line, i) => {
      text(line.text, FIELD.width / 2, y + 118 + i * PANEL.line, line.size ?? 20, line.color ?? PALETTE.muted, 'center', line.bold ? 'bold' : '');
    });
    text(prompt, FIELD.width / 2, y + height - 36, 22, '#b97f36', 'center', 'bold');
  }

  function starsFor(score) {
    if (score >= 2000) return 3;
    if (score >= 1200) return 2;
    if (score >= 600) return 1;
    return 0;
  }

  /** Paint one frame: the kitchen, then the HUD, then a panel for the screen the game is on. */
  function draw(state, screen, best, nearest, muted) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);

    drawFloor();
    for (const station of STATIONS) drawStation(station, state, state.elapsed);
    if (screen === SCREEN_PLAY && nearest !== null) {
      context.strokeStyle = '#fff6e3';
      context.lineWidth = 3;
      context.setLineDash([6, 5]);
      roundRect(context, nearest.x - 5, nearest.y - 5, nearest.w + 10, nearest.h + 10, 12);
      context.stroke();
      context.setLineDash([]);
    }
    drawChef(state, state.elapsed);
    drawParticles(state);
    drawFloaters(state);
    drawHud(state, best, muted);

    if (screen === SCREEN_PLAY) {
      const hint = stationHint(nearest, state.chef.carry, state.assemblyPlate, state.grillSlots);
      if (hint !== '') text(hint, FIELD.width / 2, 712, 17, PALETTE.cream, 'center', 'bold');
      else text('WASD / arrows to move · E to use a station · hold E at the board to chop · P pause', FIELD.width / 2, 712, 15, 'rgba(255,246,227,0.75)', 'center');
    } else if (screen === SCREEN_TITLE) {
      drawPanel('SIZZLE & SERVE', [
        { text: 'Chop, grill, assemble, serve — before the guests walk out.', size: 20 },
        { text: 'Take ingredients from the crates · hold E at the board to chop', size: 18 },
        { text: 'Grill patties till golden — not burnt · build dishes at the counter', size: 18 },
        { text: 'Serve at the window while the ticket is fresh. Combos pay.', size: 18 },
        { text: `Best shift: ${best}`, size: 18, color: '#b97f36', bold: true },
      ], 'Press Space or click to start cooking', 330);
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', [
        { text: 'The tickets will wait for you.', size: 20 },
        { text: 'WASD / arrows — move · E — use a station · M — mute', size: 18 },
      ], 'Press P to get back to the pass', 250);
    } else if (screen === SCREEN_OVER) {
      const stars = starsFor(state.score);
      const starLine = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      drawPanel(state.overReason === 'hearts' ? 'The guests walked out!' : 'Shift over!', [
        { text: starLine, size: 40, color: '#b97f36' },
        { text: `Score ${state.score}  ·  Dishes served ${state.served}  ·  Best combo x${state.bestCombo}`, size: 20, color: PALETTE.text },
        { text: `Orders lost ${state.expired}  ·  Best shift ${Math.max(best, state.score)}`, size: 18 },
        { text: stars === 3 ? 'A flawless service. The bistro salutes you.' : stars === 2 ? 'A strong service — the rush nearly broke you.' : 'The kitchen survived. Barely.', size: 18 },
      ], 'Press Space or click to cook again', 330);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
