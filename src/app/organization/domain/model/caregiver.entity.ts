import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export class Caregiver implements BaseEntity{
    private _id: number;
    private _organizationId: number;
    private _userId: number | null = null;
    private _firstName: string;
    private _lastName: string;
    private _age: number;
    private _email: string;
    private _phoneNumber: string;
    private _imageUrl: string;
    private _assignedSeniorIds: number[];

    constructor(caregiver: {
        id?: number;
        organizationId: number;
        userId?: number | null;
        firstName?: string;
        lastName?: string;
        age?: number;
        email?: string;
        phoneNumber?: string;
        imageUrl?: string;
        assignedSeniorIds?: number[];
    }) {
        this._id = caregiver.id ?? 0;
        this._organizationId = caregiver.organizationId;
        this._userId = caregiver.userId ?? null;
        this._firstName = caregiver.firstName ?? '';
        this._lastName = caregiver.lastName ?? '';
        this._age = caregiver.age ?? 0;
        this._email = caregiver.email ?? '';
        this._phoneNumber = caregiver.phoneNumber ?? '';
        this._imageUrl = caregiver.imageUrl ?? '';
        this._assignedSeniorIds = caregiver.assignedSeniorIds ?? [];
    }

    get organizationId(): number {
        return this._organizationId;
    }
    set organizationId(value: number) {
        this._organizationId = value;
    }

    get userId(): number | null {
        return this._userId;
    }
    set userId(value: number | null) {
        this._userId = value;
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

    get age(): number {
        return this._age;
    }
    set age(value: number) {
        this._age = value;
    }

    get email(): string {
        return this._email;
    }
    set email(value: string) {
        this._email = value;
    }

    get phoneNumber(): string {
        return this._phoneNumber;
    }
    set phoneNumber(value: string) {
        this._phoneNumber = value;
    }

    get imageUrl(): string {
        return this._imageUrl;
    }
    set imageUrl(value: string) {
        this._imageUrl = value;
    }

    get fullName(): string {
        return `${this._firstName} ${this._lastName}`;
    }

    get assignedSeniorIds(): number[] {
        return this._assignedSeniorIds;
    }
    set assignedSeniorIds(value: number[]) {
        this._assignedSeniorIds = value;
    }

    /**
     * Domain logic: Assigns a senior citizen to this caregiver
     */
    assignToSenior(seniorId: number): void {
        if (!this._assignedSeniorIds.includes(seniorId)) {
            this._assignedSeniorIds.push(seniorId);
        }
    }

    /**
     * Domain logic: Unassigns a senior citizen from this caregiver
     */
    unassignFromSenior(seniorId: number): void {
        this._assignedSeniorIds = this._assignedSeniorIds.filter(id => id !== seniorId);
    }
}

