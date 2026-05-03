export interface HeartRateMeasurementResponse {
  id: number;
  bpm: number;
  measuredAt: string;
}

export interface TemperatureMeasurementResponse {
  id: number;
  celsius: number;  // El backend devuelve "celsius"
  measuredAt: string;
}

export interface OxygenMeasurementResponse {
  id: number;
  spo2: number;  // El backend devuelve "spo2"
  measuredAt: string;
}

export interface AddHeartRateMeasurementRequest {
  bpm: number;
  measuredAt: string;
}

export interface AddTemperatureMeasurementRequest {
  celsius: number;  // El backend espera "celsius"
  measuredAt: string;
}

export interface AddOxygenMeasurementRequest {
  spo2: number;  // El backend espera "spo2"
  measuredAt: string;
}
