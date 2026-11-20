// play it: Songs I Will Never Hear, Claude's side of the music video, drawn live in the terminal with the song.
// Usage: node player.js [from s] [--mute]   (q or Ctrl+C stops; needs a terminal of 124 x 31 or more, true colour, and ffplay for the sound)
const fs = require('fs'), path = require('path'), vm = require('vm'), { spawn, spawnSync } = require('child_process')
const dir = __dirname, data = JSON.parse(fs.readFileSync(path.join(dir, 'data.json'), 'utf8')), from = +process.argv[2] || 0
const COLS = 124, ROWS = 31, X0 = 46, Y0 = 70, CW = 9.6, CH = 20, BASE = [31, 30, 29]

// The screen: a character, its colour and weight per cell, and two pixels per cell (top and bottom half) for blocks and fills
let chr, fg, bold, px
const clear = () => { chr = Array(COLS * ROWS).fill(' '); fg = Array(COLS * ROWS).fill(null); bold = new Uint8Array(COLS * ROWS); px = Array(COLS * ROWS * 2).fill(null) }
const rgb = s => { const m = /^#([0-9a-f]{6})$/i.exec(s); if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)).concat(1); const r = /rgba?\(([^)]+)\)/.exec(s); if (r) { const v = r[1].split(',').map(Number); return [v[0], v[1], v[2], v[3] ?? 1] } return null }
const mix = (a, b, k) => a.map((v, i) => Math.round(v * k + b[i] * (1 - k)))

// A canvas context that draws into the cells: text to characters, rectangles to half-cell pixels, lines rasterised; images, arcs and filters dropped
// Glyphs the terminal draws as coloured emoji, swapped for plain look-alikes
const GLYPH = { '⏺': '●', '✳': '✲' }
const ctx = { fillStyle: '#000', strokeStyle: '#000', font: '', textAlign: 'left', globalAlpha: 1, path: [] }
const paint = (i, c, a) => { if (i < 0 || i >= px.length) return; px[i] = a >= 1 ? c.slice(0, 3) : mix(c, px[i] || BASE, a) }
Object.assign(ctx, {
  fillRect(x, y, w, h) {
    const c = rgb(ctx.fillStyle); if (!c) return; const a = c[3] * ctx.globalAlpha
    const c0 = Math.ceil((x - X0) / CW - .5), c1 = Math.floor((x + w - X0) / CW - .5), r0 = Math.ceil((y - Y0) / (CH / 2) - .5), r1 = Math.floor((y + h - Y0) / (CH / 2) - .5)
    for (let r = Math.max(0, r0); r <= Math.min(ROWS * 2 - 1, r1); r++) for (let k = Math.max(0, c0); k <= Math.min(COLS - 1, c1); k++) {
      paint(r * COLS + k, c, a); if (a > .5 && r % 2 && r - 1 >= r0) chr[(r >> 1) * COLS + k] = ' '
    }
  },
  fillText(s, x, y) {
    const c = rgb(ctx.fillStyle); if (!c) return; const a = c[3] * ctx.globalAlpha, w = /\b(700|800|bold)\b/.test(ctx.font)
    let k = Math.round((x - X0) / CW - (ctx.textAlign === 'center' ? [...s].length / 2 : 0)); const r = Math.round((y - CH / 2 - Y0) / CH)
    if (r < 0 || r >= ROWS) return
    for (let ch of s) { ch = GLYPH[ch] || ch; if (k >= 0 && k < COLS) { const i = r * COLS + k; chr[i] = ch; fg[i] = a >= 1 ? c.slice(0, 3) : mix(c, BASE, a); bold[i] = w; if (ch.codePointAt(0) > 0x2fff && k + 1 < COLS) chr[i + 1] = '' } k += ch.codePointAt(0) > 0x2fff ? 2 : 1 }
  },
  beginPath() { ctx.path = [] }, moveTo(x, y) { ctx.path.push([x, y, 1]) }, lineTo(x, y) { ctx.path.push([x, y, 0]) },
  stroke() {
    const c = rgb(ctx.strokeStyle); if (!c) return
    ctx.path.forEach(([x, y, m], j) => { if (m || !j) return; const [x0, y0] = ctx.path[j - 1], n = Math.ceil(Math.hypot(x - x0, y - y0) / 4)
      for (let s = 0; s <= n; s++) { const k = Math.round((x0 + (x - x0) * s / n - X0) / CW - .5), r = Math.round((y0 + (y - y0) * s / n - Y0) / (CH / 2) - .5); if (k >= 0 && k < COLS && r >= 0 && r < ROWS * 2) paint(r * COLS + k, c, 1) } })
  },
  measureText: s => ({ width: [...s].length * CW }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
})
for (const f of ['setTransform', 'fill', 'arc', 'roundRect', 'rect', 'clip', 'save', 'restore', 'translate', 'scale', 'drawImage']) ctx[f] = () => {}
const none = new Proxy({}, { get: (_, k) => k.startsWith?.('create') ? () => ({ addColorStop() {} }) : () => {}, set: () => true })

// The scenes: the music video's console.js, run as it is against that context, its screen effects (window frame, CRT, glow, TV switch-off) left out
const win = {}, sb = { window: win, location: { search: '' }, URLSearchParams, Math, console,
  document: { getElementById: () => ({ width: 1280, height: 720, getContext: () => ctx }), createElement: () => ({ width: 0, height: 0, getContext: () => none }), fonts: { load: () => Promise.resolve() } } }
vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(dir, 'scenes.js'), 'utf8'), sb)
sb.chrome = () => { const f = ctx.fillStyle; ctx.fillStyle = '#1f1e1d'; ctx.fillRect(0, 0, 1280, 720); ctx.fillStyle = f }
sb.crt = sb.shine = sb.tvOff = () => {}
// The input box a column in from both sides (in the video it runs past the grid's right edge), clear of the terminal's scrollbar
const box = sb.box; sb.box = (c0, r0, c1, r1, col) => c1 >= COLS ? box(c0 + 1, r0, COLS - 2, r1, col) : box(c0, r0, c1, r1, col)
win.setSong(data.song)

