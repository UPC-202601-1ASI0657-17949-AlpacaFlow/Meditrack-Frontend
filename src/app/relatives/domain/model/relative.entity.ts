import { BaseEntity } from "../../../shared/infrastructure/base-entity";
import {SeniorCitizen} from "./seniorCitizen.entity";

export class Relative implements BaseEntity {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: string;
    planType: string;
    creditCard: string | null;
    expirationDate: string | null;
    securityCode: string | null;
    seniorCitizenId: number | null;
    seniorCitizen: SeniorCitizen | null;
    constructor({
                    id,
                    firstName = "",
                    lastName = "",
                    email = "",
                    password = "",
                    role = "relative",
                    planType = "",
                    creditCard = null,
                    expirationDate = null,
                    securityCode = null,
                    seniorCitizenId = null,
                    seniorCitizen = null,

                }: {
        id: number;
        firstName?: string;
        lastName?: string;
        email?: string;
        password?: string;
        role?: string;
        planType?: string;
        creditCard?: string | null;
        expirationDate?: string | null;
        securityCode?: string | null;
        seniorCitizenId?: number | null;
        seniorCitizen?: SeniorCitizen | null;
    }) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.password = password;
        this.role = role;
        this.planType = planType;
        this.creditCard = creditCard;
        this.expirationDate = expirationDate;
        this.securityCode = securityCode;
        this.seniorCitizenId = seniorCitizenId;
        this.seniorCitizen = seniorCitizen ? new SeniorCitizen(seniorCitizen) : null;
    }
}
