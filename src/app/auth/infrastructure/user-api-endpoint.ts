import { Injectable } from '@angular/core';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-enpoint';
import { User } from '../domain/model/user.entity';
import { UserResource, UsersResponse } from './user-response';
import { UserAssembler } from './user-assembler';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map, switchMap } from 'rxjs';

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
     */
    login(email: string, password: string) {
        return this.http.post<{ token: string; user: UserResource }>(
            `${environment.platformProviderApiBaseUrl}${environment.platformProviderAuthEndpointPath}/login`,
            { email, password }
        ).pipe(
            map(response => ({
                token: response.token,
                user: this.assembler.toEntityFromResource(response.user)
            }))
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

