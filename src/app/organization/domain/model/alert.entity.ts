export class Alert {
    private _id: number | null;
    private _alertTitle: string;
    private _date: string;
    private _time: string;
    private _dataRegistered: string;
    private _reason: string;

    constructor({
                    id = null,
                    alertTitle = "",
                    date = "",
                    time = "",
                    dataRegistered = "",
                    reason = "",
                }: any = {}) {
        this._id = id;
        this._alertTitle = alertTitle;
        this._date = date;
        this._time = time;
        this._dataRegistered = dataRegistered;
        this._reason = reason;
    }

    get id(): number | null {
        return this._id;
    }

    get alertTitle(): string {
        return this._alertTitle;
    }

    get date(): string {
        return this._date;
    }

    get time(): string {
        return this._time;
    }

    get dataRegistered(): string {
        return this._dataRegistered;
    }

    get reason(): string {
        return this._reason;
    }
}

