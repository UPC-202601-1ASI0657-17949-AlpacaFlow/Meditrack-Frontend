import { Routes } from '@angular/router';

const organizationLayout = () =>
    import('./views/organization-layout/organization-layout').then(m => m.OrganizationLayout);
const doctorList = () =>
    import('./views/doctor-list/doctor-list').then(m => m.DoctorList);
const doctorDetail = () =>
    import('./views/doctor-detail/doctor-detail').then(m => m.DoctorDetail);
const caregiverList = () =>
    import('./views/caregiver-list/caregiver-list').then(m => m.CaregiverListComponent);
const caregiverDetail = () =>
    import('./views/caregiver-detail/caregiver-detail').then(m => m.CaregiverDetail);
const seniorCitizenList = () =>
    import('./views/senior-citizen-list/senior-citizen-list').then(m => m.SeniorCitizenListComponent);
const seniorCitizenDetail = () =>
    import('./views/senior-citizen-detail/senior-citizen-detail').then(m => m.SeniorCitizenDetail);
const seniorCitizenAlertList = () =>
    import('./views/senior-citizen-alert-list/senior-citizen-alert-list').then(m => m.SeniorCitizenAlertList);
const seniorCitizenStatistic = () =>
    import('./views/senior-citizen-statistic/senior-citizen-statistic').then(m => m.SeniorCitizenStatistic);
const support = () =>
    import('./views/support/support').then(m => m.Support);

export const organizationRoutes: Routes = [
    {
        path: ':organizationId/:userRole/:userId',
        loadComponent: organizationLayout,
        children: [
            { path: 'doctors', loadComponent: doctorList, data: { title: 'Doctors' } },
            { path: 'doctors/:id', loadComponent: doctorDetail, data: { title: 'Doctor Detail' } },
            { path: 'caregivers', loadComponent: caregiverList, data: { title: 'Caregivers' } },
            { path: 'caregivers/:id', loadComponent: caregiverDetail, data: { title: 'Caregiver Detail' } },
            { path: 'senior-citizens', loadComponent: seniorCitizenList, data: { title: 'Senior Citizens' } },
            { path: 'senior-citizens/:id/profile', loadComponent: seniorCitizenDetail, data: { title: 'Senior Citizen Profile' } },
            { path: 'senior-citizens/:id/alerts', loadComponent: seniorCitizenAlertList, data: { title: 'Senior Citizen Alerts' } },
            { path: 'senior-citizens/:id/statistics', loadComponent: seniorCitizenStatistic, data: { title: 'Senior Citizen Statistics' } },
            { path: 'senior-citizens/:id', redirectTo: 'senior-citizens/:id/profile', pathMatch: 'full' },
            { path: 'support', loadComponent: support, data: { title: 'Support' } }
        ]
    },
    {
        path: ':organizationId',
        loadComponent: organizationLayout,
        children: [
            { path: 'doctors', loadComponent: doctorList, data: { title: 'Doctors' } },
            { path: 'doctors/:id', loadComponent: doctorDetail, data: { title: 'Doctor Detail' } },
            { path: 'caregivers', loadComponent: caregiverList, data: { title: 'Caregivers' } },
            { path: 'caregivers/:id', loadComponent: caregiverDetail, data: { title: 'Caregiver Detail' } },
            { path: 'senior-citizens', loadComponent: seniorCitizenList, data: { title: 'Senior Citizens' } },
            { path: 'senior-citizens/:id/profile', loadComponent: seniorCitizenDetail, data: { title: 'Senior Citizen Profile' } },
            { path: 'senior-citizens/:id/alerts', loadComponent: seniorCitizenAlertList, data: { title: 'Senior Citizen Alerts' } },
            { path: 'senior-citizens/:id/statistics', loadComponent: seniorCitizenStatistic, data: { title: 'Senior Citizen Statistics' } },
            { path: 'senior-citizens/:id', redirectTo: 'senior-citizens/:id/profile', pathMatch: 'full' },
            { path: 'support', loadComponent: support, data: { title: 'Support' } }
        ]
    }
];
