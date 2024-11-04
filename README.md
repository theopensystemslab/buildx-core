# @opensystemslab/buildx-core

A core library for Build, a Three.js and data processing interface.

## Getting Started

### Installation

```bash
pnpm install @opensystemslab/buildx-core
```

### Development

1. Clone the repository:

```bash
git clone https://github.com/theopensystemslab/buildx-core.git

cd buildx-core
```

2. Install dependencies:

```bash
pnpm install
```

3. Configure Airtable:

Create a `.env` file in the root directory with your Airtable access token:

```bash
VITE_AIRTABLE_ACCESS_TOKEN=your_access_token_here
```

You can obtain an access token from your [Airtable account settings](https://airtable.com/create/tokens).

4. Start the development server:

```bash
pnpm dev
```

5. Access examples by navigating to `localhost:5173/examples/<example-name>/`

See the [examples](./examples/) directory

### Build/Publish

```bash
pnpm build
```

Builds the project to `dist/`

You can then `pnpm link --global` here and `pnpm link --global @opensystemslab/core` from consuming projects

Publish with `npm publish` as usual
