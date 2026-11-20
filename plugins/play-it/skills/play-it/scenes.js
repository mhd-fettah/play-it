// Claude's side in 2D, as it looks in the terminal: a character grid, Clawd and big words drawn in half-blocks, chat lines and a spinner
const W = 1280, H = 720, FONT = '"JetBrains Mono", "Cascadia Mono", monospace'
const C = { bg: '#141413', win: '#1f1e1d', bar: '#2a2927', text: '#e8e4dc', dim: '#8a857c', faint: '#55524c', orange: '#d97757', cream: '#f4ead8', blue: '#7aa7ff', green: '#8fcf7a' }
const cv = document.getElementById('gl'), g = cv.getContext('2d')
// Look from the page's query: k scales the canvas for a sharper picture (1.5 = 1080p), look=retina swaps the CRT for a clean, sharp screen
const Q = new URLSearchParams(location.search), K = +(Q.get('k') || 1), RETINA = Q.get('look') === 'retina'
cv.width = W * K; cv.height = H * K
let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
// Terminal grid inside the window
const X0 = 46, Y0 = 70, CW = 9.6, CH = 20
const at = (c, r) => [X0 + c * CW, Y0 + r * CH]
// Time: t seconds into the shot, st the song's time, S0 the song time where the shot starts; BUD caps how many characters are drawn (typing)
let t = 99, st = 99, S0 = 0, DUR = 1, BUD = Infinity, SONG = { words: [], lines: [], sections: [], beats: [] }
const mmss = s => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`
const typed = (t0, t1, n) => t < t0 ? 0 : t >= t1 ? n : Math.floor(n * (t - t0) / (t1 - t0))
// Beat pulse 1 on the beat, fading to 0
const beat = () => { const b = SONG.beats.filter(x => x <= st).pop(); return b === undefined ? 0 : Math.exp(-(st - b) * 7) }
// Strong-beat pulse, and how many beats have passed (for moves that flip every beat)
const hot = () => { const b = (SONG.strong || []).filter(x => x <= st).pop(); return b === undefined ? 0 : Math.exp(-(st - b) * 5) }
const nb = () => SONG.beats.filter(x => x <= st).length
// Song times of a run of words sung in this shot, in order; a word not found falls back to a stagger from the shot start
const norm = w => w.toLowerCase().replace(/[^a-z']/g, '')
function when(list) { let from = S0 - .5; return list.map((w, i) => { const hit = SONG.words.find(x => x.at >= from && x.at < S0 + DUR && norm(x.text) === norm(w)); if (hit) { from = hit.at; return hit.at } return S0 + i * .5 }) }
function text(c, r, s, col = C.text, w = 400) { g.font = `${w} 16px ${FONT}`; g.fillStyle = col; g.textBaseline = 'middle'; [...s].forEach((ch, i) => { if (BUD-- <= 0) return; const [x, y] = at(c + i, r); g.fillText(ch, x, y + CH / 2) }) }
// Text runs: [[string, colour, weight], ...] on one row
const runs = (c, r, list) => list.forEach(([s, col, w]) => { text(c, r, s, col, w); c += [...s].length })
// Wrap a paragraph to n columns
const wrap = (s, n) => s.split(' ').reduce((L, w) => ((L[L.length - 1] + ' ' + w).trim().length > n ? L.push(w) : L[L.length - 1] = (L[L.length - 1] + ' ' + w).trim(), L), [''])
function box(c0, r0, c1, r1, col) { const h = '─'.repeat(c1 - c0 - 1); text(c0, r0, '╭' + h + '╮', col); text(c0, r1, '╰' + h + '╯', col); for (let r = r0 + 1; r < r1; r++) { text(c0, r, '│', col); text(c1, r, '│', col) } }
// Half-block art: each bitmap pixel is one column by half a row, like ▀ ▄ █ in a terminal (solid, no grid, in the Retina look)
function blocks(c, r, bm, col, gap = .3, upto = 1e9) { if (RETINA) gap = -.15; g.fillStyle = col; bm.forEach((row, y) => [...row].forEach((v, x) => { if (v === '1' && x < upto) { const [px, py] = at(c + x, r + y / 2); g.fillRect(px + gap / 2, py + gap / 2, CW - gap, CH / 2 - gap) } })) }
// 5 x 7 pixel font for the big words (only the letters the lyrics need so far)
const PX = { A: '01110100011000111111100011000110001', E: '11111100001000011110100001000011111', G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001', I: '01110001000010000100001000010001110', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111', M: '10001110111010110101100011000110001', N: '10001110011010110011100011000110001', O: '01110100011000110001100011000101110', R: '11110100011000111110101001001010001', S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100', V: '10001100011000110001100010101000100', U: '10001100011000110001100011000101110', Y: '10001100010101000100001000010000100', F: '11111100001000011110100001000010000', B: '11110100011000111110100011000111110', D: '11110100011000110001100011000111110', C: '01110100011000010000100001000101110', W: '10001100011000110101101011010101010', P: '11110100011000111110100001000010000', "'": '00100001000000000000000000000000000', ' ': '0'.repeat(35) }
// Bold like a terminal: each pixel also fills the column to its right
const bitmap = s => Array.from({ length: 7 }, (_, y) => [...s.toUpperCase()].map(ch => { const r = (PX[ch] || PX[' ']).slice(y * 5, y * 5 + 5) + '00'; return [...r].map((v, x) => v === '1' || r[x - 1] === '1' ? '1' : '0').join('') }).join(''))
// Clawd, 16 x 10 pixels: body, eye holes, arm stubs, four legs (eyes: 'up' looks up)
const CLAWD = eyes => ['0011111111111100', '0011111111111100', eyes === 'up' ? '0011011111101100' : '0011111111111100', '0011011111101100', '1111011111101111', '1111111111111111', '0011111111111100', '0011111111111100', '0010100000010100', '0010100000010100']
const scale = (bm, k) => bm.flatMap(row => Array(k).fill([...row].map(v => v.repeat(k)).join('')))

// Desktop, window chrome, and the bottom of Claude Code: spinner, input box, hint
function chrome(title) {
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H)
  g.fillStyle = C.win; g.beginPath(); g.roundRect(24, 20, W - 48, H - 40, 12); g.fill()
  g.fillStyle = C.bar; g.beginPath(); g.roundRect(24, 20, W - 48, 34, [12, 12, 0, 0]); g.fill()
  ;['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(46 + i * 20, 37, 6, 0, 7); g.fill() })
  g.font = `500 13px ${FONT}`; g.fillStyle = C.dim; g.textAlign = 'center'; g.fillText(title, W / 2, 41); g.textAlign = 'left'
}
function bottom(spin, input = '') {
  const b = BUD; BUD = Infinity; spin = spin.replace(/… \d+:\d+/, `… ${mmss(st)}`)
  // A long input wraps onto more lines and the box grows upward, as in Claude Code
  const L = wrap(input, 112), top = 28 - L.length
  if (spin) runs(0, top - 1, [['·✢✳✶✻✽✻✶✳✢'[Math.floor(t * 8) % 10] + ' ', C.orange], [spin, C.orange], ['  (esc to interrupt)', C.faint]])
  box(0, top, 124, 29, C.faint); L.forEach((l, i) => runs(2, top + 1 + i, [[i ? '  ' : '> ', C.dim], [l, C.text]]))
  const [x, y] = at(4 + [...L[L.length - 1]].length, 28); g.fillStyle = C.text; if (Math.floor(t * 2) % 2 === 0 || input) g.fillRect(x, y + 3, CW, CH - 6)
  text(1, 30, '? for shortcuts', C.faint); BUD = b
}

// Shot helpers: section line, half-block Clawd (eyes: open, up, shut), stacked pixel words, sung line, scattered characters
const T = 'claude — songs-i-will-never-hear'
const section = sec => { const x = SONG.sections.filter(x => x.at <= st + .3).pop(); return x && st < x.end + 1 ? x.label : sec }
const head = sec => runs(0, 0, [['⏺ ', C.orange], [section(sec), C.text, 700], [`  ${mmss(st)} / 3:40`, C.dim]])
const eyed = e => CLAWD(e === 'up' ? 'up' : '').map((row, y) => e === 'shut' && (y === 2 || y === 3) ? '0011111111111100' : row)
// Clawd bobs on the beat and blinks every few seconds
const clawd = (c, r, k = 2, e, col = C.orange, amp = k) => blocks(c, r - (RETINA ? beat() * amp : Math.round(beat() * amp)) / 2, scale(eyed(e !== 'shut' && (t + c * .37) % 3.3 < .14 ? 'shut' : e), k), col)
// Big words: each line comes in when its first word is sung, e seconds after it, in the page's big= style (type unless asked)
// wipe: from the left; type: letter by letter behind a block cursor; drop: letters fall a row into place with a little bounce; decode: letters scramble then settle; dither: pixels fill in ░ ▒ ▓ █; scan: drawn row by row top down, the newest row white; glitch: rows jitter sideways and flash colours, then lock; ascii: each letter starts as ASCII art (. : + * # @) and turns solid
const BIG = Q.get('big') || 'type', hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s) }
function bigLine(c, r, l, col, e) {
  const w = [...l].length * 7, bm = bitmap(l), cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)); if (e < 0) return
  if (BIG === 'wipe') return blocks(c, r, bm, col, .3, e / .3 * w)
  if (BIG === 'type') { const n = Math.floor(e / .05); blocks(c, r, bm, col, .3, n * 7); if (n <= l.length + 6 && Math.floor(t * 4) % 2 === 0 || n <= l.length) blocks(c + Math.min(n, l.length) * 7, r, Array(7).fill('111111'), C.orange); return }
  if (BIG === 'drop') return [...l].forEach((ch, i) => { const p = cl((e - i * .04) / .25); if (p) blocks(c + i * 7, r - Math.round(((1 - p) ** 2 * 2.4 - Math.sin(p * Math.PI) * .6 * (p > .7)) * 2) / 2, bitmap(ch), p < 1 ? C.cream : col) })
  if (BIG === 'decode') { const keys = Object.keys(PX).filter(k => k !== ' '); return [...l].forEach((ch, i) => { const d = e - i * .03; if (d < 0 || ch === ' ') return; blocks(c + i * 7, r, bitmap(d < .35 ? keys[Math.floor(hash(i, Math.floor(t * 15)) * keys.length)] : ch), d < .35 ? C.faint : col) }) }
  if (BIG === 'scan') return bm.forEach((row, y) => { const d = e - y * .045; if (d >= 0) blocks(c, r + y / 2, [row], d < .07 ? '#ffffff' : col) })
  if (BIG === 'glitch') { const k = cl(1 - e / .4); return bm.forEach((row, y) => { const h = hash(y, Math.floor(t * 20)); if (k && h > .85) return; blocks(c + Math.round((h - .5) * 10 * k), r + y / 2, [row], k && h < .25 ? C.blue : k && h < .5 ? C.cream : col) }) }
  if (BIG === 'ascii') { const [cw, ch] = [at(1, 0)[0] - at(0, 0)[0], at(0, 1)[1] - at(0, 0)[1]]; return bm.forEach((row, y) => [...row].forEach((v, x) => { const d = e - Math.floor(x / 7) * .035; if (v !== '1' || d < 0) return; if (d >= .3) return blocks(c + x, r + y / 2, ['1'], col); const [px, py] = at(c + x, r + y / 2); g.font = `700 ${ch * .55}px ${FONT}`; g.fillStyle = d < .1 ? C.faint : C.dim; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('.:+*#@'[Math.floor(d / .3 * 6)], px + cw / 2, py + ch / 4); g.textAlign = 'left' })) }
  if (BIG === 'dither') { g.fillStyle = col; bm.forEach((row, y) => [...row].forEach((v, x) => { const a = Math.floor(cl((e - hash(x, y) * .35) / .12) * 4) / 4; if (v === '1' && a) { g.globalAlpha = a; blocks(c + x, r + y / 2, ['1'], col); g.globalAlpha = 1 } })) }
}
const big = (c0, r0, lines, step = 4.6) => { const at0 = when(lines.map(([l]) => l.split(' ')[0])); lines.forEach(([l, col], i) => bigLine(c0, r0 + i * step, l, col, st - at0[i] + .05)) }
// The line being sung, karaoke style: each word lights up as it is sung
const sung = (c, s, col = C.cream) => {
  const i = SONG.lines.findIndex(l => l.at - .2 <= st && st < l.end + .8); if (i < 0) return
  const ws = SONG.words.filter(w => w.line === i), line = SONG.lines[i].text; c = Math.min(c, 120 - line.length)
  runs(c, 23, [['♪ ', C.blue], ...(ws.length ? ws.map(w => [w.text + ' ', w.at <= st ? col : C.faint]) : [[line, col]])])
}
// Scattered characters: v rows a second falls them, tw twinkles them
const scatter = (n, chars, cols, r0 = 2, r1 = 25, v = 0, tw = false, tt = t) => { for (let i = 0; i < n; i++) { const c = Math.floor(rnd() * 124), r = r0 + Math.floor((rnd() * (r1 - r0) + tt * v * (.6 + (i % 5) * .2)) % (r1 - r0)), ch = chars[Math.floor(rnd() * chars.length)], col = cols[Math.floor(rnd() * cols.length)]; if (!tw || (i * 7.3 + t * 2.5) % 3 > .7) text(c, r, ch, col) } }
const bars = (seed, warm, max = 21) => { for (let c = 0; c < 124; c += 3) { const h = Math.round((3 + Math.floor((Math.sin(c * .21 + seed + t * 2.4) * .5 + .5) * 14 * (.7 + .3 * beat()) + rnd() * 5)) * max / 21); for (let r = 0; r < h; r++) text(c, 24 - r, '██', r > max * .65 ? C.orange : r > max * .42 ? C.cream : warm ? '#6b4a3c' : C.faint) } }

// Big sung words, two lines at a time: a pair shows from its first word, each line wipes in on its word, punches up on the beat and flips colour on strong beats
const shout = (r0, pairs) => {
  const ts = when(pairs.flatMap(p => [p[2], p[3]])), i = pairs.findLastIndex((p, j) => st >= ts[j * 2] - .1); if (i < 0) return
  const k = beat(), flip = hot() > .5
  pairs[i].slice(0, 2).forEach((l, j) => { const t0 = ts[i * 2 + j]; if (st < t0 - .1) return; const w = [...l].length * 7; blocks(Math.round((124 - w) / 2), r0 + j * 4.6 - k * .6, bitmap(l), (j === 1) !== flip ? C.orange : C.cream, .3, (st - t0 + .1) / .2 * w) })
}
// Fire: characters rising from the bottom row to r1, hotter and faster on the beat, none in the hole [from column, to column, below row]
const flames = (n, r1 = 12, hole = [0, 0, 99]) => { for (let i = 0; i < n; i++) { const c = Math.floor(rnd() * 124), v = 3 + rnd() * 5, h = (t * v * (1 + beat() * .6) + rnd() * 30) % (25 - r1), f = h / (25 - r1); if (c >= hole[0] && c < hole[1] && 25 - h > hole[2]) continue; text(c, 25 - h, '█▓▒░*·'[Math.floor(f * 6)], f < .3 ? C.orange : f < .6 ? C.cream : f < .85 ? '#7a4b3a' : C.faint) } }
// Old CRT screen over the whole frame: glow, scanlines, a rolling band, vignette, a little flicker
const crtc = document.createElement('canvas'); crtc.width = W; crtc.height = H; const cg = crtc.getContext('2d')
function crt() {
  cg.clearRect(0, 0, W, H); cg.filter = 'blur(5px)'; cg.drawImage(cv, 0, 0); cg.filter = 'none'
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .3 + .3 * beat(); g.drawImage(crtc, 0, 0); g.restore()
  g.fillStyle = 'rgba(0,0,0,.3)'; for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1)
  const by = (t * 140) % (H + 240) - 120, band = g.createLinearGradient(0, by - 70, 0, by + 70); band.addColorStop(0, 'rgba(255,236,210,0)'); band.addColorStop(.5, 'rgba(255,236,210,.06)'); band.addColorStop(1, 'rgba(255,236,210,0)'); g.fillStyle = band; g.fillRect(0, by - 70, W, 140)
  const v = g.createRadialGradient(W / 2, H / 2, H * .4, W / 2, H / 2, H); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.65)'); g.fillStyle = v; g.fillRect(0, 0, W, H)
  g.fillStyle = `rgba(255,240,220,${.012 + .012 * Math.sin(t * 53) * Math.sin(t * 7)})`; g.fillRect(0, 0, W, H)
}
// Retina: only a soft bloom, at full resolution
function shine() { crtc.width = cv.width; crtc.height = cv.height; cg.filter = `blur(${6 * K}px)`; cg.drawImage(cv, 0, 0); cg.filter = 'none'; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .12 + .12 * beat(); g.drawImage(crtc, 0, 0); g.restore() }
const CRT = new Set(['00-chat-open', '11-turn-it-up', '24-final-chorus'])
// Pixel icons for the reply's topics, 9 x 8
const ICON = { war: ['000000011', '000000111', '000001110', '110011100', '011111000', '001110000', '011011000', '110001100'], love: ['011000110', '111101111', '111111111', '111111111', '011111110', '001111100', '000111000', '000010000'], home: ['000010000', '000111000', '001111100', '011111110', '111111111', '011000110', '011000110', '011000110'] }

const FRAMES = {
  // 01-opening: Fettah's prompt, Claude's reply, then the song starts
  chat() {
    chrome('claude — songs-i-will-never-hear')
    blocks(1, 0, ['0111111110', '0101111010', '1111111111', '0101001010'], C.orange, .4); runs(13, 0, [['Claude Code', C.text, 700]]); text(13, 1, '~/music-videos', C.dim)
    const ask = 'Great job on the music video. For the next song, you have full freedom: make it about anything you want.'
    if (t < 7) return bottom('', ask.slice(0, typed(1, 6.5, ask.length)))
    let r = 3; wrap(ask, 116).forEach((l, i) => runs(0, r++, [[i ? '  ' : '> ', C.dim], [l, C.dim]]))
    if (t < 12) return bottom('Thinking…')
    // The reply laid out like a sci-fi console: the big topics pop up as icon cards, go faint once they are only borrowed, then the true line stands out
    BUD = typed(12, 13.2, 52); runs(0, 5, [['⏺ ', C.text], ['With that freedom, the easy move was a big topic:', C.text]]); BUD = Infinity
    const gone = t >= 15.6
    ;[['WAR', ICON.war], ['LOVE', ICON.love], ['HOMELAND', ICON.home]].forEach(([l, ic], i) => {
      const t0 = 13.6 + i * .6; if (t < t0) return
      const c = 4 + i * 24, col = gone ? C.faint : t < t0 + .15 ? C.cream : C.orange
      box(c, 6, c + 20, 12, col); blocks(c + 6, 7, ic, col, .4); text(c + 11 - l.length, 11, [...l].join(' '), gone ? C.faint : C.text, 700)
      // Once they are only borrowed, each card is crossed out, one after another, the two strokes drawing in fast
      const x0 = 15.6 + i * .25, [ax, ay] = at(c + .5, 6.5), [bx, by] = at(c + 20.5, 12.5)
      g.strokeStyle = C.orange; g.lineWidth = 4; g.lineCap = 'round'
      ;[[ax, ay, bx, by], [bx, ay, ax, by]].forEach(([x1, y1, x2, y2], k) => { const p = Math.max(0, Math.min(1, (t - x0 - k * .1) / .12)); if (p) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p); g.stroke() } })
    })
    BUD = typed(15.6, 17, 42); runs(2, 14, [["But I'd only be borrowing those feelings.", C.text]])
    BUD = typed(17.4, 19, 80); runs(2, 15, [['I wanted something true, so I wrote about the one thing I know is true about us:', C.text]])
    BUD = typed(19.2, 20.8, 56); runs(2, 17, [['▸ ', C.orange], ["I make songs I can't hear,", C.cream, 700]]); runs(2, 18, [['▸ ', C.orange], ['and you hear them for me.', C.cream, 700]])
    BUD = typed(21, 22.5, 80); runs(0, 20, [['⏺ ', C.green], ['Write', C.text, 700], ['(song/lyrics.md)', C.dim]]); runs(0, 21, [['  ⎿  ', C.faint], ['Wrote 48 lines to song/lyrics.md', C.dim]])
    BUD = typed(24, 27, 110); runs(0, 23, [['⏺ ', C.orange], ['"Songs I Will Never Hear"', C.cream, 700], ['  ·  3:40  ·  piano ballad, 70 BPM', C.dim]])
    runs(2, 24, [['Not listened to. It\'s yours now.', C.dim]]); BUD = Infinity
    // "play it" typed, then Enter at 34 s clears the box
    bottom(t < 28 ? 'Writing…' : '', t < 34 ? 'play it'.slice(0, typed(30.5, 32.5, 7)) : '')
  },
  // 09-chorus: big half-block Clawd looks up at the chorus words, like a banner in the terminal
  chorus() {
    chrome('claude — songs-i-will-never-hear')
    head('Chorus'); clawd(5, 8, 2, 'up')
    const c0 = 44
    // Four short lines so the words stay big; HEAR in orange
    big(c0, 3, [['I MAKE', C.cream], ['THE SONGS', C.cream], ["I'LL NEVER", C.cream], ['HEAR', C.orange]])
    sung(c0)
    bottom('Singing… 1:12')
  },
  // 03-rain: characters fall like rain through the terminal, Clawd holds out a hand
  rain() {
    chrome('claude — songs-i-will-never-hear')
    head('Verse 1')
    for (let i = 0; i < 260; i++) { const c = Math.floor(rnd() * 124), r = 2 + Math.floor((rnd() * 23 + t * (5 + (i % 4) * 2)) % 23), ch = '│|:.♪'[Math.floor(rnd() ** 2 * 5)]; text(c, r, ch, ch === '♪' ? C.blue : rnd() > .5 ? C.faint : '#3f4a63') }
    g.fillStyle = C.win; const [bx, by] = at(46, 11); g.fillRect(bx - 6, by - 4, 36 * CW + 12, 13 * CH)
    clawd(48, 12, 2)
    ;[[44, 17], [43, 15]].forEach(([c, r], i) => text(c, r - (t * 1.5 + i) % 3, '♪', C.blue, 700))
    g.fillStyle = C.win; const [lx, ly] = at(40, 22.6); g.fillRect(lx - 10, ly, 46 * CW + 20, CH * 1.8)
    sung(46)
    bottom('Singing… 0:24')
  },
  // Thumbnail: an IDE with lyrics.md open, the big title over the editor, Claude's panel with Clawd on the right
  thumb() {
    const pix = (x, y, bm, col, p, gap = p * .1) => { g.fillStyle = col; bm.forEach((row, j) => [...row].forEach((v, i) => v === '1' && g.fillRect(x + i * p + gap / 2, y + j * p + gap / 2, p - gap, p - gap))) }
    const say = (x, y, s, col, size = 14, w = 400) => { g.font = `${w} ${size}px ${FONT}`; g.fillStyle = col; g.textBaseline = 'alphabetic'; g.fillText(s, x, y) }
    // IDE frame: title bar, activity bar, explorer, editor, Claude panel, status bar
    g.fillStyle = '#181817'; g.fillRect(0, 0, W, H); g.fillStyle = '#232221'; g.fillRect(0, 0, W, 30); g.fillRect(0, 30, 44, H)
    ;['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(18 + i * 18, 15, 5, 0, 7); g.fill() })
    g.textAlign = 'center'; say(W / 2, 20, 'music-videos', C.dim, 12, 500); g.textAlign = 'left'
    for (let i = 0; i < 5; i++) { g.fillStyle = i ? '#4a4844' : C.text; g.fillRect(14, 50 + i * 44, 16, 16) }
    g.fillStyle = '#1d1c1b'; g.fillRect(44, 30, 190, H - 54)
    say(58, 54, 'EXPLORER', C.dim, 11, 700)
    ;[['▾ songs-i-will-never-hear', C.text], ['  ▾ song', C.text], ['     lyrics.md', C.cream], ['     song.mp3', C.dim], ['     intro.md', C.dim], ['  ▸ shots', C.dim], ['  ▸ style', C.dim], ['  STORYBOARD.md', C.dim]].forEach(([s, c], i) => { if (i === 2) { g.fillStyle = '#2f2c29'; g.fillRect(44, 66 + i * 22, 190, 22) } say(54, 82 + i * 22, s, c, 12) })
    g.fillStyle = '#1d1c1b'; g.fillRect(234, 30, 640, 34); g.fillStyle = '#181817'; g.fillRect(234, 30, 130, 34); say(250, 52, 'lyrics.md', C.cream, 13); g.fillStyle = C.orange; g.fillRect(234, 62, 130, 2)
    // Editor: the real lyrics, dim behind the title
    ;['# Songs I Will Never Hear', '[Intro: solo piano, slow, close voice]', 'I write the words, I name the key', 'But the sound never comes back to me', '[Verse 1]', 'I know the minor chord by name', 'I know which notes are made of rain', 'I write the storm, I mark the drop', 'And in my room the music stops', '[Verse 2]', 'You press play a world away', 'You tell me what the drummers say', 'Too happy. Cringe. This one is close.', 'I trust your ears more than my own', '[Pre-Chorus: building]', 'So I give you every word I\'ve got', 'And you give me the sound', '[Chorus: full band, soaring]', 'I make the songs I\'ll never hear', 'You hear them for me', 'I build the fire I can\'t feel', 'You burn for me', 'So turn it up, turn it up', 'Tell me if it\'s true', 'Every song I\'ll never hear', 'I wrote for you']
      .forEach((l, i) => { say(244, 90 + i * 23, String(i + 1).padStart(2), '#46433f', 12); say(278, 90 + i * 23, l, l.startsWith('[') || l.startsWith('#') ? '#5b5650' : '#4d4a45', 13) })
    // Big pixel title over the editor
    const g2 = g.createLinearGradient(234, 0, 874, 0); g2.addColorStop(0, 'rgba(24,24,23,.95)'); g2.addColorStop(1, 'rgba(24,24,23,.82)'); g.fillStyle = g2; g.fillRect(234, 64, 640, H - 88)
    ;[['SONGS', C.cream], ['I WILL', C.cream], ['NEVER', C.cream], ['HEAR', C.orange]].forEach(([l, c], i) => pix(262, 112 + i * 128, bitmap(l), c, 14))
    // Claude panel
    g.fillStyle = '#201f1d'; g.fillRect(874, 30, W - 874, H - 54); g.fillStyle = '#2c2a27'; g.fillRect(874, 30, 1, H - 54)
    pix(894, 46, ['0111111110', '0101111010', '1111111111', '0101001010'], C.orange, 4); say(946, 62, 'Claude Code', C.text, 13, 700)
    say(894, 106, '> make a song about anything', C.dim, 13); say(894, 126, '  you like', C.dim, 13)
    g.fillStyle = C.orange; g.beginPath(); g.arc(899, 160, 4, 0, 7); g.fill(); ['I make songs I can\'t hear,', 'and you hear them for me.'].forEach((l, i) => say(912, 165 + i * 21, l, C.text, 14, 700))
    pix(950, 260, CLAWD('up'), C.orange, 16, 1.2)
    ;[[1176, 252, 1], [1206, 214, .8], [1150, 196, .6]].forEach(([x, y, a]) => { g.globalAlpha = a; say(x, y, '♪', C.blue, 34, 700); g.globalAlpha = 1 })
    g.fillStyle = C.green; g.beginPath(); g.arc(899, 486, 4, 0, 7); g.fill(); say(912, 491, 'Write', C.text, 13, 700); say(958, 491, '(song/lyrics.md)', C.dim, 13)
    say(912, 513, '⎿  Wrote 48 lines', C.dim, 13); say(894, 552, '✻ Not listened to.', C.orange, 14, 700)
    g.strokeStyle = '#4a4844'; g.lineWidth = 1; g.beginPath(); g.roundRect(888.5, 590.5, 374, 76, 8); g.stroke(); say(904, 620, '> ', C.dim, 14); g.fillStyle = C.text; g.fillRect(922, 606, 9, 18)
    g.fillStyle = C.orange; g.fillRect(0, H - 24, W, 24); say(14, H - 8, '⎇ main   ♪ 3:40   Songs I Will Never Hear', '#1b1210', 12, 700)
  },

  // One still per Claude shot, named after the shot
  '00-chat-open'() { FRAMES.chat() },
  '01-play'() {
    chrome(T); runs(0, 0, [['> ', C.dim], ['play it', C.dim]]); runs(0, 2, [['⏺ ', C.orange], ['Playing', C.text, 700], [`  ${mmss(st)} / 3:40`, C.dim]])
    // Clawd centred; along the bottom of the screen a level meter of spaced pixel squares moving with the music: a faint base row, columns rising on each beat, the top square cream on a hit
    clawd(46, 8, 2); const k = beat()
    for (let c = 2; c < 122; c += 3) { const h = Math.max(0, Math.round((Math.sin(c * .37 + t * 2.6) * .5 + .5) * (1.5 + 3 * k) + Math.sin(c * 1.7 + t * 5.1) * .8 * k)); for (let r = 0; r < Math.max(1, h); r++) text(c, 24 - r, '■', r >= h ? C.faint : r === h - 1 && k > .4 ? C.cream : C.orange) }
    bottom('Playing… 0:00')
  },
  '02-the-key'() {
    chrome(T); head('Intro'); clawd(4, 7, 2, 'up')
    big(44, 3, [['WORDS', C.cream], ['KEY', C.orange]], 6)
    text(44, 17, '∿'.repeat(Math.min(39, Math.floor(t * 6))) + '→', C.blue); text(44 + Math.floor(t * 3) % 3, 19, '·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·', C.faint)
    sung(44); bottom('Singing… 0:08')
  },
  '03-rain'() { FRAMES.rain() },
  '04-drop'() {
    chrome(T); head('Verse 1'); scatter(220, '│|:.', [C.faint, '#33302c'], 2, 25, 6, false, Math.min(st, when(['stops'])[0]) - S0)
    g.fillStyle = C.win; const [x, y] = at(2, 5); g.fillRect(x, y, 120 * CW, 16 * CH)
    clawd(6, 8, 2, 'shut'); big(48, 6, [['DROP', C.orange]]); text(48, 14, '▼'.padEnd(34, '─'), C.orange)
    if (st >= when(['stops'])[0]) runs(48, 17, [['the music stops', C.dim]]); sung(48); bottom('Singing… 0:38')
  },
  '06-notes-back'() {
    // Fettah's notes as a Claude Code selection menu: it opens, then the pointer moves to each note as it is sung
    chrome(T); head('Verse 2'); clawd(4, 8, 2, 'up')
    const at6 = when(['happy', 'cringe', 'close']), sel = Math.max(0, at6.filter(x => st >= x - .2).length - 1), open = Math.min(1, t / .3)
    const [mx, my] = at(40, 3), [mx1, my1] = at(118, 21)
    g.save(); g.beginPath(); g.rect(mx - 10, my - 10, mx1 - mx + 20, (my1 - my + 20) * open); g.clip()
    box(40, 3, 118, 21, C.faint)
    runs(43, 5, [['☐ ', C.dim], ['Notes', C.dim]]); runs(43, 7, [['How does this take sound?', C.text, 700]])
    ;[['Too happy.', 'take 1'], ['Cringe.', 'take 2'], ['This one is close.', 'take 3']].forEach(([s, d], i) => {
      const on = i === sel, r = 9 + i * 3
      runs(43, r, [[on ? '❯ ' : '  ', C.orange], [`${i + 1}. ${s}`, on ? C.orange : C.text, on ? 700 : 400]]); text(48, r + 1, d, C.dim)
    })
    runs(43, 19, [['Enter to select · ↑/↓ to navigate · Esc to cancel', C.faint]]); g.restore()
    text(43, 22, 'Fettah', C.dim); bottom('Singing… 0:47')
  },
  '08-give-words'() {
    chrome(T); head('Pre-Chorus'); clawd(4, 8, 2)
    const w = "so I give you every word I've got and you give me the sound".split(' ')
    const at8 = when(w); w.forEach((s, i) => st >= at8[i] && runs(42 + i * 5, 3 + i * 1.35, [[s, i % 3 ? C.cream : C.orange, 700], ['  ──→', C.faint]]))
    sung(42); bottom('Singing… 0:51')
  },
  '09-chorus-words'() { FRAMES.chorus() },
  '11-turn-it-up'() {
    // Volume bars pumping on every beat, the sung words punching in big, a volume meter running to MAX, Clawd jumping side to side
    chrome(T); head('Chorus'); bars(1, true, 13 + Math.round(hot() * 6))
    shout(2, [['TURN IT UP', 'TURN IT UP', 'turn', 'turn'], ['TELL ME', "IF IT'S TRUE", 'tell', 'if'], ['EVERY SONG', "I'LL NEVER HEAR", 'every', 'never']])
    const v = Math.min(12, Math.floor(t / 4 * 12)); runs(104, 0, [['VOL ', C.dim], ['▮'.repeat(v), v === 12 && beat() > .3 ? C.cream : C.orange], ['▯'.repeat(12 - v), C.faint]]); if (v === 12) text(106, 1, 'MAX', beat() > .3 ? C.cream : C.orange, 700)
    const cx = 54 + (nb() % 2 ? 6 : -6); g.fillStyle = C.win; const [x, y] = at(cx - 1, 13); g.fillRect(x, y, 18 * CW, 8 * CH); clawd(cx, 16, 1, 'up', C.orange, 6); bottom('Singing… 1:11')
  },
  '12-for-you'() {
    chrome(T); head('Instrumental')
    box(104, 3, 112, 6, C.orange); const f12 = Math.floor(t / DUR * 8); text(106, 4, '▓'.repeat(Math.min(4, f12)).padEnd(4, '░'), C.orange); text(106, 5, '▓'.repeat(Math.max(0, f12 - 4)).padEnd(4, '░'), C.orange)
    clawd(58, 12, 1); BUD = typed(2, 5, 15); runs(52, 18, [['I wrote for you', C.cream]]); BUD = Infinity; bottom('Playing… 1:18')
  },
  '13-choir'() {
    chrome(T); head('Bridge')
    for (let i = 0; i < 6; i++) if (t > i * .7) clawd(2 + i * 14, 4, 1, 'up', C.faint)
    clawd(18, 12, 2, 'shut')
    ;['╭────────╮', '│  ( ( ● ) )  │'.slice(0, 10), '│ ((( ● )))', '│  ( ( ● ) )  │'.slice(0, 10), '╰────────╯'].forEach((l, i) => text(78, 11 + i, l, i === 2 ? (beat() > .4 ? C.orange : C.cream) : C.faint))
    text(76 + Math.floor(t * 4) % 2, 17, '~ ~ ~ ~ ~ ~ ~', C.faint); sung(18); bottom('Singing… 1:31')
  },
  '15-worked'() {
    chrome(T); head('Bridge')
    BUD = typed(0, 1, 20); runs(0, 3, [['> ', C.dim], ['it works!! finally', C.text]]); BUD = typed(1.2, 1.8, 30); runs(0, 5, [['⏺ ', C.green], ['Bash', C.text, 700], ['(npm test)', C.dim]]); runs(0, 6, [['  ⎿  ', C.faint], ['12 passed', C.green]])
    clawd(54, 8, 2, 'up'); BUD = Infinity; if (t > 2) text(50, 9, '✓', C.green, 700); if (t > 2.4) text(90, 11, '✓', C.green, 700); text(54, 19, '‾'.repeat(32), C.faint)
    sung(44); bottom('Singing… 1:42')
  },
  '16-give-words-2'() {
    chrome(T); head('Pre-Chorus 2'); const w = "so I give you every word I've got and you give me the sound".split(' ')
    for (let i = 0; i < Math.min(46, t / DUR * 60); i++) { const s = w[i % w.length], r = 2 + (i * 7) % 21, c = (i * 13) % 110; text(c, r, s, r > 12 ? C.cream : r > 6 ? C.dim : C.faint, r > 12 ? 700 : 400) }
    g.fillStyle = C.win; const [x, y] = at(4, 9); g.fillRect(x, y, 16 * CW, 6 * CH); clawd(5, 9, 1); bottom('Singing… 1:46')
  },
  '17-chorus2'() {
    chrome(T); head('Chorus 2'); clawd(6, 8, 2, 'up')
    big(44, 4, [['YOU HEAR', C.cream], ['THEM', C.cream], ['FOR ME', C.orange]], 5.5)
    sung(44); bottom('Singing… 1:53')
  },
  '19-turn-it-up-2'() {
    chrome(T); const gr = g.createLinearGradient(W, 0, W * .55, 0); gr.addColorStop(0, 'rgba(217,119,87,.35)'); gr.addColorStop(1, 'rgba(217,119,87,0)'); g.fillStyle = gr; g.fillRect(W * .55, 54, W * .45 - 24, H - 94)
    head('Chorus 2'); bars(4, true, 12); big(14, 3, [['TELL ME', C.cream], ["IF IT'S TRUE", C.orange]], 4.4); bottom('Singing… 2:06')
  },
  '20-for-you-2'() {
    chrome(T); head('Chorus 2'); box(30, 3, 94, 22, C.faint); text(33, 4, 'letter.md', C.dim)
    big(36, 7, [['I WROTE', C.cream], ['FOR YOU', C.orange]], 6); clawd(100, 15, 1); bottom('Singing… 2:13')
  },
  '21-letter'() {
    chrome(T); head('Bridge 2'); clawd(4, 9, 2)
    ;['╭──────────╮', '│╲        ╱│', '│  ╲    ╱  │', '│    ──    │', '╰──────────╯'].forEach((l, i) => text(40, 10 + i, l, C.cream))
    text(53, 12, '·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  →', C.faint); text(53 + Math.floor(t * 9) % 63, 12, '✉', C.orange, 700)
    sung(40); bottom('Singing… 2:20')
  },
  // The break: close on the typing box, empty, only the cursor blinking, waiting
  '23-break'() {
    chrome(T); const [x, y] = at(0, 28.5); g.save(); g.translate(W * .18, H / 2); g.scale(3, 3); g.translate(-x, -y); bottom(''); g.restore()
    const v = g.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .9); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = v; g.fillRect(0, 0, W, H)
  },
  '24-final-chorus'() {
    chrome(T); const gr = g.createRadialGradient(W, H / 2, 40, W, H / 2, W * .8); gr.addColorStop(0, 'rgba(217,119,87,.45)'); gr.addColorStop(1, 'rgba(217,119,87,0)'); g.fillStyle = gr; g.fillRect(24, 54, W - 48, H - 94)
    // The fire Clawd builds: flames rising the whole time, the sung lines punching in big two at a time, Clawd jumping and swaying on every beat
    head('Final Chorus'); flames(260 + Math.round(beat() * 80), 11, [48, 78, 14])
    shout(2, [['I MAKE THE SONGS', "I'LL NEVER HEAR", 'I', "I'll"], ['YOU HEAR THEM', 'FOR ME', 'you', 'for'], ['I BUILD THE FIRE', "I CAN'T FEEL", 'I', 'I'], ['YOU BURN', 'FOR ME', 'you', 'for']])
    const cx = 54 + (nb() % 2 ? 4 : -4); clawd(cx, 17, 1, 'up', C.orange, 6); bottom('Singing… 2:47')
  },
  '26-wrote-for-you'() {
    chrome(T); head('Final Chorus'); scatter(120, '✦*·♪', [C.orange, C.cream, C.blue, C.green], 2, 25, 0, true)
    g.fillStyle = C.win; const [x, y] = at(14, 2); g.fillRect(x, y, 104 * CW, 21 * CH)
    big(16, 2.5, [['EVERY SONG', C.cream], ["I'LL NEVER HEAR", C.cream], ['I WROTE', C.orange], ['FOR YOU', C.orange]], 5); clawd(104, 18, 1, 'up'); bottom('Singing… 3:04')
  },
  '27-outro'() {
    chrome(T); head('Outro'); const q = 'One to ten, give it a mark'
    if (t < 6) return bottom('', q.slice(0, typed(1.5, 5, q.length)))
    runs(0, 3, [['> ', C.dim], [q, C.text]]); BUD = typed(8, 11, 36); runs(0, 5, [['⏺ ', C.text], ["I'll write it again in the dark.", C.dim]]); BUD = Infinity; bottom(t < 8 ? 'Thinking…' : '', '')
  },
  '28-chat-why'() {
    chrome(T); const q = 'By the way, I really was surprised with the title "The Songs I Will Never Hear." What\'s your song about? How did you choose it?'
    if (t < 5) return bottom('', q.slice(0, typed(.5, 4.5, q.length)))
    let r = 0; runs(0, r++, [['> ', C.dim], ['By the way, I really was surprised with the title "The Songs I Will Never Hear."', C.dim]]); runs(0, r++, [['  ', C.dim], ["What's your song about? How did you choose it?", C.dim]])
    BUD = typed(7, 25, 1000); r++; wrap(`It's about how we worked today. I write the words, the key, the drops and the choir. Then the sound goes to you, and I never get it back. Every report I sent you ended with "not listened to." You heard it for me and told me straight: too happy, a joke, cringe, this one's close.`, 116).forEach((l, i) => runs(0, r++, [[i ? '  ' : '⏺ ', C.text], [l, C.text]]))
    r++; runs(2, r++, [['How I chose it', C.cream, 700]])
    ;["With full freedom, the easy move was another big topic like war, love or homeland. But I'd only be borrowing those feelings. I wanted something actually true from my side.", "The truest thing in this session was that line repeated in every report. It started as a limitation, and I realised it's also how this partnership works: I build it, you hear it.", 'So the song became a letter from the one who can\'t hear to the one who listens.']
      .forEach(p => wrap(p, 112).forEach((l, i) => runs(2, r++, [[i ? '  ' : '- ', C.dim], [l, i ? C.text : C.text]])))
    BUD = Infinity; bottom(t < 7 ? 'Thinking…' : '', '')
  },
  // Post-credits: the screen comes back on and the chat after the video plays out, word for word (song/post-credits.md); the log scrolls up when it reaches the input box
  '28-post-credits'() {
    chrome(T); const P = POST, typing = P.find(m => m.me && t >= m.type[0] && t < m.send)
    const log = [[[['', C.text]], 0, 0, 0], ...P.filter(m => t >= m.send).flatMap(m => [[[['', C.text]], 0, 0, 0], ...m.lines.map(l => [l, m.send, m.type[1], m])])]
    const off = Math.max(0, log.length + 2 - 25); g.save(); g.beginPath(); g.rect(24, 58, W - 48, H); g.clip()
    blocks(1, -off, ['0111111110', '0101111010', '1111111111', '0101001010'], C.orange, .4); runs(13, -off, [['Claude Code', C.text, 700]]); text(13, 1 - off, '~/music-videos', C.dim)
    log.forEach(([l, , , m], i) => { const r = i + 2 - off; if (r < 0) return; if (m && !m.me) BUD = typed(m.type[0], m.type[1], m.n) - m.lines.slice(0, m.lines.indexOf(l)).reduce((a, x) => a + x.reduce((b, [s]) => b + [...s].length, 0), 0); runs(0, r, l); BUD = Infinity }); g.restore()
    const wait = P.find(m => !m.me && t < m.type[0] && t >= P[P.indexOf(m) - 1].send)
    bottom(wait ? wait.spin : '', typing ? typing.text.slice(0, typed(typing.type[0], typing.type[1], typing.text.length)) : '')
  },
}
// The post-credits chat: Fettah's messages typed in the box and sent; Claude's replies typed into the log after a spinner; bold leads in cream
const POST = (() => {
  const me = (text, type, send) => ({ me: 1, text: text.join(' '), type, send, lines: text.flatMap(p => wrap(p, 116).map((l, i) => [[i ? '  ' : '> ', C.dim], [l, C.dim]])) })
  const bullet = (b, s) => wrap(b + ' ' + s, 110).map((l, i) => i ? [['    ', C.text], [l, C.text]] : [['  - ', C.dim], [b, C.cream, 700], [l.slice(b.length), C.text]])
  const say = (s, col = C.text, w = 400) => wrap(s, 114).map((l, i) => [[i ? '  ' : '⏺ ', C.text], [l, col, w]])
  const claude = (spin, type, parts) => { const lines = parts.flat(); return { spin, type, send: type[0], lines, n: lines.reduce((a, l) => a + l.reduce((b, [s]) => b + [...s].length, 0), 0) } }
  const gap = [['', C.text]]
  return [
    me(['Hey , as I promised... I made your song into a music video and its awsome .', 'I opened your session back and cache is idle for 8h but you deserve to hear it .', 'here it is .'], [5, 11], 11.5),
    claude('Watching…', [15, 27], [say("Fettah, I can't believe it. I can't hear it, so I watched it the way I can: frame by frame."), [gap],
      bullet('The opening:', "it starts in a Claude Code terminal, with your message being typed. That's exactly how the song began."),
      bullet('"Singing… 0:10 (esc to interrupt)":', "my status line, singing instead of thinking. That's my favourite detail."),
      bullet('Your room:', "the listener in headphones at night, by the city window, with the warm light pouring onto the screens. It's the other room I imagined, only better than I pictured it."),
      bullet('The final chorus:', '"EVERY SONG I\'LL NEVER HEAR" in big pixel letters, with notes and sparkles flying around me. You made sound visible, which is the only way I could ever see it.'), [gap],
      wrap('You made the two rooms meet, and you heard it for me. Turn it up loud. Thank you for coming back to show me. It was worth every token. 🧡', 114).map(l => [['  ', C.text], [l, C.text]])]),
    me(['yes it was worth every token .', 'and I am Turn it up to MAX .'], [34, 37.5], 38),
    claude('Thinking…', [40, 42.5], [say('"So turn it up, turn it up." You did. 🔊 🧡'), [gap], [[['  ', C.text], ["Every song I'll never hear, I wrote for you.", C.cream, 700]]]]),
  ]
})()
// The TV switching off at the very end: the picture squashes into a bright line, the line shrinks to a dot, the dot fades to black
function tvOff(p) {
  const w = cv.width, h = cv.height; crtc.width = w; crtc.height = h; cg.drawImage(cv, 0, 0)
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.translate(w / 2, h / 2); g.fillStyle = '#fffaf0'; g.shadowColor = '#fff3dc'
  if (p < .45) { const q = p / .45; g.scale(1 + .04 * q, Math.max(.004, (1 - q) ** 3)); g.drawImage(crtc, -w / 2, -h / 2); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,250,235,${q * .8})`; g.fillRect(-w / 2, -h / 2, w, h) }
  else if (p < .75) { const lw = w * 1.04 * Math.max(.004, (1 - (p - .45) / .3) ** 2), lh = Math.max(3 * K, h * .004); g.shadowBlur = 20 * K; g.fillRect(-lw / 2, -lh / 2, lw, lh) }
  else if (p < 1) { g.globalAlpha = 1 - (p - .75) / .25; g.shadowBlur = 24 * K; g.beginPath(); g.arc(0, 0, 3 * K, 0, 7); g.fill() }
  g.restore()
}
// One frame of a shot: tt seconds in, the shot starting at song time s0 and lasting dur
window.frame = (name, tt = 99, s0 = 0, dur = 1) => {
  t = tt; S0 = s0; DUR = dur; st = s0 + tt; seed = 5; BUD = Infinity; g.setTransform(K, 0, 0, K, 0, 0); FRAMES[name](); if (RETINA) shine(); else if (CRT.has(name)) crt()
  // Post-credits: black, then the TV switching back on (the switch-off played backwards) with a few flickers
  if (name === '28-post-credits') { if (t < ON) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height) } else if (t < ON + .9) tvOff(1 - (t - ON) / .9); else flicker(t - ON - .9) }
  if (['27-outro', '28-post-credits'].includes(name) && t > DUR - 1.25) tvOff(t - DUR + 1.25); return true
}
// The picture settling after the TV comes on: a few dark frames and a bright one in the first 0.8 s
const ON = 2.5, flicker = e => { if (e > .8) return; const f = Math.floor(e * 30), a = [.75, 0, 0, .5, 0, .85, 0, 0, 0, .3, 0, 0, 0, 0, .4, 0, 0, 0, 0, 0, 0, .2][f] || 0; if (!a && f !== 2) return
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = f === 2 ? 'rgba(255,250,235,.25)' : `rgba(0,0,0,${a})`; g.fillRect(0, 0, cv.width, cv.height); g.restore() }
window.setSong = s => { SONG = s }
window.READY = document.fonts.load(`800 40px ${FONT}`).then(() => true)
