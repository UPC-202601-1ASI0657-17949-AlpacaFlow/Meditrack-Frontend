export class SignalVitals {
    private _bloodPressure: number[][];
    private _heartRate: number[];
    private _temperature: number[];
    private _oxygenLevel: any[];

    constructor({
                    bloodPressure = [],
                    heartRate = [],
                    temperature = [],
                    oxygenLevel = [],
                }: any = {}) {
        this._bloodPressure = bloodPressure;
        this._heartRate = heartRate;
        this._temperature = temperature;
        this._oxygenLevel = oxygenLevel;
    }


    get bloodPressure(): number[][] {
        return this._bloodPressure;
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

