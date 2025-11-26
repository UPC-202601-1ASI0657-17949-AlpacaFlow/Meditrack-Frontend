export class Device {
    private _id: number | null;
    private _model: string;
    private _status: string;
    private _holderId: number;
    private _holderType: string;

    constructor({
                    id = null,
                    model = "",
                    status = "",
                    holderId = 0,
                    holderType = "",
                }: any = {}) {
        this._id = id;
        this._model = model;
        this._status = status;
        this._holderId = holderId;
        this._holderType = holderType;
    }

    get id(): number | null {
        return this._id;
    }

    get model(): string {
        return this._model;
    }

    get status(): string {
        return this._status;
    }

    get holderId(): number {
        return this._holderId;
    }

    get holderType(): string {
        return this._holderType;
    }
}
