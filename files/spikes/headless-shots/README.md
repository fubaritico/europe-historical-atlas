# headless-shots — photograph a page without touching the dev's screen

Two scripts that start a headless Chrome, drive it through the debugging protocol (port 9377) and write PNG files.
Written during the sessions of 2026-11-17 and 18, to show the dev what a change does on the map while he is away
(memory `captures-before-pushing-when-remote`), and kept here at his word: _"what will serve again goes in a spike;
otherwise leave nothing behind"_ (2026-11-18).

| script | what it does |
| --- | --- |
| `shoot-map.mjs` | the atlas at named places (Poitiers, Rome, Malagón, Haïfa, New Forest, Lyon), at a zoom: the camera is set through the page's own saved view, `sessionStorage` key `europe-map:map-camera` |
| `shoot-page.mjs` | any one page — a bench (`/icons.html?council`), a local HTML file — at a window size; prints the page's errors |

```bash
node files/spikes/headless-shots/shoot-map.mjs after http://localhost:5173/ /some/out/dir 0.97 25 rome,lyon
node files/spikes/headless-shots/shoot-page.mjs "http://localhost:5173/icons.html?council" /some/out/council.png 1500 800 6
```

- **Node 24** (global `fetch` and `WebSocket`), Google Chrome in `/Applications`.
- **Nothing is left behind**: each run makes its own Chrome profile in the system's temporary folder and removes it
  when it ends. A profile kept between runs weighed 240 MB after two days.
- **The dev's servers are his**: the scripts read a page of a server already running; they start none.
- **One GPU**: a headless page beside the dev's own tab slows his (measured 2026-10-29, `files/plans/atlas/performance.md`)
  — shoot while he is not testing.
- To add a place to `shoot-map.mjs`: a line in `PLACES`, longitude then latitude.
