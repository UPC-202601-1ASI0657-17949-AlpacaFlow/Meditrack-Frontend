import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { SeniorCitizen } from '../domain/model/senior-citizen.entity';
import { SeniorCitizenResource, SeniorCitizensResponse } from './senior-citizen-response';

/**
 * Assembler for converting between SeniorCitizen entities, SeniorCitizenResource resources, and SeniorCitizensResponse.
 */
export class SeniorCitizensAssembler implements BaseAssembler<SeniorCitizen, SeniorCitizenResource, SeniorCitizensResponse> {
    /**
     * Converts a SeniorCitizensResponse to an array of SeniorCitizen entities.
     * @param response - The API response containing senior citizens.
     * @returns An array of SeniorCitizen entities.
     */
    toEntitiesFromResponse(response: SeniorCitizensResponse): SeniorCitizen[] {
        return response.seniorCitizens.map((resource) =>
            this.toEntityFromResource(resource as SeniorCitizenResource)
        );
    }

    /**
     * Converts a SeniorCitizenResource (backend JSON - camelCase) to a SeniorCitizen entity (domain - camelCase).
     * Maps backend JSON property names to domain entity property names.
     * @param resource - The resource to convert (from backend API, uses camelCase).
     * @returns The converted SeniorCitizen entity (domain model, uses camelCase).
     */
    toEntityFromResource(resource: SeniorCitizenResource): SeniorCitizen {
        return new SeniorCitizen({
            id: resource.id,
            organizationId: resource.organizationId,
            firstName: resource.firstName,
            lastName: resource.lastName,
            birthDate: typeof resource.birthDate === 'string' ? new Date(resource.birthDate) : resource.birthDate, // Convert string to Date if needed
            age: resource.age,
            gender: resource.gender,
            weight: resource.weight,
            dni: resource.dni,
            height: resource.height,
            imageUrl: resource.imageUrl,
            deviceId: typeof resource.deviceId === 'string' ? Number(resource.deviceId) : resource.deviceId,
            assignedDoctorId: resource.assignedDoctorId ?? null, // From Doctor_assignments table (single doctor only)
            assignedCaregiverId: resource.assignedCaregiverId ?? null, // From Caregiver_assignments table (single caregiver only)
            signalVitals: resource.signalVitals,
            alerts: resource.alerts
        });
    }

    /**
     * Converts a SeniorCitizen entity (domain - camelCase) to a SeniorCitizenResource (backend JSON - camelCase).
     * Maps domain entity property names to backend JSON property names.
     * @param entity - The entity to convert (domain model, uses camelCase).
     * @returns The converted SeniorCitizenResource (for backend API, uses camelCase).
     */
    toResourceFromEntity(entity: SeniorCitizen): SeniorCitizenResource {
        return {
            id: entity.id,
            organizationId: entity.organizationId,
            firstName: entity.firstName,
            lastName: entity.lastName,
            birthDate: entity.birthDate instanceof Date ? entity.birthDate.toISOString().split('T')[0] : entity.birthDate,
            age: entity.age,
            gender: entity.gender,
            weight: entity.weight,
            dni: entity.dni,
            height: entity.height,
            imageUrl: entity.imageUrl,
            deviceId: entity.deviceId,
            assignedDoctorId: entity.assignedDoctorId ?? null,
            assignedCaregiverId: entity.assignedCaregiverId ?? null,
            signalVitals: entity.signalVitals ? {
                bloodPressure: entity.signalVitals.bloodPressure,
                heartRate: entity.signalVitals.heartRate,
                temperature: entity.signalVitals.temperature,
                oxygenLevel: entity.signalVitals.oxygenLevel
            } : undefined,
            alerts: entity.alerts ? entity.alerts.map(alert => ({
                id: alert.id,
                alertTitle: alert.alertTitle,
                date: alert.date,
                time: alert.time,
                dataRegistered: alert.dataRegistered,
                reason: alert.reason
            })) : undefined
        } as SeniorCitizenResource;
    }

    /**
     * Converts a SeniorCitizen entity to a CreateSeniorCitizenResource (for POST requests).
     * Only includes the fields required for creation (excludes id, age, assignedDoctorId, etc.).
     * @param entity - The entity to convert
     * @returns The resource for creating a senior citizen
     */
    toCreateResourceFromEntity(entity: SeniorCitizen): {
        organizationId: number;
        firstName: string;
        lastName: string;
        birthDate: string; // ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
        gender: string;
        weight: number;
        dni: string;
        height: number;
        imageUrl: string;
        deviceId: number;
    } {
        // Convert birthDate to ISO 8601 format (Spring Boot can deserialize this to Java Date)
        let birthDateStr: string;
        if (entity.birthDate instanceof Date) {
            // Use ISO 8601 format with time component for proper deserialization
            birthDateStr = entity.birthDate.toISOString();
        } else if (typeof entity.birthDate === 'string') {
            // If it's already a string, try to parse it and convert to ISO
            const date = new Date(entity.birthDate);
            birthDateStr = date.toISOString();
        } else {
            throw new Error('Invalid birthDate format');
        }

        return {
            organizationId: entity.organizationId,
            firstName: entity.firstName,
            lastName: entity.lastName,
            birthDate: birthDateStr,
            gender: entity.gender,
            weight: entity.weight,
            dni: entity.dni,
            height: entity.height,
            imageUrl: entity.imageUrl,
            deviceId: entity.deviceId
        };
    }
}

