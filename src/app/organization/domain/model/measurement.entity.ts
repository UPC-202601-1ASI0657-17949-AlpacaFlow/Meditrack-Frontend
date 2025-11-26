export class BloodPressureMeasurement {
    private _id: number | null;
    private _diastolic: number;
    private _systolic: number;
    private _measuredAt: string;

    constructor({
                    id = null,
                    diastolic = 0,
                    systolic = 0,
                    measuredAt = "",
                }: any = {}) {
        this._id = id;
        this._diastolic = diastolic;
        this._systolic = systolic;
        this._measuredAt = measuredAt;
    }

    get id(): number | null {
        return this._id;
    }

    get diastolic(): number {
        return this._diastolic;
    }

    get systolic(): number {
        return this._systolic;
    }

    get measuredAt(): string {
        return this._measuredAt;
    }
}

export class HeartRateMeasurement {
    private _id: number | null;
    private _bpm: number;
    private _measuredAt: string;

    constructor({
                    id = null,
                    bpm = 0,
                    measuredAt = "",
                }: any = {}) {
        this._id = id;
        this._bpm = bpm;
        this._measuredAt = measuredAt;
    }

    get id(): number | null {
        return this._id;
    }

    get bpm(): number {
        return this._bpm;
    }

    get measuredAt(): string {
        return this._measuredAt;
    }
}

export class TemperatureMeasurement {
    private _id: number | null;
    private _temperature: number;
    private _measuredAt: string;

    constructor({
                    id = null,
                    celsius = 0,
                    measuredAt = "",
                }: any = {}) {
        this._id = id;
        this._temperature = celsius;
        this._measuredAt = measuredAt;
    }

    get id(): number | null {
        return this._id;
    }

    get temperature(): number {
        return this._temperature;
    }

    get measuredAt(): string {
        return this._measuredAt;
    }
}

export class OxygenMeasurement {
    private _id: number | null;
    private _saturation: number;
    private _measuredAt: string;

    constructor({
                    id = null,
                    spo2 = 0,
                    measuredAt = "",
                }: any = {}) {
        this._id = id;
        this._saturation = spo2;
        this._measuredAt = measuredAt;
    }

    get id(): number | null {
        return this._id;
    }

    get saturation(): number {
        return this._saturation;
    }

    get measuredAt(): string {
        return this._measuredAt;
    }
}
