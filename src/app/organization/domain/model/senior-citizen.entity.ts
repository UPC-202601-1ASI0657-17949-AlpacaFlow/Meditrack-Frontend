import {BaseEntity} from "../../../shared/infrastructure/base-entity";
import {SignalVitals} from "./signal-vitals.entity";
import {Alert} from "./alert.entity";

export class SeniorCitizen implements BaseEntity {
    private _id: number;
    private _organizationId: number;
    private _firstName: string;
    private _lastName: string;
    private _birthDate: Date;
    private _age: number;
    private _gender: string;
    private _weight: number;
    private _dni: string;
    private _height: number;
    private _imageUrl: string;
    private _deviceId: number;
    private _assignedDoctorId: number | null;
    private _assignedCaregiverId: number | null;
    private _signalVitals?: SignalVitals;
    private _alerts?: Alert[];


    constructor(seniorCitizen: {
        id?: number,
        organizationId: number,
        firstName?: string,
        lastName?: string,
        birthDate?: Date | string,
        age?: number,
        gender?: string,
        weight?: number,
        dni?: string,
        height?: number,
        imageUrl?: string,
        deviceId?: number,
        assignedDoctorId?: number | null,
        assignedCaregiverId?: number | null,
        signalVitals?: any,
        alerts?: any[],
    }) {
        this._id = seniorCitizen.id ?? 0;
        this._organizationId = seniorCitizen.organizationId;
        this._firstName = seniorCitizen.firstName ?? '';
        this._lastName = seniorCitizen.lastName ?? '';
        
        // Handle birthDate - can be Date object or string
        if (seniorCitizen.birthDate) {
            this._birthDate = seniorCitizen.birthDate instanceof Date 
                ? seniorCitizen.birthDate 
                : new Date(seniorCitizen.birthDate);
        } else {
            // If no birthDate provided, calculate from age (fallback)
            const today = new Date();
            this._birthDate = new Date(today.getFullYear() - (seniorCitizen.age ?? 0), today.getMonth(), today.getDate());
        }
        
        // Calculate age from birthDate if not provided
        this._age = seniorCitizen.age ?? this.calculateAge(this._birthDate);
        
        this._gender = seniorCitizen.gender ?? '';
        this._weight = seniorCitizen.weight ?? 0;
        this._dni = seniorCitizen.dni ?? '';
        this._height = seniorCitizen.height ?? 0;
        this._imageUrl = seniorCitizen.imageUrl ?? '';
        this._deviceId = seniorCitizen.deviceId ?? 0;
        this._assignedDoctorId = seniorCitizen.assignedDoctorId ?? null;
        this._assignedCaregiverId = seniorCitizen.assignedCaregiverId ?? null;
        this._signalVitals = seniorCitizen.signalVitals ? new SignalVitals(seniorCitizen.signalVitals) : undefined;
        this._alerts = seniorCitizen.alerts ? seniorCitizen.alerts.map(a => new Alert(a)) : [];
    }

    get organizationId(): number {
        return this._organizationId;
    }
    set organizationId(value: number) {
        this._organizationId = value;
    }

    get deviceId(): number {
        return this._deviceId;
    }
    set deviceId(value: number) {
        this._deviceId = value;
    }

    get id(): number {
        return this._id;
    }
    set id(value: number) {
        this._id = value;
    }

    get firstName(): string {
        return this._firstName;
    }
    set firstName(value: string) {
        this._firstName = value;
    }

    get lastName(): string {
        return this._lastName;
    }
    set lastName(value: string) {
        this._lastName = value;
    }

    get fullName(): string {
        return `${this._firstName} ${this._lastName}`.trim();
    }

    get birthDate(): Date {
        return this._birthDate;
    }
    set birthDate(value: Date) {
        this._birthDate = value;
        this._age = this.calculateAge(value);
    }

    get age(): number {
        return this._age;
    }
    set age(value: number) {
        this._age = value;
        // When age is set directly, update birthDate (fallback)
        const today = new Date();
        this._birthDate = new Date(today.getFullYear() - value, today.getMonth(), today.getDate());
    }

    /**
     * Domain logic: Calculates age from birth date
     */
    private calculateAge(birthDate: Date): number {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    get gender(): string {
        return this._gender;
    }
    set gender(value: string) {
        this._gender = value;
    }

    get weight(): number {
        return this._weight;
    }
    set weight(value: number) {
        this._weight = value;
    }

    get dni(): string {
        return this._dni;
    }
    set dni(value: string) {
        this._dni = value;
    }

    get height(): number {
        return this._height;
    }
    set height(value: number) {
        this._height = value;
    }

    get imageUrl(): string {
        return this._imageUrl;
    }
    set imageUrl(value: string) {
        this._imageUrl = value;
    }

    get signalVitals(): SignalVitals | undefined {
        return this._signalVitals;
    }

    get alerts(): Alert[] {
        return this._alerts || [];
    }

    get assignedDoctorId(): number | null {
        return this._assignedDoctorId;
    }
    set assignedDoctorId(value: number | null) {
        this._assignedDoctorId = value;
    }

    get assignedCaregiverId(): number | null {
        return this._assignedCaregiverId;
    }
    set assignedCaregiverId(value: number | null) {
        this._assignedCaregiverId = value;
    }

    /**
     * Domain logic: Checks if this senior citizen is assigned to a specific person (doctor or caregiver)
     */
    isAssignedTo(personId: number): boolean {
        return this._assignedDoctorId === personId || 
               this._assignedCaregiverId === personId;
    }

    /**
     * Domain logic: Checks if this senior citizen can be assigned to a doctor.
     * A senior citizen can only be assigned to a doctor if it's not already assigned to any caregiver.
     * @returns true if can be assigned to a doctor, false otherwise
     */
    canBeAssignedToDoctor(): boolean {
        return this._assignedCaregiverId === null;
    }

    /**
     * Domain logic: Checks if this senior citizen can be assigned to a caregiver.
     * A senior citizen can only be assigned to a caregiver if it's not already assigned to any doctor.
     * @returns true if can be assigned to a caregiver, false otherwise
     */
    canBeAssignedToCaregiver(): boolean {
        return this._assignedDoctorId === null;
    }

    /**
     * Domain logic: Checks if this senior citizen is assigned to any doctor
     * @returns true if assigned to a doctor
     */
    isAssignedToAnyDoctor(): boolean {
        return this._assignedDoctorId !== null;
    }

    /**
     * Domain logic: Checks if this senior citizen is assigned to any caregiver
     * @returns true if assigned to a caregiver
     */
    isAssignedToAnyCaregiver(): boolean {
        return this._assignedCaregiverId !== null;
    }

    /**
     * Domain logic: Checks if this senior citizen is assigned to a specific doctor
     * @param doctorId - The ID of the doctor to check
     * @returns true if assigned to this specific doctor
     */
    isAssignedToDoctor(doctorId: number): boolean {
        return this._assignedDoctorId === doctorId;
    }

    /**
     * Domain logic: Checks if this senior citizen is assigned to a specific caregiver
     * @param caregiverId - The ID of the caregiver to check
     * @returns true if assigned to this specific caregiver
     */
    isAssignedToCaregiver(caregiverId: number): boolean {
        return this._assignedCaregiverId === caregiverId;
    }
}