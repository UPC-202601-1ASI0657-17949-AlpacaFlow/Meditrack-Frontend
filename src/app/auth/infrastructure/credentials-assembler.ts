import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Credentials } from '../domain/model/credentials.entity';
import { CredentialsResource, CredentialsResponse } from './credentials-response';

/**
 * Assembler for converting between Credentials entities, CredentialsResource resources, and CredentialsResponse.
 */
export class CredentialsAssembler implements
    BaseAssembler<Credentials, CredentialsResource, CredentialsResponse> {

    /**
     * Converts a CredentialsResponse to an array of Credentials entities.
     * @param response - The API response containing credentials.
     * @returns An array of Credentials entities.
     */
    toEntitiesFromResponse(response: CredentialsResponse): Credentials[] {
        return response.credentials.map(resource =>
            this.toEntityFromResource(resource as CredentialsResource));
    }

    /**
     * Converts a CredentialsResource to a Credentials entity.
     * @param resource - The resource to convert.
     * @returns The converted Credentials entity.
     */
    toEntityFromResource(resource: CredentialsResource): Credentials {
        return new Credentials({
            id: resource.id,
            password: resource.password,
            userId: resource.userId
        });
    }

    /**
     * Converts a Credentials entity to a CredentialsResource.
     * @param entity - The entity to convert.
     * @returns The converted CredentialsResource.
     */
    toResourceFromEntity(entity: Credentials): CredentialsResource {
        return {
            id: entity.id,
            password: entity.password,
            userId: entity.userId
        } as CredentialsResource;
    }
}

