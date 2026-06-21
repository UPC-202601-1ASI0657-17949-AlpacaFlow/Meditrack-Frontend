import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { Device } from '../domain/model/device.entity';
import {
  HeartRateMeasurement,
  TemperatureMeasurement,
  OxygenMeasurement
} from '../domain/model/measurement.entity';
import { Alert } from '../domain/model/alert.entity';
import { DeviceApiEndpoint, AlertApiEndpoint, DeviceAlertApiEndpoint } from './device-api-endpoint';
import { DeviceResponse, CreateDeviceRequest } from './device-response';
import { AlertResponse } from './alert-response';
import {
  HeartRateMeasurementResponse,
  TemperatureMeasurementResponse,
  OxygenMeasurementResponse,
  AddHeartRateMeasurementRequest,
  AddTemperatureMeasurementRequest,
  AddOxygenMeasurementRequest
} from './measurement-response';
import {
  DeviceAssembler,
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
  private handleError(error: HttpErrorResponse | any): Observable<never> {
    let errorMessage = 'An error occurred';
    
    // Handle network errors (status 0) or connection refused
    if (error.status === 0 || error.status === undefined) {
      errorMessage = `Network Error: Unable to connect to the server. Please check if the backend is running at ${error.url || 'the configured URL'}`;
      console.error('❌ Network Error Details:', {
        url: error.url,
        message: error.message,
        status: error.status,
        error: error.error
      });
    } else if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
      console.error('❌ Client Error:', error.error);
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      if (error.error) {
        errorMessage += `\nDetails: ${JSON.stringify(error.error)}`;
      }
      console.error('❌ Server Error:', {
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        url: error.url,
        error: error.error
      });
    }
    
    console.error('Full error object:', error);
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
   * Get device by ID. Pass fresh=true to bypass browser HTTP cache (important for holderId).
   */
  getDeviceById(deviceId: number, options?: { fresh?: boolean }): Observable<Device> {
    let url = DeviceApiEndpoint.getDeviceById(deviceId);
    if (options?.fresh) {
      url += `?t=${Date.now()}`;
    }
    return this.http
      .get<DeviceResponse>(url, {
        headers: options?.fresh
          ? { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
          : undefined
      })
      .pipe(
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
   * Tries the standard endpoint first, then falls back to device-based endpoint if needed
   */
  getAllAlertsByDeviceId(deviceId: number): Observable<Alert[]> {
    // Try standard endpoint: /api/v1/alerts/device/{deviceId}
    const standardUrl = AlertApiEndpoint.getAllAlertsByDeviceId(deviceId);
    console.log(`📡 DeviceApi: Requesting alerts for device ${deviceId} from URL: ${standardUrl}`);
    
    return this.http.get<AlertResponse[]>(standardUrl)
      .pipe(
        retry(2),
        map(responses => {
          console.log(`✅ DeviceApi: Received ${responses.length} alerts for device ${deviceId} from standard endpoint`);
          return AlertAssembler.toEntityList(responses);
        }),
        catchError((error: HttpErrorResponse | any) => {
          // Check if it's a network error (status 0 or undefined, or error message indicates network issue)
          const isNetworkError = error.status === 0 || 
                                error.status === undefined || 
                                (error.message && (error.message.includes('Http failure') || error.message.includes('0 undefined')));
          
          console.error(`❌ DeviceApi: Standard endpoint failed for device ${deviceId}:`, {
            url: standardUrl,
            status: error.status,
            message: error.message,
            error: error
          });
          
          // If standard endpoint fails with network error, try alternative endpoint
          if (isNetworkError) {
            const alternativeUrl = DeviceAlertApiEndpoint.getAlertsByDeviceId(deviceId);
            console.warn(`⚠️ DeviceApi: Standard endpoint failed with network error, trying alternative: ${alternativeUrl}`);
            
            return this.http.get<AlertResponse[]>(alternativeUrl)
              .pipe(
                retry(1),
                map(responses => {
                  console.log(`✅ DeviceApi: Received ${responses.length} alerts for device ${deviceId} from alternative endpoint`);
                  return AlertAssembler.toEntityList(responses);
                }),
                catchError((altError) => {
                  console.error(`❌ DeviceApi: Both endpoints failed for device ${deviceId}:`, {
                    standardUrl: standardUrl,
                    alternativeUrl: alternativeUrl,
                    standardError: error,
                    alternativeError: altError
                  });
                  return this.handleError(altError);
                })
              );
          } else {
            // For other errors (4xx, 5xx), don't try alternative
            console.error(`❌ DeviceApi: HTTP error (not network), not trying alternative endpoint`);
            return this.handleError(error);
          }
        })
      );
  }
}
