import { Injectable } from '@angular/core';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-enpoint';
import { User } from '../domain/model/user.entity';
import { UserResource, UsersResponse } from './user-response';
import { UserAssembler } from './user-assembler';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map, switchMap, of, throwError, catchError, Observable } from 'rxjs';

/**
 * API endpoint for managing users.
 */
@Injectable({
    providedIn: 'root'
})
export class UserApiEndpoint extends
    BaseApiEndpoint<User, UserResource, UsersResponse, UserAssembler> {
    constructor(http: HttpClient) {
        super(
            http,
            `${environment.platformProviderApiBaseUrl}${environment.platformProviderUsersEndpointPath}`,
            new UserAssembler()
        );
    }

    /**
     * Obtiene usuario por email
     */
    getByEmail(email: string) {
        return this.http.get<UserResource[]>(`${this.endpointUrl}?email=${email}`)
            .pipe(
                map(resources => {
                    const resource = resources && resources.length > 0 ? resources[0] : null;
                    return resource ? this.assembler.toEntityFromResource(resource) : null;
                })
            );
    }

    /**
     * Login - autentica un usuario con email y password
     * Usa el endpoint de autenticación del backend Spring Boot o mock para json-server
     */
    login(email: string, password: string) {
        console.log('[UserApiEndpoint] Login attempt:', { email, passwordLength: password?.length });
        
        // Detectar si estamos usando json-server (puerto 3000) o backend Spring Boot (puerto 8080)
        const isJsonServer = environment.platformProviderApiBaseUrl.includes('localhost:3000');
        
        if (isJsonServer) {
            // Mock login para json-server: buscar usuario por email y validar password
            console.log('[UserApiEndpoint] Using json-server mock authentication');
            return this.http.get<UserResource[]>(`${this.endpointUrl}?email=${email}`).pipe(
                switchMap(users => {
                    if (!users || users.length === 0) {
                        return throwError(() => new Error('Invalid email or password'));
                    }
                    
                    const user = users[0];
                    // En json-server, validar password desde credentials
                    return this.http.get<any[]>(`${environment.platformProviderApiBaseUrl}${environment.platformProviderCredentialsEndpointPath}?userId=${user.id}`).pipe(
                        switchMap(credentials => {
                            if (!credentials || credentials.length === 0 || credentials[0].password !== password) {
                                return throwError(() => new Error('Invalid email or password'));
                            }
                            
                            // Generar token mock
                            const mockToken = `mock-token-${user.id}-${Date.now()}`;
                            
                            return of({
                                token: mockToken,
                                user: this.assembler.toEntityFromResource(user)
                            });
                        })
                    );
                })
            );
        } else {
            // Backend Spring Boot: usar endpoint de autenticación real
            const authUrl = `${environment.platformProviderApiBaseUrl}/api/v1/authentication/sign-in`;
            console.log('[UserApiEndpoint] Using Spring Boot authentication endpoint:', authUrl);
            
            return this.http.post<{ id: number; email: string; role: string; token: string }>(
                authUrl,
                { email, password }
            ).pipe(
                map((response) => {
                    console.log('[UserApiEndpoint] Login successful:', response);
                    
                    // Convertir la respuesta al formato esperado
                    const userResource: UserResource = {
                        id: response.id,
                        email: response.email,
                        role: response.role ?? null
                    };
                    
                    return {
                        token: response.token,
                        user: this.assembler.toEntityFromResource(userResource)
                    };
                }),
                switchMap((result) => {
                    // Si hay error, propagarlo
                    if (!result.token) {
                        return throwError(() => new Error('Invalid email or password'));
                    }
                    return of(result);
                }),
                catchError((error) => {
                    // Manejar errores HTTP y convertirlos en mensajes amigables
                    console.error('[UserApiEndpoint] Login error:', error);
                    
                    // Si es un error HTTP 401, 404, o 400, es un error de credenciales
                    if (error.status === 401 || error.status === 404 || error.status === 400) {
                        return throwError(() => new Error('Invalid email or password'));
                    }
                    
                    // Para otros errores, extraer el mensaje del backend si está disponible
                    const backendMessage = error.error?.message || error.error?.error || error.message;
                    if (typeof backendMessage === 'string' && backendMessage.toLowerCase().includes('user not found')) {
                        return throwError(() => new Error('Invalid email or password'));
                    }
                    if (typeof backendMessage === 'string' && backendMessage.toLowerCase().includes('invalid password')) {
                        return throwError(() => new Error('Invalid email or password'));
                    }
                    
                    // Si no hay un mensaje específico, usar el mensaje genérico
                    return throwError(() => new Error('Invalid email or password'));
                })
            );
        }
    }

    /**
     * Register - registra un nuevo usuario
     * Usa el endpoint de autenticación del backend Spring Boot o mock para json-server
     * @param user - User entity with email and role
     * @param password - User password
     * @param additionalData - Optional data for admin registration (firstName, lastName, organizationName, organizationType)
     */
    register(user: User, password: string, additionalData?: { 
        firstName?: string; 
        lastName?: string; 
        organizationName?: string; 
        organizationType?: string;
    }) {
        console.log('[UserApiEndpoint] Register attempt:', { email: user.email, role: user.role, hasAdditionalData: !!additionalData });
        
        // Detectar si estamos usando json-server (puerto 3000) o backend Spring Boot (puerto 8080)
        const isJsonServer = environment.platformProviderApiBaseUrl.includes('localhost:3000');
        
        if (isJsonServer) {
            // Mock register para json-server: crear usuario y credentials
            console.log('[UserApiEndpoint] Using json-server mock registration');
            
            // Verificar si el usuario ya existe
            return this.http.get<UserResource[]>(`${this.endpointUrl}?email=${user.email}`).pipe(
                switchMap(existingUsers => {
                    if (existingUsers && existingUsers.length > 0) {
                        return throwError(() => new Error('Email already exists'));
                    }
                    
                    // Crear usuario
                    const userResource: UserResource = {
                        id: 0, // json-server generará el ID
                        email: user.email,
                        role: user.role ?? null
                    };
                    
                    return this.http.post<UserResource>(this.endpointUrl, userResource).pipe(
                        switchMap(createdUser => {
                            // Crear credentials
                            const credentials = {
                                userId: createdUser.id,
                                password: password
                            };
                            
                            return this.http.post<any>(`${environment.platformProviderApiBaseUrl}${environment.platformProviderCredentialsEndpointPath}`, credentials).pipe(
                                map(() => {
                                    // Generar token mock
                                    const mockToken = `mock-token-${createdUser.id}-${Date.now()}`;
                                    
                                    return {
                                        token: mockToken,
                                        user: this.assembler.toEntityFromResource(createdUser)
                                    };
                                })
                            );
                        })
                    );
                })
            );
        } else {
            // Backend Spring Boot: usar endpoint de autenticación real
            const authUrl = `${environment.platformProviderApiBaseUrl}/api/v1/authentication/sign-up`;
            console.log('[UserApiEndpoint] Using Spring Boot authentication endpoint:', authUrl);
            
            // Build request payload
            const payload: any = { 
                email: user.email, 
                password: password,
                role: user.role 
            };
            
            // Add additional data if provided (for admin registration)
            if (additionalData) {
                if (additionalData.firstName) payload.firstName = additionalData.firstName;
                if (additionalData.lastName) payload.lastName = additionalData.lastName;
                if (additionalData.organizationName) payload.organizationName = additionalData.organizationName;
                if (additionalData.organizationType) payload.organizationType = additionalData.organizationType;
            }
            
            console.log('[UserApiEndpoint] Request payload:', payload);
            
            return this.http.post<{ id: number; email: string; role: string; token: string }>(
                authUrl,
                payload
            ).pipe(
                map((response) => {
                    console.log('[UserApiEndpoint] User created and authenticated:', response);
                    
                    // Convertir la respuesta al formato esperado
                    const userResource: UserResource = {
                        id: response.id,
                        email: response.email,
                        role: response.role ?? null
                    };
                    
                    return {
                        token: response.token,
                        user: this.assembler.toEntityFromResource(userResource)
                    };
                }),
                switchMap((result) => {
                    // Si hay error, propagarlo
                    if (!result.token) {
                        return throwError(() => new Error('Registration failed'));
                    }
                    return of(result);
                })
            );
        }
    }

    /**
     * Returns true if the organization name is not yet registered (Spring backend only; json-server assumes available).
     */
    isOrganizationNameAvailable(name: string): Observable<boolean> {
        const isJsonServer = environment.platformProviderApiBaseUrl.includes('localhost:3000');
        if (isJsonServer) {
            return of(true);
        }
        const url = `${environment.platformProviderApiBaseUrl}/api/v1/organizations/availability`;
        return this.http.get<{ available: boolean }>(url, { params: { name: name ?? '' } }).pipe(
            map((r) => r.available)
        );
    }
}

