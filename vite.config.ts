import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';

// Ensure PWA assets exist in public/
try {
  const publicDir = path.resolve('./public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const iconSrc = path.resolve('./src/assets/images/app_logo_1785945917215.jpg');
  if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, path.join(publicDir, 'pwa-192x192.png'));
    fs.copyFileSync(iconSrc, path.join(publicDir, 'pwa-512x512.png'));
    fs.copyFileSync(iconSrc, path.join(publicDir, 'app-logo.png'));
    fs.copyFileSync(iconSrc, path.join(publicDir, 'icon.png'));
    fs.copyFileSync(iconSrc, path.join(publicDir, 'favicon.ico'));
  } else {
    // Minimal fallback text to prevent build errors
    fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), 'placeholder');
    fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), 'placeholder');
  }
} catch (e) {
  console.error("Failed to setup PWA icons:", e);
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        },
        manifest: {
          name: 'السوق المفتوح اليمني',
          short_name: 'سوق اليمن',
          description: 'أفضل تطبيق لبيع وشراء السيارات العقارات الموبايلات والوظائف في اليمن',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '.',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-dom') || id.includes('react-router-dom') || id.includes('react-helmet-async') || id.includes('/react/')) {
                return 'vendor-react';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('leaflet')) {
                return 'vendor-maps';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('motion') || id.includes('recharts') || id.includes('lightbox') || id.includes('fuse') || id.includes('zustand') || id.includes('jspdf')) {
                return 'vendor-ui';
              }
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
