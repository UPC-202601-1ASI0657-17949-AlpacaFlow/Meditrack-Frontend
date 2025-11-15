import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Organization } from '../domain/model/organization.entity';
import { OrganizationResource, OrganizationsResponse } from './organization-response';

/**
 * Assembler for converting between Organization entities, OrganizationResource resources, and OrganizationsResponse.
 */
export class OrganizationsAssembler implements
    BaseAssembler<Organization, OrganizationResource, OrganizationsResponse> {

  /**
   * Converts an OrganizationsResponse to an array of Organization entities.
   * @param response - The API response containing organizations.
   * @returns An array of Organization entities.
   */
  toEntitiesFromResponse(response: OrganizationsResponse): Organization[] {
    return response.organizations.map(resource =>
        this.toEntityFromResource(resource as OrganizationResource));
  }

  /**
   * Converts an OrganizationResource to an Organization entity.
   * @param resource - The resource to convert.
   * @returns The converted Organization entity.
   */
  toEntityFromResource(resource: OrganizationResource): Organization {
    return new Organization({
      id: resource.id,
      name: resource.name,
      type: resource.type // Both backend and frontend use 'clinic'
    });
  }

  /**
   * Converts an Organization entity to an OrganizationResource.
   * @param entity - The entity to convert.
   * @returns The converted OrganizationResource.
   */
  toResourceFromEntity(entity: Organization): OrganizationResource {
    return {
      id: entity.id,
      name: entity.name,
      type: entity.type // Both backend and frontend use 'clinic'
    } as OrganizationResource;
  }
}

