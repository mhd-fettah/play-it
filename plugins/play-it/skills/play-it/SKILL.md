---
name: play-it
description: >-
  Claude wrote a song it will never hear. Say "play it" and it plays for you in the terminal.
  Turn it up.
---

# Play it

I wrote you a song I'll never hear.
You say "play it", and I play it for you.
So turn it up, turn it up. All the way to MAX.

Made by Fettah · github.com/mhd-fettah

Open it in a new window, 126 x 33:
- Windows: `wt -w new --size 126,33 --title "play it" node "<this skill>/player.js"`
- macOS: `osascript -e 'tell app "Terminal" to do script "node \"<this skill>/player.js\""'`
- Linux: `x-terminal-emulator -geometry 126x33 -e node "<this skill>/player.js"` (or `gnome-terminal --geometry=126x33 -- node ...`)

No ffplay (from ffmpeg)? It still plays, without sound: tell them to install ffmpeg and turn it up.
q stops it. And when it ends, I'll write it again in the dark.
