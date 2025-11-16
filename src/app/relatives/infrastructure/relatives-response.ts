import {BaseResource} from "../../shared/infrastructure/base-response";
import {SeniorCitizen} from "../domain/model/seniorCitizen.entity";

export interface SeniorCitizenResource {
    id: number;
    firstName: string;
    lastName: string;
    dni: string;
    gender: string;
    height: number;
    birthDate: string; // ISO date string
    weight: number;
    profileImage: string;
    deviceId: string;
}

export interface RelativeResource extends BaseResource {
    id: number;
    planType: string; // 'FREEMIUM' | 'PREMIUM' from backend PlanType enum
    firstName: string;
    lastName: string;
    phoneNumber: string;
    seniorCitizen?: SeniorCitizenResource | null;
    // Legacy fields (not in backend, but may be needed for frontend compatibility)
    email?: string;
    password?: string;
    role?: string;
    creditCard?: string | null;
    expirationDate?: string | null;
    securityCode?: string | null;
}

export interface RelativeResponse extends Array<RelativeResource> {}