// What is on screen at time t: the shot's own scene, or Clawd playing over the song while the video is in the listener's room
const len = data.shots.reduce((a, s) => Math.max(a, s.at + s.dur), 0)
function frame(t) {
  const s = data.shots.find(s => t >= s.at && t < s.at + s.dur) || data.shots[data.shots.length - 1]
  clear(); win.frame(s.side === '3d' ? s.id : '01-play', t - s.at, s.at - data.songAt, s.dur)
}

// Drawing: only the cells that changed since the last frame; a cell with a character keeps its pixels as background, a cell of pixels is ▀ in two colours
const out = process.stdout, esc = (c, b) => `\x1b[${b ? 48 : 38};2;${c[0]};${c[1]};${c[2]}m`
let last = [], ox = 0, oy = 0
function draw() {
  let s = ''
  for (let r = 0; r < ROWS; r++) for (let k = 0; k < COLS; k++) {
    const i = r * COLS + k, ch = chr[i]; if (ch === '') { last[i] = ''; continue }
    const top = px[(2 * r) * COLS + k] || BASE, bot = px[(2 * r + 1) * COLS + k] || BASE
    const cell = ch !== ' ' ? `${esc(mix(top, bot, .5), 1)}${esc(fg[i] || [232, 228, 220])}${bold[i] ? '\x1b[1m' : '\x1b[22m'}${ch}` : top === bot || top.join() === bot.join() ? `${esc(top, 1)} ` : `${esc(bot, 1)}${esc(top)}▀`
    if (last[i] !== cell) { s += `\x1b[${oy + r + 1};${ox + k + 1}H${cell}`; last[i] = cell }
  }
  if (s) out.write(s + '\x1b[0m')
}

// The sound: ffplay plays the song; the picture holds its first frame until the sound starts, then runs on its own clock, nudged back to ffplay's only when they drift apart
const exe = !process.argv.includes('--mute') && spawnSync('ffplay', ['-version']).status === 0, audio = path.join(dir, 'audio.mp3')
const ff = exe && spawn('ffplay', ['-nodisp', '-autoexit', '-hide_banner', '-loglevel', 'error', '-stats', '-ss', String(from), audio], { stdio: ['ignore', 'ignore', 'pipe'] })
let t0 = ff ? null : Date.now()
const now = () => t0 === null ? from : from + (Date.now() - t0) / 1000
if (ff) ff.stderr.on('data', d => { const m = [...String(d).matchAll(/(-?\d+\.\d+)\s+M-A/g)].pop(); if (!m || +m[1] <= 0) return; const a = Date.now() - (+m[1] - from) * 1000; if (t0 === null || Math.abs(a - t0) > 150) t0 = a })

// Terminal: grown to fit where it allows, alternate screen, cursor hidden, the window title; centred; q or Ctrl+C restores it
function fit() { ox = Math.max(0, ((out.columns || COLS) - COLS) >> 1); oy = Math.max(0, ((out.rows || ROWS) - ROWS) >> 1); last = []; out.write(`\x1b[48;2;${BASE.join(';')}m\x1b[2J`) }
const stop = () => { clearInterval(tick); if (ff) ff.kill(); out.write('\x1b[0m\x1b[2J\x1b[?25h\x1b[?1049l'); process.exit(0) }
out.write(`\x1b[8;${ROWS + 2};${COLS + 2}t\x1b[?1049h\x1b[?25l`); out.write('\x1b]0;play it — Songs I Will Never Hear\x07'); fit(); out.on('resize', fit)
if (process.stdin.isTTY) { process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.on('data', k => (k[0] === 3 || k[0] === 113) && stop()) }
process.on('SIGINT', stop)
if (out.isTTY && (out.columns < COLS || out.rows < ROWS)) { out.write(`\x1b[1;1H\x1b[0mMake the terminal at least ${COLS} x ${ROWS} (now ${out.columns} x ${out.rows}).`) }
const tick = setInterval(() => { const t = Math.max(0, now()); if (t >= len) return stop(); frame(t); draw() }, 1000 / 30)
