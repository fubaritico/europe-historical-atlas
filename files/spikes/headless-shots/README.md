# headless-shots — photograph or time a page without touching the dev's screen

Three scripts that start a headless Chrome, drive it through the debugging protocol (ports 9377 and 9378) and write PNG
files or timings.
Written during the sessions of 2026-11-17 and 18, to show the dev what a change does on the map while he is away
(memory `captures-before-pushing-when-remote`), and kept here at his word: _"what will serve again goes in a spike;
otherwise leave nothing behind"_ (2026-11-18).

| script | what it does |
| --- | --- |
| `shoot-map.mjs` | the atlas at named places (Poitiers, Rome, Malagón, Haïfa, New Forest, Lyon), at a zoom: the camera is set through the page's own saved view, `sessionStorage` key `europe-map:map-camera` |
| `shoot-page.mjs` | any one page — a bench (`/icons.html?council`), a local HTML file — at a window size; prints the page's errors |
| `measure-page.mjs` | times gestures in a page and says where the CPU time went: it runs the steps of a steps file (`steps-cities.mjs`, the « Cities » panel of the Cartographer, CARTO-485), each timed to the second frame after it, with a CPU profile's top functions for the steps that ask for one |

```bash
node files/spikes/headless-shots/shoot-map.mjs after http://localhost:5173/ /some/out/dir 0.97 25 rome,lyon
node files/spikes/headless-shots/shoot-page.mjs "http://localhost:5173/icons.html?council" /some/out/council.png 1500 800 6
node files/spikes/headless-shots/measure-page.mjs "http://localhost:5199/?map=1100" files/spikes/headless-shots/steps-cities.mjs
```

- **Node 24** (global `fetch` and `WebSocket`), Google Chrome in `/Applications`.
- **Nothing is left behind**: each run makes its own Chrome profile in the system's temporary folder and removes it
  when it ends. A profile kept between runs weighed 240 MB after two days.
- **The dev's servers are his**: the scripts read a page of a server already running; they start none.
- **One GPU**: a headless page beside the dev's own tab slows his (measured 2026-10-29, `files/plans/atlas/performance.md`)
  — shoot while he is not testing.
- **A headless Chrome has no graphics card**: the canvas's own painting is slower there than on the dev's screen (the
  0.2 s of `closePath` per repaint seen on 2026-11-19 was not felt by him) — its timings rank costs, they are not his.
- To add a place to `shoot-map.mjs`: a line in `PLACES`, longitude then latitude.
