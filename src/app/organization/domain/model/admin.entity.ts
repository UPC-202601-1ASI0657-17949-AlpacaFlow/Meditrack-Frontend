import { BaseEntity } from '../../../shared/infrastructure/base-entity';

/**
 * Admin entity representing an administrator of an organization.
 */
export class Admin implements BaseEntity {
    private _id: number;
    private _organizationId: number;
    private _userId: number | null = null;
    private _firstName: string;
    private _lastName: string;

    constructor(admin: {
        id?: number;
        organizationId: number;
        userId: number | null;
        firstName?: string;
        lastName?: string;
    }) {
        this._id = admin.id ?? 0;
        this._organizationId = admin.organizationId;
        this._userId = admin.userId ?? null;
        this._firstName = admin.firstName ?? '';
        this._lastName = admin.lastName ?? '';
    }

    get id(): number {
        return this._id;
    }

    set id(value: number) {
        this._id = value;
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
}

