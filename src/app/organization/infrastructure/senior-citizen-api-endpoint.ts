import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-enpoint';
import { SeniorCitizen } from '../domain/model/senior-citizen.entity';
import { SeniorCitizenResource, SeniorCitizensResponse } from './senior-citizen-response';
import { SeniorCitizensAssembler } from './senior-citizen-assembler';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map, catchError } from 'rxjs';

/**
 * API endpoint for managing senior citizens.
 */
export class SeniorCitizensApiEndpoint extends BaseApiEndpoint<
    SeniorCitizen,
    SeniorCitizenResource,
    SeniorCitizensResponse,
    SeniorCitizensAssembler
> {

    constructor(
        http: HttpClient,
    ) {
        super(
            http,
            `${environment.platformProviderApiBaseUrl}${environment.platformProviderSeniorCitizensEndpointPath}`,
            new SeniorCitizensAssembler()
        );
    }

    /**
     * Gets senior citizens by organizationId
     * Uses query parameter for json-server: ?organizationId={organizationId}
     */
    getByOrganizationId(organizationId: number) {
        const url = `${this.endpointUrl}?organizationId=${organizationId}`;
        console.log(`[API] Requesting senior citizens from: ${url} (organizationId=${organizationId})`);
        return this.http.get<SeniorCitizenResource[]>(url)
            .pipe(
                map(response => {
                    console.log(`[API] Raw response from server:`, response);
                    // Backend returns array directly
                    const entities = response.map(resource => this.assembler.toEntityFromResource(resource));
                    console.log(`[API] Transformed entities:`, entities);
                    return entities;
                })
            );
    }

    /**
     * Gets senior citizens by doctorId
     * Note: This endpoint needs to be implemented in the backend if not already available
     * For now, using query parameter as fallback
     */
    getByDoctorId(doctorId: number) {
        const url = `${this.endpointUrl}?doctor_id=${doctorId}`;
        console.log(`[API] Requesting senior citizens from: ${url} (doctorId=${doctorId})`);
        return this.http.get<SeniorCitizenResource[]>(url)
            .pipe(
                map(response => {
                    console.log(`[API] Raw response from server:`, response);
                    const entities = response.map(resource => this.assembler.toEntityFromResource(resource));
                    console.log(`[API] Transformed entities:`, entities);
                    return entities;
                })
            );
    }

    /**
     * Gets senior citizens by caregiverId
     * Note: This endpoint needs to be implemented in the backend if not already available
     * For now, using query parameter as fallback
     */
    getByCaregiverId(caregiverId: number) {
        const url = `${this.endpointUrl}?caregiver_id=${caregiverId}`;
        console.log(`[API] Requesting senior citizens from: ${url} (caregiverId=${caregiverId})`);
        return this.http.get<SeniorCitizenResource[]>(url)
            .pipe(
                map(response => {
                    console.log(`[API] Raw response from server:`, response);
                    const entities = response.map(resource => this.assembler.toEntityFromResource(resource));
                    console.log(`[API] Transformed entities:`, entities);
                    return entities;
                })
            );
    }

    /**
     * Creates a new senior citizen via the API.
     * Overrides the base create method to use the correct resource format for creation.
     * @param seniorCitizen - The SeniorCitizen entity to create.
     * @returns An Observable emitting the created SeniorCitizen entity.
     */
    override create(seniorCitizen: SeniorCitizen) {
        // Use the create-specific resource format (only required fields, proper date format)
        const createResource = this.assembler.toCreateResourceFromEntity(seniorCitizen);
        console.log('[SeniorCitizensApiEndpoint] Creating senior citizen with resource:', createResource);
        console.log('[SeniorCitizensApiEndpoint] Full resource JSON:', JSON.stringify(createResource, null, 2));
        return this.http.post<SeniorCitizenResource>(this.endpointUrl, createResource).pipe(
            map(created => {
                console.log('[SeniorCitizensApiEndpoint] Created senior citizen response:', created);
                return this.assembler.toEntityFromResource(created);
            }),
            catchError((error) => {
                console.error('[SeniorCitizensApiEndpoint] Error creating senior citizen:', error);
                console.error('[SeniorCitizensApiEndpoint] Error status:', error.status);
                console.error('[SeniorCitizensApiEndpoint] Error message:', error.message);
                console.error('[SeniorCitizensApiEndpoint] Error body:', error.error);
                console.error('[SeniorCitizensApiEndpoint] Request that failed:', {
                    url: this.endpointUrl,
                    method: 'POST',
                    body: createResource
                });
                return this.handleError('Failed to create senior citizen')(error);
            })
        );
    }
}
