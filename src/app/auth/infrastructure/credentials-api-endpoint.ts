import { Injectable } from '@angular/core';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-enpoint';
import { Credentials } from '../domain/model/credentials.entity';
import { CredentialsResource, CredentialsResponse } from './credentials-response';
import { CredentialsAssembler } from './credentials-assembler';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs';

/**
 * API endpoint for managing credentials.
 */
@Injectable({
    providedIn: 'root'
})
export class CredentialsApiEndpoint extends
    BaseApiEndpoint<Credentials, CredentialsResource, CredentialsResponse, CredentialsAssembler> {
    constructor(http: HttpClient) {
        super(
            http,
            `${environment.platformProviderApiBaseUrl}${environment.platformProviderCredentialsEndpointPath}`,
            new CredentialsAssembler()
        );
    }

    /**
     * Obtiene credenciales por userId
     */
    getByUserId(userId: number) {
        return this.http.get<CredentialsResource[]>(`${this.endpointUrl}?userId=${userId}`)
            .pipe(
                map(resources => {
                    const resource = resources && resources.length > 0 ? resources[0] : null;
                    return resource ? this.assembler.toEntityFromResource(resource) : null;
                })
            );
    }
}

