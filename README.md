# Chinese Learning App

This project is built with [Vite](https://vitejs.dev/) and React. It provides interactive Chinese character stroke order animations, pinyin with context-aware segmentation, PDF export, and more.

## Development

To start the development server:

```bash
npm run dev
```

Open [http://localhost:5173/chinese/](http://localhost:5173/chinese/) in your browser.

## Building for Production

To build the app for production:

```bash
npm run build:vite
```

The output will be in the `dist/` directory, ready for deployment.

## Preview Production Build

To preview the production build locally:

```bash
npm run preview
```

## Deployment

Deploy to GitHub Pages:

```bash
npm run deploy
```

This will build the app and publish the contents of `dist/` to the `gh-pages` branch. The app is served at [https://ianespanto.github.io/chinese/](https://ianespanto.github.io/chinese/).

## Features

-   Stroke order animation using HanziWriter
-   Context-aware pinyin via pinyin-pro
-   PDF export of characters and stroke order
-   Modern SCSS styling
-   Mobile-friendly UI

## Project Structure

-   `src/` — Main source code
-   `public/` — Static assets and hanzi-writer data
-   `dist/` — Production build output (auto-generated)

## CSS & Assets

Vite automatically processes and minifies CSS and SASS. No extra configuration is needed.

## License

MIT
