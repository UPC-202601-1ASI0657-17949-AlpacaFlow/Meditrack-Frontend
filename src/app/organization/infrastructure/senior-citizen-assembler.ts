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
        // Get birthDate from entity (it's a Date object from the getter)
        const birthDateValue = entity.birthDate;
        
        // Convert birthDate to ISO 8601 format (Spring Boot can deserialize this to Java Date)
        let birthDateStr: string;
        if (birthDateValue instanceof Date) {
            // Validate the date is valid
            if (isNaN(birthDateValue.getTime())) {
                throw new Error(`Invalid Date object: ${birthDateValue}`);
            }
            // Use ISO 8601 format with time component for proper deserialization
            birthDateStr = birthDateValue.toISOString();
        } else if (typeof birthDateValue === 'string') {
            // If it's already a string in YYYY-MM-DD format, use it directly or convert to ISO
            // Check if it's already in YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(birthDateValue)) {
                // It's already in YYYY-MM-DD format, add time component for ISO 8601
                birthDateStr = `${birthDateValue}T00:00:00.000Z`;
            } else {
                // Try to parse it and convert to ISO
                const date = new Date(birthDateValue);
                if (isNaN(date.getTime())) {
                    throw new Error(`Invalid birthDate string format: ${birthDateValue}`);
                }
                birthDateStr = date.toISOString();
            }
        } else if (typeof birthDateValue === 'number') {
            // If it's a number (timestamp), validate it's within reasonable range
            if (birthDateValue > 1e15 || birthDateValue < -1e15) {
                throw new Error(`BirthDate timestamp out of reasonable range: ${birthDateValue}`);
            }
            const date = new Date(birthDateValue);
            if (isNaN(date.getTime())) {
                throw new Error(`Invalid birthDate timestamp: ${birthDateValue}`);
            }
            birthDateStr = date.toISOString();
        } else {
            throw new Error(`Invalid birthDate format: ${typeof birthDateValue}, value: ${birthDateValue}`);
        }

        // Ensure all numeric values are safe integers (not in scientific notation)
        const organizationId = Math.floor(Number(entity.organizationId));
        const deviceId = Math.floor(Number(entity.deviceId));
        const weight = Number(entity.weight);
        const height = Number(entity.height);

        // Validate numeric values are within safe ranges
        if (deviceId > Number.MAX_SAFE_INTEGER || deviceId < 0) {
            throw new Error(`Device ID ${deviceId} is out of safe range (0 to ${Number.MAX_SAFE_INTEGER})`);
        }

        if (organizationId > Number.MAX_SAFE_INTEGER || organizationId < Number.MIN_SAFE_INTEGER) {
            throw new Error(`Organization ID ${organizationId} is out of safe integer range`);
        }

        const resource = {
            organizationId: organizationId,
            firstName: String(entity.firstName),
            lastName: String(entity.lastName),
            birthDate: String(birthDateStr), // Ensure it's a string
            gender: String(entity.gender),
            weight: weight,
            dni: String(entity.dni),
            height: height,
            imageUrl: String(entity.imageUrl),
            deviceId: deviceId
        };

        // Final validation: ensure birthDate is a string, not a number
        if (typeof resource.birthDate !== 'string') {
            console.error('[SeniorCitizensAssembler] ERROR: birthDate is not a string!', {
                type: typeof resource.birthDate,
                value: resource.birthDate
            });
            throw new Error(`BirthDate must be a string, got ${typeof resource.birthDate}`);
        }

        return resource;
    }
}

