import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Admin } from '../domain/model/admin.entity';
import { AdminResource, AdminsResponse } from './admin-response';

/**
 * Assembler for converting between Admin entities, AdminResource resources, and AdminsResponse.
 */
export class AdminsAssembler implements
    BaseAssembler<Admin, AdminResource, AdminsResponse> {

  /**
   * Converts an AdminsResponse to an array of Admin entities.
   * @param response - The API response containing admins.
   * @returns An array of Admin entities.
   */
  toEntitiesFromResponse(response: AdminsResponse): Admin[] {
    return response.admins.map(resource =>
        this.toEntityFromResource(resource as AdminResource));
  }

  /**
   * Converts an AdminResource (backend JSON - camelCase) to an Admin entity (domain - camelCase).
   * Maps backend JSON property names to domain entity property names.
   * @param resource - The resource to convert (from backend API, uses camelCase).
   * @returns The converted Admin entity (domain model, uses camelCase).
   */
  toEntityFromResource(resource: AdminResource): Admin {
    // Convert userId from number | null to number | null (no conversion needed, but handle potential string from old API)
    const userId = typeof resource.userId === 'string' 
      ? (resource.userId ? parseInt(resource.userId, 10) : null)
      : resource.userId;
    
    return new Admin({
      id: resource.id,
      organizationId: resource.organizationId,
      userId: userId,
      firstName: resource.firstName,
      lastName: resource.lastName
    });
  }

  /**
   * Converts an Admin entity (domain - camelCase) to an AdminResource (backend JSON - camelCase).
   * Maps domain entity property names to backend JSON property names.
   * @param entity - The entity to convert (domain model, uses camelCase).
   * @returns The converted AdminResource (for backend API, uses camelCase).
   */
  toResourceFromEntity(entity: Admin): AdminResource {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      userId: entity.userId,
      firstName: entity.firstName,
      lastName: entity.lastName
    } as AdminResource;
  }
}

