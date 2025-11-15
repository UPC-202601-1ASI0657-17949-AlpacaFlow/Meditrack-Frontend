import { Routes } from '@angular/router';
import { Layout } from './shared/presentation/components/layout/layout';
import { About } from './shared/presentation/views/about/about';
import { Support } from './shared/presentation/views/support/support';
import { PageNotFound } from './shared/presentation/views/page-not-found/page-not-found';
import {relativesRoutes} from "./relatives/presentation/relative.routes";

const about = () => import('./shared/presentation/views/about/about').then(m => m.About);
const support = () => import('./shared/presentation/views/support/support').then(m => m.Support);
const pageNotFound = () => import('./shared/presentation/views/page-not-found/page-not-found').then(m => m.PageNotFound);

const baseTitle = 'MediTrack';


export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./auth/presentation/auth.routes').then(m => m.authRoutes)
  },
  {
    path: 'relative',
    loadChildren: () =>
        import('./relatives/presentation/relative.routes').then(m => m.relativesRoutes)
  },
  {
    path: 'organization',
    loadChildren: () =>
        import('./organization/presentation/organization.routes').then(m => m.organizationRoutes)
  },
  {
    path: '**',
    loadComponent: pageNotFound,
    data: { title: `${baseTitle} - Page Not Found` }
  }
]

