import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from '../application/auth.store';

/**
 * HTTP Interceptor that adds the JWT token to all HTTP requests
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  // token is a getter that returns a ReadonlySignal, so we call it as a function to get the value
  const tokenSignal = authStore.token;
  const token = tokenSignal();

  console.log('[AuthInterceptor] Intercepting request:', {
    url: req.url,
    method: req.method,
    hasToken: !!token,
    tokenLength: token?.length || 0,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'null'
  });

  // Skip adding token for authentication endpoints (they don't need it)
  const isAuthEndpoint = req.url.includes('/api/v1/authentication/');
  
  // If we have a token and it's not an auth endpoint, add it to the Authorization header
  if (token && !isAuthEndpoint) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('[AuthInterceptor] Added Authorization header to request:', {
      header: `Bearer ${token.substring(0, 20)}...`,
      fullUrl: req.url
    });
    return next(clonedReq);
  }

  // If no token or it's an auth endpoint, proceed with the original request
  if (!token && !isAuthEndpoint) {
    console.warn('[AuthInterceptor] No token available for protected endpoint:', req.url);
    console.warn('[AuthInterceptor] This will likely result in a 401 Unauthorized error');
  }
  
  return next(req);
};

