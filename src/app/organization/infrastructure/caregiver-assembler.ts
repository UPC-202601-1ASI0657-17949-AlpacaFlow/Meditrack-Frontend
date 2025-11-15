import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Caregiver } from '../domain/model/caregiver.entity';
import { CaregiverResource, CaregiversResponse } from './caregiver-response';

/**
 * Assembler for converting between Caregiver entities, CaregiverResource resources, and CaregiversResponse.
 */
export class CaregiversAssembler implements
    BaseAssembler<Caregiver, CaregiverResource, CaregiversResponse> {

  /**
   * Converts a CaregiversResponse to an array of Caregiver entities.
   * @param response - The API response containing caregivers.
   * @returns An array of Caregiver entities.
   */
  toEntitiesFromResponse(response: CaregiversResponse): Caregiver[] {
    return response.caregivers.map(resource =>
        this.toEntityFromResource(resource as CaregiverResource));
  }

  /**
   * Converts a CaregiverResource (backend JSON - camelCase) to a Caregiver entity (domain - camelCase).
   * Maps backend JSON property names to domain entity property names.
   * @param resource - The resource to convert (from backend API, uses camelCase).
   * @returns The converted Caregiver entity (domain model, uses camelCase).
   */
  toEntityFromResource(resource: CaregiverResource): Caregiver {
    let userId: number | null | undefined = resource.userId;
    if (typeof resource.userId === 'string') {
      userId = resource.userId ? parseInt(resource.userId, 10) : null;
    }

    return new Caregiver({
      id: resource.id,
      organizationId: resource.organizationId,
      userId: userId ?? null, // Optional
      firstName: resource.firstName,
      lastName: resource.lastName,
      phoneNumber: resource.phoneNumber,
      age: resource.age, // Optional
      email: resource.email, // Optional
      imageUrl: resource.imageUrl ?? '', // Optional
      assignedSeniorIds: resource.assignedSeniorIds ?? [] // From Caregiver_assignments table
    });
  }

  /**
   * Converts a Caregiver entity (domain - camelCase) to a CaregiverResource (backend JSON - camelCase).
   * Maps domain entity property names to backend JSON property names.
   * @param entity - The entity to convert (domain model, uses camelCase).
   * @returns The converted CaregiverResource (for backend API, uses camelCase).
   */
  toResourceFromEntity(entity: Caregiver): CaregiverResource {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      userId: entity.userId || undefined, // Optional
      firstName: entity.firstName,
      lastName: entity.lastName,
      phoneNumber: entity.phoneNumber,
      age: entity.age, // Optional
      email: entity.email, // Optional
      imageUrl: entity.imageUrl, // Optional
      assignedSeniorIds: entity.assignedSeniorIds // For Caregiver_assignments table
    } as CaregiverResource;
  }
}

