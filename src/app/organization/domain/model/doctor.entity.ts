import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export class Doctor implements BaseEntity {
    private _id: number;
    private _organizationId: number;
    private _userId: number | null = null;
    private _firstName: string;
    private _lastName: string;
    private _age: number;
    private _email: string;
    private _specialty: string;
    private _phoneNumber: string;
    private _imageUrl: string;
    private _assignedSeniorIds: number[];

    constructor(doctor: {
        id?: number;
        organizationId: number;
        userId?: number | null;
        firstName?: string;
        lastName?: string;
        age?: number;
        email?: string;
        specialty?: string;
        phoneNumber?: string;
        imageUrl?: string;
        assignedSeniorIds?: number[];
    }) {
        this._id = doctor.id ?? 0;
        this._organizationId = doctor.organizationId;
        this._userId = doctor.userId ?? null;
        this._firstName = doctor.firstName ?? '';
        this._lastName = doctor.lastName ?? '';
        this._age = doctor.age ?? 0;
        this._email = doctor.email ?? '';
        this._specialty = doctor.specialty ?? '';
        this._phoneNumber = doctor.phoneNumber ?? '';
        this._imageUrl = doctor.imageUrl ?? '';
        this._assignedSeniorIds = doctor.assignedSeniorIds ?? [];
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

    get specialty(): string {
        return this._specialty;
    }
    set specialty(value: string) {
        this._specialty = value;
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
     * Domain logic: Assigns a senior citizen to this doctor
     */
    assignToSenior(seniorId: number): void {
        if (!this._assignedSeniorIds.includes(seniorId)) {
            this._assignedSeniorIds.push(seniorId);
        }
    }

    /**
     * Domain logic: Unassigns a senior citizen from this doctor
     */
    unassignFromSenior(seniorId: number): void {
        this._assignedSeniorIds = this._assignedSeniorIds.filter(id => id !== seniorId);
    }
}
