import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { Device } from '../domain/model/device.entity';
import { 
  BloodPressureMeasurement, 
  HeartRateMeasurement, 
  TemperatureMeasurement, 
  OxygenMeasurement 
} from '../domain/model/measurement.entity';
import { Alert } from '../domain/model/alert.entity';
import { DeviceApiEndpoint, AlertApiEndpoint } from './device-api-endpoint';
import { DeviceResponse, CreateDeviceRequest } from './device-response';
import { AlertResponse } from './alert-response';
import {
  BloodPressureMeasurementResponse,
  HeartRateMeasurementResponse,
  TemperatureMeasurementResponse,
  OxygenMeasurementResponse,
  AddBloodPressureMeasurementRequest,
  AddHeartRateMeasurementRequest,
  AddTemperatureMeasurementRequest,
  AddOxygenMeasurementRequest
} from './measurement-response';
import {
  DeviceAssembler,
  BloodPressureMeasurementAssembler,
  HeartRateMeasurementAssembler,
  TemperatureMeasurementAssembler,
  OxygenMeasurementAssembler
} from './device-assembler';
import { AlertAssembler } from './alert-assembler';

/**
 * DeviceApi
 * Service for consuming device and alert-related API endpoints
 */
@Injectable({
  providedIn: 'root'
})
export class DeviceApi {
  constructor(private http: HttpClient) {}

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  // ==================== Device Operations ====================

  /**
   * Get all devices
   */
  getAllDevices(): Observable<Device[]> {
    return this.http.get<DeviceResponse[]>(DeviceApiEndpoint.getAllDevices())
      .pipe(
        retry(2),
        map(responses => DeviceAssembler.toEntityList(responses)),
        catchError(this.handleError)
      );
  }

  /**
   * Get device by ID
   */
  getDeviceById(deviceId: number): Observable<Device> {
    return this.http.get<DeviceResponse>(DeviceApiEndpoint.getDeviceById(deviceId))
      .pipe(
        retry(2),
        map(response => DeviceAssembler.toEntity(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Create a new device
   */
  createDevice(request: CreateDeviceRequest): Observable<Device> {
    return this.http.post<DeviceResponse>(DeviceApiEndpoint.createDevice(), request)
      .pipe(
        map(response => DeviceAssembler.toEntity(response)),
        catchError(this.handleError)
      );
  }

  // ==================== Blood Pressure Measurements ====================

  /**
   * Add blood pressure measurement to device
   */
  addBloodPressureMeasurement(
    deviceId: number, 
    request: AddBloodPressureMeasurementRequest
  ): Observable<Device> {
    return this.http.post<DeviceResponse>(
      DeviceApiEndpoint.addBloodPressureMeasurement(deviceId), 
      request
    ).pipe(
      map(response => DeviceAssembler.toEntity(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Get all blood pressure measurements by device ID
   */
  getAllBloodPressureMeasurements(deviceId: number): Observable<BloodPressureMeasurement[]> {
    return this.http.get<BloodPressureMeasurementResponse[]>(
      DeviceApiEndpoint.getAllBloodPressureMeasurements(deviceId)
    ).pipe(
      retry(2),
      map(responses => BloodPressureMeasurementAssembler.toEntityList(responses)),
      catchError(this.handleError)
    );
  }

  // ==================== Heart Rate Measurements ====================

  /**
   * Add heart rate measurement to device
   */
  addHeartRateMeasurement(
    deviceId: number, 
    request: AddHeartRateMeasurementRequest
  ): Observable<Device> {
    return this.http.post<DeviceResponse>(
      DeviceApiEndpoint.addHeartRateMeasurement(deviceId), 
      request
    ).pipe(
      map(response => DeviceAssembler.toEntity(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Get all heart rate measurements by device ID
   */
  getAllHeartRateMeasurements(deviceId: number): Observable<HeartRateMeasurement[]> {
    return this.http.get<HeartRateMeasurementResponse[]>(
      DeviceApiEndpoint.getAllHeartRateMeasurements(deviceId)
    ).pipe(
      retry(2),
      map(responses => HeartRateMeasurementAssembler.toEntityList(responses)),
      catchError(this.handleError)
    );
  }

  // ==================== Temperature Measurements ====================

  /**
   * Add temperature measurement to device
   */
  addTemperatureMeasurement(
    deviceId: number, 
    request: AddTemperatureMeasurementRequest
  ): Observable<Device> {
    return this.http.post<DeviceResponse>(
      DeviceApiEndpoint.addTemperatureMeasurement(deviceId), 
      request
    ).pipe(
      map(response => DeviceAssembler.toEntity(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Get all temperature measurements by device ID
   */
  getAllTemperatureMeasurements(deviceId: number): Observable<TemperatureMeasurement[]> {
    return this.http.get<TemperatureMeasurementResponse[]>(
      DeviceApiEndpoint.getAllTemperatureMeasurements(deviceId)
    ).pipe(
      retry(2),
      map(responses => TemperatureMeasurementAssembler.toEntityList(responses)),
      catchError(this.handleError)
    );
  }

  // ==================== Oxygen Measurements ====================

  /**
   * Add oxygen saturation measurement to device
   */
  addOxygenMeasurement(
    deviceId: number, 
    request: AddOxygenMeasurementRequest
  ): Observable<Device> {
    return this.http.post<DeviceResponse>(
      DeviceApiEndpoint.addOxygenMeasurement(deviceId), 
      request
    ).pipe(
      map(response => DeviceAssembler.toEntity(response)),
      catchError(this.handleError)
    );
  }

  /**
   * Get all oxygen saturation measurements by device ID
   */
  getAllOxygenMeasurements(deviceId: number): Observable<OxygenMeasurement[]> {
    return this.http.get<OxygenMeasurementResponse[]>(
      DeviceApiEndpoint.getAllOxygenMeasurements(deviceId)
    ).pipe(
      retry(2),
      map(responses => OxygenMeasurementAssembler.toEntityList(responses)),
      catchError(this.handleError)
    );
  }

  // ==================== Alert Operations ====================

  /**
   * Get all alerts
   */
  getAllAlerts(): Observable<Alert[]> {
    return this.http.get<AlertResponse[]>(AlertApiEndpoint.getAllAlerts())
      .pipe(
        retry(2),
        map(responses => AlertAssembler.toEntityList(responses)),
        catchError(this.handleError)
      );
  }

  /**
   * Get alert by ID
   */
  getAlertById(alertId: number): Observable<Alert> {
    return this.http.get<AlertResponse>(AlertApiEndpoint.getAlertById(alertId))
      .pipe(
        retry(2),
        map(response => AlertAssembler.toEntity(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Get all alerts by device ID
   */
  getAllAlertsByDeviceId(deviceId: number): Observable<Alert[]> {
    return this.http.get<AlertResponse[]>(AlertApiEndpoint.getAllAlertsByDeviceId(deviceId))
      .pipe(
        retry(2),
        map(responses => AlertAssembler.toEntityList(responses)),
        catchError(this.handleError)
      );
  }
}
