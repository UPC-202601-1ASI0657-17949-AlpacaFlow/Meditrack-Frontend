import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Doctor } from '../domain/model/doctor.entity';
import { DoctorResource, DoctorsResponse } from './doctor-response';

/**
 * Assembler for converting between Doctor entities, DoctorResource resources, and DoctorsResponse.
 */
export class DoctorsAssembler implements
    BaseAssembler<Doctor, DoctorResource, DoctorsResponse> {

  /**
   * Converts a DoctorsResponse to an array of Doctor entities.
   * @param response - The API response containing doctors.
   * @returns An array of Doctor entities.
   */
  toEntitiesFromResponse(response: DoctorsResponse): Doctor[] {
    return response.doctors.map(resource =>
        this.toEntityFromResource(resource as DoctorResource));
  }

  /**
   * Converts a DoctorResource (backend JSON - camelCase) to a Doctor entity (domain - camelCase).
   * Maps backend JSON property names to domain entity property names.
   * @param resource - The resource to convert (from backend API, uses camelCase).
   * @returns The converted Doctor entity (domain model, uses camelCase).
   */
  toEntityFromResource(resource: DoctorResource): Doctor {
    // Convert userId from number | null | undefined to number | null (handle potential string from old API)
    let userId: number | null | undefined = resource.userId;
    if (typeof resource.userId === 'string') {
      userId = resource.userId ? parseInt(resource.userId, 10) : null;
    }
    
    return new Doctor({
      id: resource.id,
      organizationId: resource.organizationId,
      userId: userId ?? null, // Optional, convert undefined to null
      firstName: resource.firstName,
      lastName: resource.lastName,
      age: resource.age, // Optional
      email: resource.email, // Optional
      specialty: resource.specialty,
      phoneNumber: resource.phoneNumber ?? '',
      imageUrl: resource.imageUrl ?? '',
      assignedSeniorIds: resource.assignedSeniorIds ?? [] // From Doctor_assignments table
    });
  }

  /**
   * Converts a Doctor entity (domain - camelCase) to a DoctorResource (backend JSON - camelCase).
   * Maps domain entity property names to backend JSON property names.
   * @param entity - The entity to convert (domain model, uses camelCase).
   * @returns The converted DoctorResource (for backend API, uses camelCase).
   */
  toResourceFromEntity(entity: Doctor): DoctorResource {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      userId: entity.userId || undefined, // Optional
      firstName: entity.firstName,
      lastName: entity.lastName,
      specialty: entity.specialty,
      phoneNumber: entity.phoneNumber,
      age: entity.age, // Optional
      email: entity.email, // Optional
      imageUrl: entity.imageUrl, // Optional
      assignedSeniorIds: entity.assignedSeniorIds // For Doctor_assignments table
    } as DoctorResource;
  }
}
