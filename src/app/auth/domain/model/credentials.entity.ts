import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export class Credentials implements BaseEntity {
    private _id: number;
    private _password: string;
    private _userId?: number;

    constructor(credentials: {
        id?: number;
        password?: string;
        userId?: number;
    }) {
        this._id = credentials.id ?? 0;
        this._password = credentials.password ?? '';
        this._userId = credentials.userId;
    }

    get id(): number {
        return this._id;
    }
    set id(value: number) {
        this._id = value;
    }

    get password(): string {
        return this._password;
    }
    set password(value: string) {
        this._password = value;
    }

    get userId(): number | undefined {
        return this._userId;
    }
    set userId(value: number | undefined) {
        this._userId = value;
    }
}

