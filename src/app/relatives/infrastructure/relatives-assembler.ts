import { BaseAssembler } from "../../shared/infrastructure/base-assembler";
import { Relative } from "../domain/model/relative.entity";
import { RelativeResource, RelativeResponse, SeniorCitizenResource } from "./relatives-response";
import { RelativeFreemium } from "../domain/model/relativeFreemium.entity";
import { RelativePremium } from "../domain/model/relativePremium.entity";
import { SeniorCitizen } from "../domain/model/seniorCitizen.entity";

export class RelativesAssembler
    implements BaseAssembler<Relative, RelativeResource, RelativeResponse>
{
    toEntityFromResource(resource: RelativeResource): Relative {
        if (!resource) return null as any;
        
        // Normalize planType: backend returns 'FREEMIUM' or 'PREMIUM', frontend expects lowercase
        const normalizedPlanType = (resource.planType || '').toLowerCase();
        
        // Transform seniorCitizen from backend format to frontend format
        let seniorCitizen = null;
        if (resource.seniorCitizen) {
            const backendSc = resource.seniorCitizen as any;
            
            // Parse birthDate from backend (can be string or Date)
            let birthDate: Date | string | null = null;
            if (backendSc.birthDate) {
                birthDate = backendSc.birthDate instanceof Date 
                    ? backendSc.birthDate 
                    : new Date(backendSc.birthDate);
            }
            
            // Convert deviceId from string to number (backend sends it as string)
            const deviceId = backendSc.deviceId 
                ? (typeof backendSc.deviceId === 'string' 
                    ? parseInt(backendSc.deviceId, 10) 
                    : Number(backendSc.deviceId))
                : 0;
            
            seniorCitizen = new SeniorCitizen({
                firstName: backendSc.firstName || '',
                lastName: backendSc.lastName || '',
                birthDate: birthDate, // Pass birthDate, entity will calculate age automatically
                dni: backendSc.dni || '',
                gender: backendSc.gender || '',
                height: backendSc.height || 0,
                weight: backendSc.weight || 0,
                image: backendSc.profileImage || '',
                deviceId: deviceId,
                signalVitals: {},
                alerts: []
            });
        }
        
        // Create entity with backend data mapped to frontend structure
        const entityData = {
            id: resource.id,
            firstName: resource.firstName || '',
            lastName: resource.lastName || '',
            email: resource.email || '', // May not be in backend response
            password: resource.password || '', // May not be in backend response
            role: resource.role || 'relative', // May not be in backend response
            planType: normalizedPlanType || 'freemium',
            creditCard: resource.creditCard || null, // May not be in backend response
            expirationDate: resource.expirationDate || null, // May not be in backend response
            securityCode: resource.securityCode || null, // May not be in backend response
            seniorCitizenId: resource.seniorCitizenId ?? null,
            seniorCitizen: seniorCitizen
        };
        
        return normalizedPlanType === "premium"
            ? new RelativePremium(entityData)
            : new RelativeFreemium(entityData);
    }

    toResourceFromEntity(entity: Relative): RelativeResource {
        // Transform frontend entity to backend resource format
        return {
            id: entity.id,
            planType: (entity.planType || 'freemium').toUpperCase(), // Backend expects 'FREEMIUM' or 'PREMIUM'
            firstName: entity.firstName,
            lastName: entity.lastName,
            phoneNumber: '', // Backend expects phoneNumber, but frontend entity may not have it
            seniorCitizen: entity.seniorCitizen ? {
                id: 0, // Will be set by backend
                firstName: entity.seniorCitizen.firstName,
                lastName: entity.seniorCitizen.lastName,
                dni: entity.seniorCitizen.dni,
                gender: entity.seniorCitizen.gender,
                height: entity.seniorCitizen.height,
                birthDate: entity.seniorCitizen.birthDate instanceof Date 
                    ? entity.seniorCitizen.birthDate.toISOString().split('T')[0] // Format: YYYY-MM-DD
                    : (entity.seniorCitizen.birthDate ? String(entity.seniorCitizen.birthDate) : ''),
                weight: entity.seniorCitizen.weight,
                profileImage: entity.seniorCitizen.image,
                deviceId: entity.seniorCitizen.deviceId ? String(entity.seniorCitizen.deviceId) : ''
            } : null,
            // Legacy fields for frontend compatibility
            email: entity.email,
            password: entity.password,
            role: entity.role,
            creditCard: entity.creditCard,
            expirationDate: entity.expirationDate,
            securityCode: entity.securityCode
        };
    }

    toEntitiesFromResponse(response: RelativeResponse): Relative[] {
        return response.map((r) => this.toEntityFromResource(r));
    }
}
