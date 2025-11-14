import { Routes } from '@angular/router';

const authLayout = () =>
    import('./view/auth-layout/auth-layout').then(m => m.AuthLayout);
const login = () =>
    import('./view/login/login').then(m => m.LoginComponent);
const userTypeSelection = () =>
    import('./view/user-type-selection/user-type-selection').then(m => m.UserTypeSelectionComponent);
const signup = () =>
    import('./view/signup/signup').then(m => m.SignupComponent);
const subscriptionSelection = () =>
    import('./view/subscription-selection/subscription-selection').then(m => m.SubscriptionSelectionComponent);
const billingInformation = () =>
    import('./view/billing-information/billing-information').then(m => m.BillingInformationComponent);
const institutionDetails = () =>
    import('./view/institution-details/institution-details').then(m => m.InstitutionDetailsComponent);

export const authRoutes: Routes = [
    {
        path: '',
        loadComponent: authLayout,
        children: [
            { path: 'login', loadComponent: login, data: { title: 'Login' } },
            { path: 'user-type-selection', loadComponent: userTypeSelection, data: { title: 'Select User Type' } },
            { path: 'signup', loadComponent: signup, data: { title: 'Sign Up' } },
            { path: 'subscription-selection', loadComponent: subscriptionSelection, data: { title: 'Select Subscription' } },
            { path: 'billing-information', loadComponent: billingInformation, data: { title: 'Billing Information' } },
            { path: 'institution-details', loadComponent: institutionDetails, data: { title: 'Institution Details' } },
            { path: '', redirectTo: 'login', pathMatch: 'full' }
        ]
    }
];

