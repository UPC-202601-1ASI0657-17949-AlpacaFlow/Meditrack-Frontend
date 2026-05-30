export const environment = {
  production: false,
  timeApiUrl: 'https://worldtimeapi.org/api/timezone/America/Lima',
  platformProviderDoctorsEndpointPath: '/api/v1/doctors',
  platformProviderCaregiversEndpointPath: '/api/v1/caregivers',
  platformProviderSeniorCitizensEndpointPath: '/api/v1/senior-citizens',
  platformProviderOrganizationsEndpointPath: '/api/v1/organizations',
  platformProviderAdminsEndpointPath: '/api/v1/admins',
  // API Gateway (meditrack-gateway) — single entry point for IAM + Organization
  platformProviderApiBaseUrl: 'http://localhost:8088',
  platformProviderRelativesEndpointPath: '/api/v1/relatives',
  platformProviderUsersEndpointPath: '/users',
  platformProviderCredentialsEndpointPath: '/credentials',
  platformProviderAuthEndpointPath: '/auth',
  platformProviderDevicesEndpointPath: '/api/v1/devices',
  platformProviderAlertsEndpointPath: '/api/v1/alerts',

  appName: 'MediTrack'
};
