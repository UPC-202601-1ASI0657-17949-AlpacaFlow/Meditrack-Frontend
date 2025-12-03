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
        
        // Validate all numeric values are within safe integer range
        if (createResource.deviceId > Number.MAX_SAFE_INTEGER || createResource.deviceId < Number.MIN_SAFE_INTEGER) {
            console.error('[SeniorCitizensApiEndpoint] deviceId out of safe integer range:', createResource.deviceId);
            throw new Error(`Device ID ${createResource.deviceId} is out of safe integer range`);
        }
        
        if (createResource.organizationId > Number.MAX_SAFE_INTEGER || createResource.organizationId < Number.MIN_SAFE_INTEGER) {
            console.error('[SeniorCitizensApiEndpoint] organizationId out of safe integer range:', createResource.organizationId);
            throw new Error(`Organization ID ${createResource.organizationId} is out of safe integer range`);
        }
        
        console.log('[SeniorCitizensApiEndpoint] Creating senior citizen with resource:', createResource);
        console.log('[SeniorCitizensApiEndpoint] Resource types:', {
            organizationId: typeof createResource.organizationId,
            deviceId: typeof createResource.deviceId,
            birthDate: typeof createResource.birthDate,
            weight: typeof createResource.weight,
            height: typeof createResource.height
        });
        console.log('[SeniorCitizensApiEndpoint] Full resource JSON:', JSON.stringify(createResource, null, 2));
        console.log('[SeniorCitizensApiEndpoint] Full resource JSON (no formatting):', JSON.stringify(createResource));
        
        // Final validation: ensure birthDate is a string and all numbers are safe
        if (typeof createResource.birthDate !== 'string') {
            console.error('[SeniorCitizensApiEndpoint] CRITICAL ERROR: birthDate is not a string!', {
                type: typeof createResource.birthDate,
                value: createResource.birthDate,
                stringified: JSON.stringify(createResource.birthDate)
            });
            throw new Error(`BirthDate must be a string, got ${typeof createResource.birthDate}: ${createResource.birthDate}`);
        }
        
        // Ensure deviceId is a safe integer (not in scientific notation)
        if (!Number.isSafeInteger(createResource.deviceId)) {
            console.error('[SeniorCitizensApiEndpoint] CRITICAL ERROR: deviceId is not a safe integer!', {
                value: createResource.deviceId,
                type: typeof createResource.deviceId,
                isSafeInteger: Number.isSafeInteger(createResource.deviceId)
            });
            throw new Error(`Device ID must be a safe integer, got: ${createResource.deviceId}`);
        }
        
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
