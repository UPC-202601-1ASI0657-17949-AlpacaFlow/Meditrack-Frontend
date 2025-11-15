import { Injectable } from '@angular/core';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-enpoint';
import { User } from '../domain/model/user.entity';
import { UserResource, UsersResponse } from './user-response';
import { UserAssembler } from './user-assembler';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map, switchMap, of, throwError } from 'rxjs';

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
     * Busca el usuario por email y valida la contraseña contra las credenciales
     */
    login(email: string, password: string) {
        console.log('[UserApiEndpoint] Login attempt:', { email, passwordLength: password?.length });
        
        // Paso 1: Buscar el usuario por email
        const url = `${this.endpointUrl}?email=${email}`;
        console.log('[UserApiEndpoint] Searching user by email:', url);
        
        return this.http.get<UserResource[]>(url).pipe(
            switchMap((users) => {
                console.log('[UserApiEndpoint] Users found:', users);
                
                // Verificar que se encontró un usuario
                if (!users || users.length === 0) {
                    console.error('[UserApiEndpoint] No user found with email:', email);
                    return throwError(() => new Error('Invalid email or password'));
                }

                const userResource = users[0];
                const userId = userResource.id;
                console.log('[UserApiEndpoint] User found:', { id: userId, email: userResource.email, role: userResource.role });

                // Paso 2: Buscar las credenciales del usuario
                const credentialsUrl = `${environment.platformProviderApiBaseUrl}${environment.platformProviderCredentialsEndpointPath}?userId=${userId}`;
                console.log('[UserApiEndpoint] Searching credentials:', credentialsUrl);
                
                return this.http.get<{ userId: number; password: string; id: number }[]>(
                    credentialsUrl
                ).pipe(
                    switchMap((credentialsList) => {
                        console.log('[UserApiEndpoint] Credentials found:', credentialsList);
                        
                        // Verificar que se encontraron credenciales
                        if (!credentialsList || credentialsList.length === 0) {
                            console.error('[UserApiEndpoint] No credentials found for userId:', userId);
                            return throwError(() => new Error('Invalid email or password'));
                        }

                        const credentials = credentialsList[0];
                        console.log('[UserApiEndpoint] Validating password:', { 
                            provided: password, 
                            stored: credentials.password,
                            match: credentials.password === password 
                        });

                        // Paso 3: Validar la contraseña
                        if (credentials.password !== password) {
                            console.error('[UserApiEndpoint] Password mismatch');
                            return throwError(() => new Error('Invalid email or password'));
                        }

                        // Paso 4: Si la contraseña es correcta, devolver el usuario y un token mock
                        console.log('[UserApiEndpoint] Login successful for user:', userId);
                        return of({
                            token: 'mock_token_for_flow',
                            user: this.assembler.toEntityFromResource(userResource)
                        });
                    })
                );
            })
        );
    }

    /**
     * Register - registra un nuevo usuario usando el endpoint estándar de json-server
     */
    register(user: User, password: string) {
        const userData = this.assembler.toResourceFromEntity(user);
        
        // Crear usuario en /users (endpoint estándar de json-server)
        return this.http.post<UserResource>(
            `${environment.platformProviderApiBaseUrl}${environment.platformProviderUsersEndpointPath}`,
            userData
        ).pipe(
            switchMap((createdUser: UserResource) => {
                // Crear credenciales en /credentials
                const credentialsData = {
                    userId: createdUser.id,
                    password: password
                };
                
                // Crear credenciales y luego devolver la respuesta
                return this.http.post(
                    `${environment.platformProviderApiBaseUrl}${environment.platformProviderCredentialsEndpointPath}`,
                    credentialsData
                ).pipe(
                    map(() => ({
                        token: 'mock_token_for_flow',
                        user: this.assembler.toEntityFromResource(createdUser)
                    }))
                );
            })
        );
    }
}

