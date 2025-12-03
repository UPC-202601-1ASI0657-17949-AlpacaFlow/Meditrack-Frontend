import {SignalVitals} from "./signalVitals.entity";
import {Alert} from "./alert.entity";

export class SeniorCitizen {
    private _firstName: string;
    private _lastName: string;
    private _birthDate: Date;
    private _age: number;
    private _dni: string;
    private _gender: string;
    private _height: number;
    private _weight: number;
    private _image: string;
    private _deviceId: number;
    private _signalVitals: SignalVitals;
    private _alerts: Alert[];

    constructor({
                    firstName = "",
                    lastName = "",
                    birthDate = null,
                    age = 0,
                    dni = "",
                    gender = "",
                    height = 0,
                    weight = 0,
                    image = "",
                    deviceId = 0,
                    signalVitals = {},
                    alerts = [],
                }: {
                    firstName?: string;
                    lastName?: string;
                    birthDate?: Date | string | null;
                    age?: number;
                    dni?: string;
                    gender?: string;
                    height?: number;
                    weight?: number;
                    image?: string;
                    deviceId?: number;
                    signalVitals?: any;
                    alerts?: any[];
                }) {
        this._firstName = firstName;
        this._lastName = lastName;
        this._dni = dni;
        this._gender = gender;
        this._height = height;
        this._weight = weight;
        this._image = image;
        this._deviceId = deviceId;
        this._signalVitals = new SignalVitals(signalVitals);
        this._alerts = Array.isArray(alerts)
            ? alerts.map((a) => new Alert(a))
            : [];
        
        // Handle birthDate - can be Date object or string
        if (birthDate) {
            this._birthDate = birthDate instanceof Date 
                ? birthDate 
                : new Date(birthDate);
        } else {
            // If no birthDate provided, calculate from age (fallback)
            const today = new Date();
            this._birthDate = new Date(today.getFullYear() - age, today.getMonth(), today.getDate());
        }
        
        // Calculate age from birthDate if not provided or if age is 0
        this._age = age > 0 ? age : this.calculateAge(this._birthDate);
    }

    /**
     * Calculate age from birthDate
     */
    private calculateAge(birthDate: Date): number {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    get firstName() { return this._firstName; }
    get lastName() { return this._lastName; }
    get birthDate() { return this._birthDate; }
    get age() { return this._age; }
    get weight() { return this._weight; }
    get height() { return this._height; }
    get gender() { return this._gender; }
    get dni() { return this._dni; }
    get image() { return this._image; }
    get deviceId() { return this._deviceId; }
    get signalVitals() { return this._signalVitals; }
    get alerts() { return this._alerts}
}
