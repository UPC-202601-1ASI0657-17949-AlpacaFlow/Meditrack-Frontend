import { Device } from "../domain/model/device.entity";
import { DeviceResponse } from "./device-response";
import {
  BloodPressureMeasurement,
  HeartRateMeasurement,
  TemperatureMeasurement,
  OxygenMeasurement
} from "../domain/model/measurement.entity";
import {
  BloodPressureMeasurementResponse,
  HeartRateMeasurementResponse,
  TemperatureMeasurementResponse,
  OxygenMeasurementResponse
} from "./measurement-response";

/**
 * DeviceAssembler
 * Transforms DeviceResponse to Device entity
 */
export class DeviceAssembler {
  static toEntity(response: DeviceResponse): Device {
    return new Device({
      id: response.id,
      model: response.model,
      status: response.status,
      holderId: response.holderId,
      holderType: response.holderType
    });
  }

  static toEntityList(responses: DeviceResponse[]): Device[] {
    return responses.map(response => this.toEntity(response));
  }
}

/**
 * BloodPressureMeasurementAssembler
 * Transforms BloodPressureMeasurementResponse to BloodPressureMeasurement entity
 */
export class BloodPressureMeasurementAssembler {
  static toEntity(response: BloodPressureMeasurementResponse): BloodPressureMeasurement {
    return new BloodPressureMeasurement({
      id: response.id,
      diastolic: response.diastolic,
      systolic: response.systolic,
      measuredAt: response.measuredAt
    });
  }

  static toEntityList(responses: BloodPressureMeasurementResponse[]): BloodPressureMeasurement[] {
    return responses.map(response => this.toEntity(response));
  }
}

/**
 * HeartRateMeasurementAssembler
 * Transforms HeartRateMeasurementResponse to HeartRateMeasurement entity
 */
export class HeartRateMeasurementAssembler {
  static toEntity(response: HeartRateMeasurementResponse): HeartRateMeasurement {
    return new HeartRateMeasurement({
      id: response.id,
      bpm: response.bpm,
      measuredAt: response.measuredAt
    });
  }

  static toEntityList(responses: HeartRateMeasurementResponse[]): HeartRateMeasurement[] {
    return responses.map(response => this.toEntity(response));
  }
}

/**
 * TemperatureMeasurementAssembler
 * Transforms TemperatureMeasurementResponse to TemperatureMeasurement entity
 */
export class TemperatureMeasurementAssembler {
  static toEntity(response: TemperatureMeasurementResponse): TemperatureMeasurement {
    return new TemperatureMeasurement({
      id: response.id,
      celsius: response.celsius,  // El response tiene "celsius"
      measuredAt: response.measuredAt
    });
  }

  static toEntityList(responses: TemperatureMeasurementResponse[]): TemperatureMeasurement[] {
    return responses.map(response => this.toEntity(response));
  }
}

/**
 * OxygenMeasurementAssembler
 * Transforms OxygenMeasurementResponse to OxygenMeasurement entity
 */
export class OxygenMeasurementAssembler {
  static toEntity(response: OxygenMeasurementResponse): OxygenMeasurement {
    return new OxygenMeasurement({
      id: response.id,
      spo2: response.spo2,  // El response tiene "spo2"
      measuredAt: response.measuredAt
    });
  }

  static toEntityList(responses: OxygenMeasurementResponse[]): OxygenMeasurement[] {
    return responses.map(response => this.toEntity(response));
  }
}
