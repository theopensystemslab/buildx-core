---
marp: true
theme: default
---

# BuildX History

---

# buildx v0, [buildx-new](https://github.com/theopensystemslab/buildx-new) on github

_(March 2021 - Jan 2022)_

- competing state management solutions (r3f, react context bridging, valtio, three)
- `ModuleLayout` requires uniformly-lengthed columns
- `SiteHouse` component is a monolith
- localStorage instead of IndexedDB
- custom AABB based collisions code (buggy?)

---

# buildx v1, [buildx-next](https://github.com/theopensystemslab/buildx-next) on github

### deployment: [h4.energy](https://h4.energy)

_(Feb - July 2022)_

- Next.js instead of Vite
- `StretchedColumns`
- dashboard page (old version of "analyse" page)
- download page (old version of "build" page)
- no x-stretch; z-stretch uses simple white mesh and loaders a lot

---

# buildx v2, [buildx-reloaded](https://github.com/theopensystemslab/buildx-reloaded) on github

_(Sep 2022 - Dec 2023)_

### deployment: [build.wikihouse.cc](https://build.wikihouse.cc)

- IndexedDB for caching (maybe see that old miro)
- workers overkill
- analyse and build pages
- collisions - OBB’s, centering houses; still laying them out from front to back but then centering with a parenting group, for the sake of OBB’s and rotating about actual center
- x-stretch
- no loaders for interactions (fast)
- trpc

---

# buildx v3, [buildx-core](https://github.com/theopensystemslab/buildx-core) + [buildx-app](https://github.com/theopensystemslab/buildx-app) on github

### deployment: [osl-buildx-app.netlify.app](https://osl-buildx-app.netlify.app)

_(Jan 2024 - Present)_

- separation of core and app code
- R3F finally ripped out completely
- capped cuts with [three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg)
- optional manager classes for most (all?) interactions
