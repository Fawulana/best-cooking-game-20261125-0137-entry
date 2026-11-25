// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between four screens: title, play, paused and game over. The
// sizzle loop follows the grill: it starts when a patty hits the grill and stops when
// the last one leaves.
//
// ?seed=N fixes the ticket order. ?shot=play|serve|start|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createSound } from './audio.js';
import {
  EVENT_CHOPPED, EVENT_CHOPPING, EVENT_EXPIRED, EVENT_OVER, EVENT_PICKUP,
  EVENT_PLACE, EVENT_SERVED, EVENT_TICKET, EVENT_TRASH, EVENT_WRONG,
  createWorld,
} from './world.js';
import {
  ACTION_CONFIRM, ACTION_INTERACT, ACTION_MUTE, ACTION_PAUSE, createInput,
} from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;
/** Seconds between chop ticks while the key is held at the board. */
const CHOP_TICK = 0.22;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const sound = createSound();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  // Paint synchronously, twice: the scene is fully staged before this runs, so there
  // is nothing to wait for, and a screenshot taken right after load sees the frame.
  const scene = stageShot(name, world);
  renderer.draw(world.state, scene.screen, scene.best, world.nearestStation(), false);
  renderer.draw(world.state, scene.screen, scene.best, world.nearestStation(), false);
  window.__shotReady = true;
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let chopTick = 0;
  let lastTickSecond = -1;

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    chopTick = 0;
    lastTickSecond = -1;
    screen = SCREEN_PLAY;
    sound.unlock();
    announce('Cooking! First orders are coming in.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    sound.stopSizzle();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Shift over. Score ${world.state.score}. Best ${best}.`);
  }

  function handleEvents(events) {
    if (events & EVENT_SERVED) sound.ding();
    if (events & EVENT_WRONG) sound.buzz();
    if (events & EVENT_EXPIRED) sound.buzz();
    if (events & EVENT_TICKET) sound.pop();
    if (events & EVENT_PICKUP) sound.pickup();
    if (events & EVENT_PLACE) sound.place();
    if (events & EVENT_TRASH) sound.place();
    if (events & EVENT_CHOPPED) sound.chopped();
    if (events & EVENT_CHOPPING) {
      chopTick -= STEP;
      if (chopTick <= 0) {
        sound.chop();
        chopTick = CHOP_TICK;
      }
    } else {
      chopTick = 0;
    }
    const cooking = world.state.grillSlots.some((slot) => slot.item !== null);
    if (screen === SCREEN_PLAY && cooking) sound.startSizzle();
    else sound.stopSizzle();
    if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;

    // One-shot presses are taken once per frame: confirm and pause act on the screens,
    // the interact press is handed to the next world step only, never twice.
    let actions = input.takeActions();
    input.takeClick();
    if (actions & ACTION_MUTE) {
      const muted = sound.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    // Space (interact) starts the game too, as the title screen promises; Enter is
    // the same confirm. A press is taken once per frame, so the key that served the
    // last dish cannot restart the shift in the same frame.
    if (actions & (ACTION_CONFIRM | ACTION_INTERACT) && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
      actions &= ~ACTION_INTERACT; // The press that started the shift is spent.
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      sound.stopSizzle();
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Cooking.');
    }

    if (screen === SCREEN_PLAY) {
      const second = Math.floor(world.state.timeLeft);
      if (second <= 10 && second !== lastTickSecond && world.state.timeLeft > 0) {
        lastTickSecond = second;
        sound.tick();
      }
      while (accumulator >= STEP) {
        const control = {
          direction: input.direction(),
          interactPressed: Boolean(actions & ACTION_INTERACT),
          interactHeld: input.interactHeld(),
        };
        actions &= ~ACTION_INTERACT;
        const events = world.step(STEP, control);
        handleEvents(events);
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) break;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, screen === SCREEN_PLAY ? world.nearestStation() : null, sound.muted);
  }

  // Leaving the tab pauses a running game rather than letting tickets expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      sound.stopSizzle();
      announce('Paused.');
    }
  });

  announce('Sizzle and Serve. Press Space or click to start cooking.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
