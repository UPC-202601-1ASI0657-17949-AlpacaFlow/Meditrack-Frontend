import { BaseEntity } from '../../../shared/infrastructure/base-entity';
import { Credentials } from './credentials.entity';

export class User implements BaseEntity {
    private _id: number;
    private _email: string;
    private _role: string;
    private _credentials?: Credentials;

    constructor(user: {
        id?: number;
        email?: string;
        role?: string;
        credentials?: Credentials;
    }) {
        this._id = user.id ?? 0;
        this._email = user.email ?? '';
        this._role = user.role ?? '';
        this._credentials = user.credentials;
    }

    get id(): number {
        return this._id;
    }
    set id(value: number) {
        this._id = value;
    }

    get email(): string {
        return this._email;
    }
    set email(value: string) {
        this._email = value;
    }

    get role(): string {
        return this._role;
    }
    set role(value: string) {
        this._role = value;
    }

    get credentials(): Credentials | undefined {
        return this._credentials;
    }
    set credentials(value: Credentials | undefined) {
        this._credentials = value;
    }
}