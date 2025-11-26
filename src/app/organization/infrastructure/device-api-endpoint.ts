import { environment } from "../../../environments/environment.development";

/**
 * Device API Endpoints
 * All endpoints for device-related operations
 */
export class DeviceApiEndpoint {
  private static baseUrl = environment.platformProviderApiBaseUrl;
  private static devicesPath = environment.platformProviderDevicesEndpointPath;

  /**
   * Get all devices
   * GET /api/v1/devices
   */
  static getAllDevices(): string {
    return `${this.baseUrl}${this.devicesPath}`;
  }

  /**
   * Get device by ID
   * GET /api/v1/devices/{deviceId}
   */
  static getDeviceById(deviceId: number): string {
    return `${this.baseUrl}${this.devicesPath}/${deviceId}`;
  }

  /**
   * Create a new device
   * POST /api/v1/devices
   */
  static createDevice(): string {
    return `${this.baseUrl}${this.devicesPath}`;
  }

  /**
   * Add blood pressure measurement to device
   * POST /api/v1/devices/{deviceId}/measurements/blood-pressure
   */
  static addBloodPressureMeasurement(deviceId: number): string {
    return `${this.baseUrl}${this.devicesPath}/${deviceId}/measurements/blood-pressure`;
  }

  /**
   * Add heart rate measurement to device
   * POST /api/v1/devices/{deviceId}/measurements/heart-rate
   */
  static addHeartRateMeasurement(deviceId: number): string {
    return `${this.baseUrl}${this.devicesPath}/${deviceId}/measurements/heart-rate`;
  }

  /**
   * Add temperature measurement to device
   * POST /api/v1/devices/{deviceId}/measurements/temperature
   */
  static addTemperatureMeasurement(deviceId: number): string {
    return `${this.baseUrl}${this.devicesPath}/${deviceId}/measurements/temperature`;
  }

  /**
   * Add oxygen saturation measurement to device
   * POST /api/v1/devices/{deviceId}/measurements/oxygen
   */
  static addOxygenMeasurement(deviceId: number): string {
    return `${this.baseUrl}${this.devicesPath}/${deviceId}/measurements/oxygen`;
  }

  /**
   * Get all blood pressure measurements by device ID
   * GET /api/v1/devices/{deviceId}/measurements/blood-pressure
   */
  static getAllBloodPressureMeasurements(deviceId: number): string {
    return `${this.baseUrl}${this.devicesPath}/${deviceId}/measurements/blood-pressure`;
  }

  /**
   * Get all heart rate measurements by device ID
   * GET /api/v1/devices/{deviceId}/measurements/heart-rate
   */
  static getAllHeartRateMeasurements(deviceId: number): string {
    return `${this.baseUrl}${this.devicesPath}/${deviceId}/measurements/heart-rate`;
  }

  /**
   * Get all temperature measurements by device ID
   * GET /api/v1/devices/{deviceId}/measurements/temperature
   */
  static getAllTemperatureMeasurements(deviceId: number): string {
    return `${this.baseUrl}${this.devicesPath}/${deviceId}/measurements/temperature`;
  }

  /**
   * Get all oxygen saturation measurements by device ID
   * GET /api/v1/devices/{deviceId}/measurements/oxygen
   */
  static getAllOxygenMeasurements(deviceId: number): string {
    return `${this.baseUrl}${this.devicesPath}/${deviceId}/measurements/oxygen`;
  }
}

/**
 * Alert API Endpoints
 * All endpoints for alert-related operations
 */
export class AlertApiEndpoint {
  private static baseUrl = environment.platformProviderApiBaseUrl;
  private static alertsPath = environment.platformProviderAlertsEndpointPath;

  /**
   * Get all alerts
   * GET /api/v1/alerts
   */
  static getAllAlerts(): string {
    return `${this.baseUrl}${this.alertsPath}`;
  }

  /**
   * Get alert by ID
   * GET /api/v1/alerts/{alertId}
   */
  static getAlertById(alertId: number): string {
    return `${this.baseUrl}${this.alertsPath}/${alertId}`;
  }

  /**
   * Get all alerts by device ID
   * GET /api/v1/alerts/device/{deviceId}
   */
  static getAllAlertsByDeviceId(deviceId: number): string {
    return `${this.baseUrl}${this.alertsPath}/device/${deviceId}`;
  }
}
