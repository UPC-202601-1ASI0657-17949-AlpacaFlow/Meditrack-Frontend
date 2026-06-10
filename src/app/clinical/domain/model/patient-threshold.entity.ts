import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export class PatientThreshold implements BaseEntity {
    private _id: number;
    private _seniorCitizenId: number;
    private _minBpm: number;
    private _maxBpm: number;
    private _minSpo2: number;
    private _minCelsius: number;
    private _maxCelsius: number;

    constructor(data: {
        id?: number;
        seniorCitizenId: number;
        minBpm?: number;
        maxBpm?: number;
        minSpo2?: number;
        minCelsius?: number;
        maxCelsius?: number;
    }) {
        this._id = data.id ?? 0;
        this._seniorCitizenId = data.seniorCitizenId;
        this._minBpm = data.minBpm ?? 60;
        this._maxBpm = data.maxBpm ?? 100;
        this._minSpo2 = data.minSpo2 ?? 90;
        this._minCelsius = data.minCelsius ?? 36.0;
        this._maxCelsius = data.maxCelsius ?? 37.5;
    }

    get id(): number { return this._id; }
    set id(value: number) { this._id = value; }

    get seniorCitizenId(): number { return this._seniorCitizenId; }
    set seniorCitizenId(value: number) { this._seniorCitizenId = value; }

    get minBpm(): number { return this._minBpm; }
    set minBpm(value: number) { this._minBpm = value; }

    get maxBpm(): number { return this._maxBpm; }
    set maxBpm(value: number) { this._maxBpm = value; }

    get minSpo2(): number { return this._minSpo2; }
    set minSpo2(value: number) { this._minSpo2 = value; }

    get minCelsius(): number { return this._minCelsius; }
    set minCelsius(value: number) { this._minCelsius = value; }

    get maxCelsius(): number { return this._maxCelsius; }
    set maxCelsius(value: number) { this._maxCelsius = value; }
}
