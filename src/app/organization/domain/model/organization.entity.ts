import { BaseEntity } from '../../../shared/infrastructure/base-entity';

/**
 * Organization entity representing a clinic or residence.
 * Acts as the Aggregate Root for the organization bounded context.
 * This entity ensures multi-tenant data isolation.
 */
export class Organization implements BaseEntity {
    private _id: number;
    private _name: string;
    private _type: 'clinic' | 'resident';

    constructor(organization: {
        id?: number;
        name: string;
        type: 'clinic' | 'resident';
    }) {
        this._id = organization.id ?? 0;
        this._name = organization.name;
        this._type = organization.type;
    }

    get id(): number {
        return this._id;
    }

    set id(value: number) {
        this._id = value;
    }

    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
    }

    get type(): 'clinic' | 'resident' {
        return this._type;
    }

    set type(value: 'clinic' | 'resident') {
        this._type = value;
    }

    /**
     * Domain logic: Checks if this organization is a clinic
     */
    isClinic(): boolean {
        return this._type === 'clinic';
    }

    /**
     * Domain logic: Checks if this organization is a residence
     */
    isResidence(): boolean {
        return this._type === 'resident';
    }
}

