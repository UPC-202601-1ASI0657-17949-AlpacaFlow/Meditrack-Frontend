export class SignalVitals {
    private _heartRate: number[];
    private _temperature: number[];
    private _oxygenLevel: any[];

    constructor({
                    heartRate = [],
                    temperature = [],
                    oxygenLevel = [],
                }: any = {}) {
        this._heartRate = heartRate;
        this._temperature = temperature;
        this._oxygenLevel = oxygenLevel;
    }


    get heartRate(): number[] {
        return this._heartRate;
    }

    get temperature(): number[] {
        return this._temperature;
    }

    get oxygenLevel(): any[] {
        return this._oxygenLevel;
    }
}
