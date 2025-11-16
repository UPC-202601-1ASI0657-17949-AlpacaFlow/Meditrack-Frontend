import { Routes } from '@angular/router';

const relativeLayout = () =>
    import('./views/relative-layout/relative-layout').then(m => m.RelativeLayoutComponent);
const alertList = () =>
    import('./views/alert-list/alert-list').then(m => m.AlertList);
const profile = () =>
    import('./views/profile/profile').then(m => m.Profile);
const statistic = () =>
    import('./views/statistic/statistic').then(m => m.Statistic);
const support = () =>
    import('./views/support/support').then(m => m.Support);

export const relativesRoutes: Routes = [
    {
        path: 'relative/:id',
        loadComponent: relativeLayout,
        children: [
            { path: '', redirectTo: 'profile', pathMatch: 'full' },
            { path: 'alerts', loadComponent: alertList, data: { title: 'Alerts' } },
            { path: 'profile', loadComponent: profile, data: { title: 'Profile' } },
            { path: 'statistics', loadComponent: statistic, data: { title: 'Statistics' } },
            { path: 'support', loadComponent: support, data: { title: 'Support' } }
        ]
    }
];
