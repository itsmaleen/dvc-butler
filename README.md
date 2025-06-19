# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Getting Started

### 1. Install Prerequisites

Before you begin, make sure you have all the required dependencies for Tauri development. Follow the official guide to install Rust, Node.js, and other platform-specific requirements:

- [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

### 2. Install Rust Dependencies

After installing the prerequisites, install any required Rust dependencies (if your project specifies any). For example, to install a Rust CLI tool globally, you can use:

```sh
cd src-tauri
cargo install --path .
```

### 3. Install Project Dependencies

After installing the prerequisites and Rust dependencies, install the project dependencies using [pnpm](https://pnpm.io/):

```sh
pnpm install
```

### 4. Configure Analytics (Optional)

The application uses PostHog for product analytics to track performance and usage patterns. To enable analytics:

1. Create a `.env` file in the root directory
2. Add the following environment variables:
```env
VITE_PUBLIC_POSTHOG_KEY=your_project_api_key
VITE_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

Replace `your_project_api_key` with your actual PostHog project API key. If you're using a self-hosted PostHog instance, update the host URL accordingly.

### 5. Start the Development Server

To start the Tauri development environment, run:

```sh
pnpm tauri dev
```

This will launch both the Vite development server and the Tauri application.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
