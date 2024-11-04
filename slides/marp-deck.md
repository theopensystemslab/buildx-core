---
marp: true
theme: default
---

# Hello BuildX

###### _a 3D parametric building design tool built with [Three.js](https://threejs.org/)_

---

# Two Repositories

### app: the front-end Next.js web application

GitHub: [github.com/theopensystemslab/buildx-app](https://github.com/theopensystemslab/buildx-app)

(depends on core)

### core: Three.js and data processing functionality

GitHub: [github.com/theopensystemslab/buildx-core](github.com/theopensystemslab/buildx-core)

(less UI noise, focus on Three.js interactions working in more of a vacuum)

---

# Where to begin?

Let's focus on core

---

# Where does buildx-core begin?

BuildX is about building houses

So how is a house built in BuildX?

---

# What is a house/building in BuildX?

- composed of [modules](https://airtable.com/app9duJc6vjuA9b8m/tbloJKqAxjIybEcq8)
  - model by `speckle_branch_url` property, pointing to Speckle
    - **what is a Speckle model for our purposes?**
      - **IFC tagged geometries**
  - the rest is information (dimensions, costs, metadata)
- initialized by [house types](https://airtable.com/app9duJc6vjuA9b8m/tbla5XgKToyT0bpo5)
- [elements](https://airtable.com/app9duJc6vjuA9b8m/tbliZTiIl57dogJSl) and [materials](https://airtable.com/app9duJc6vjuA9b8m/tblVA8svikxDCtEBN) tables **mapping materials to IFC tags**

---

# Let's render a single module

- example

---

# Let's layout a house type

- example

---
