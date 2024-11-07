---
marp: true
theme: default
---

# BuildX History

---

# buildx v0, [buildx-new](https://github.com/theopensystemslab/buildx-new) on github

_(March 2021 - Jan 2022)_

- `ModuleLayout` with cell widths, heights, lengths
- `localStorage` instead of IndexedDB
- custom AABB `Box3` based collisions code (buggy?)
- fairly heavy `valtio` usage and React Context for state
  - bridged contexts for R3F compatibility
- heavy R3F usage
- `SiteHouse` holy shit

---

# buildx v1, [buildx-next](https://github.com/theopensystemslab/buildx-next) on github

### deployment: [h4.energy](https://h4.energy)

_(Feb - July 2022)_

- uses Next.js instead of Vite
- `StretchedColumns`
- dashboard page
- download page
- no x-stretch; z-stretch uses simple white mesh and loaders a lot

---

# buildx v2, [buildx-reloaded](https://github.com/theopensystemslab/buildx-reloaded) on github

_(Sep 2022 - Dec 2023)_

### deployment: [build.wikihouse.cc](https://build.wikihouse.cc)

- indexeddb for caching (maybe see that old miro)
- workers
- analyse and build pages
- collisions - OBB’s, centering houses; still laying them out from front to back but then centering with a parenting group, for the sake of OBB’s and rotating about actual center
- x-stretch
- no loaders for interactions (fast)

---

# buildx v3, [buildx-core](https://github.com/theopensystemslab/buildx-core) + [buildx-app](https://github.com/theopensystemslab/buildx-app) on github

### deployment: [osl-buildx-app.netlify.app](https://osl-buildx-app.netlify.app)

_(Jan 2024 - Present)_

- capped cuts (csg)
- R3F completely ripped out
- optional manager classes for most (all?) interactions
