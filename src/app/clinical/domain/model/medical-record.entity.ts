import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export class MedicalRecord implements BaseEntity {
    private _id: number;
    private _medicalRecordNumber: string;
    private _seniorCitizenId: number;
    private _medicalHistoryDescription: string;
    private _allergies: string;

    constructor(data: {
        id?: number;
        medicalRecordNumber?: string;
        seniorCitizenId: number;
        medicalHistoryDescription?: string;
        allergies?: string;
    }) {
        this._id = data.id ?? 0;
        this._medicalRecordNumber = data.medicalRecordNumber ?? '';
        this._seniorCitizenId = data.seniorCitizenId;
        this._medicalHistoryDescription = data.medicalHistoryDescription ?? '';
        this._allergies = data.allergies ?? '';
    }

    get id(): number { return this._id; }
    set id(value: number) { this._id = value; }

    get medicalRecordNumber(): string { return this._medicalRecordNumber; }
    set medicalRecordNumber(value: string) { this._medicalRecordNumber = value; }

    get seniorCitizenId(): number { return this._seniorCitizenId; }
    set seniorCitizenId(value: number) { this._seniorCitizenId = value; }

    get medicalHistoryDescription(): string { return this._medicalHistoryDescription; }
    set medicalHistoryDescription(value: string) { this._medicalHistoryDescription = value; }

    get allergies(): string { return this._allergies; }
    set allergies(value: string) { this._allergies = value; }
}
