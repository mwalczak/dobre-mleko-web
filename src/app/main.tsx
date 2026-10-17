import '../shared/fonts';
import '../shared/styles/base.css';
import './app.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ToastProvider } from '../shared/components/Toast';
import { createQueryClient } from '../shared/query';
import { Shell } from './Shell';
import { DeleteAccountPage } from './pages/DeleteAccountPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { MePage } from './pages/MePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PlacePage } from './pages/PlacePage';
import { PrivacyPage } from './pages/PrivacyPage';
import { RatePage } from './pages/RatePage';
import { ReportPage } from './pages/ReportPage';
import { StatsPage } from './pages/StatsPage';
import { WishlistPage } from './pages/WishlistPage';

const router = createBrowserRouter([
  // Public, without signing in (linked from the App Store and Google Play).
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/usun-konto', element: <DeleteAccountPage /> },
  {
    element: <Shell />,
    children: [
      { path: '/', element: <DiscoverPage /> },
      // The map library is large: load it only on the pages that show a map.
      { path: '/map', lazy: () => import('./pages/MapPage').then((m) => ({ Component: m.MapPage })) },
      { path: '/add', lazy: () => import('./pages/PlaceFormPage').then((m) => ({ Component: m.AddPlacePage })) },
      { path: '/places/:id', element: <PlacePage /> },
      { path: '/places/:id/rate', element: <RatePage /> },
      {
        path: '/places/:id/edit',
        lazy: () => import('./pages/PlaceFormPage').then((m) => ({ Component: m.EditPlacePage })),
      },
      { path: '/stats', element: <StatsPage /> },
      { path: '/report', element: <ReportPage /> },
      { path: '/me', element: <MePage /> },
      { path: '/me/wishlist', element: <WishlistPage /> },
      { path: '/members/:id/wishlist', element: <WishlistPage /> },
      {
        path: '/wishlist/new',
        lazy: () => import('./pages/WishlistFormPage').then((m) => ({ Component: m.AddWishlistPage })),
      },
      {
        path: '/wishlist/:id',
        lazy: () => import('./pages/WishlistItemPage').then((m) => ({ Component: m.WishlistItemPage })),
      },
      {
        path: '/wishlist/:id/edit',
        lazy: () => import('./pages/WishlistFormPage').then((m) => ({ Component: m.EditWishlistPage })),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
