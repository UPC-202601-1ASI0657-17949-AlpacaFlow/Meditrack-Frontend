import { computed, Injectable, signal, Signal } from '@angular/core';
import { Device } from '../domain/model/device.entity';
import { Alert } from '../domain/model/alert.entity';
import {
  BloodPressureMeasurement,
  HeartRateMeasurement,
  TemperatureMeasurement,
  OxygenMeasurement
} from '../domain/model/measurement.entity';
import { DeviceApi } from '../infrastructure/device-api';

/**
 * DeviceStore
 * State management store for devices, measurements, and alerts using Angular signals.
 */
@Injectable({
  providedIn: 'root'
})
export class DeviceStore {
  // ==================== Devices ====================
  private readonly devicesSignal = signal<Device[]>([]);
  readonly devices = this.devicesSignal.asReadonly();
  
  private readonly selectedDeviceSignal = signal<Device | null>(null);
  readonly selectedDevice = this.selectedDeviceSignal.asReadonly();
  
  readonly deviceCount = computed(() => this.devices().length);

  // ==================== Alerts ====================
  private readonly alertsSignal = signal<Alert[]>([]);
  readonly alerts = this.alertsSignal.asReadonly();
  
  private readonly deviceAlertsSignal = signal<Map<number, Alert[]>>(new Map());
  readonly deviceAlerts = this.deviceAlertsSignal.asReadonly();
  
  readonly alertCount = computed(() => this.alerts().length);

  // ==================== Blood Pressure Measurements ====================
  private readonly bloodPressureMeasurementsSignal = signal<Map<number, BloodPressureMeasurement[]>>(new Map());
  readonly bloodPressureMeasurements = this.bloodPressureMeasurementsSignal.asReadonly();

  // ==================== Heart Rate Measurements ====================
  private readonly heartRateMeasurementsSignal = signal<Map<number, HeartRateMeasurement[]>>(new Map());
  readonly heartRateMeasurements = this.heartRateMeasurementsSignal.asReadonly();

  // ==================== Temperature Measurements ====================
  private readonly temperatureMeasurementsSignal = signal<Map<number, TemperatureMeasurement[]>>(new Map());
  readonly temperatureMeasurements = this.temperatureMeasurementsSignal.asReadonly();

  // ==================== Oxygen Measurements ====================
  private readonly oxygenMeasurementsSignal = signal<Map<number, OxygenMeasurement[]>>(new Map());
  readonly oxygenMeasurements = this.oxygenMeasurementsSignal.asReadonly();

  // ==================== Loading States ====================
  private readonly loadingDevicesSignal = signal<boolean>(false);
  readonly loadingDevices = this.loadingDevicesSignal.asReadonly();
  
  private readonly loadingAlertsSignal = signal<boolean>(false);
  readonly loadingAlerts = this.loadingAlertsSignal.asReadonly();
  
  private readonly loadingMeasurementsSignal = signal<boolean>(false);
  readonly loadingMeasurements = this.loadingMeasurementsSignal.asReadonly();

  // ==================== Error States ====================
  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  constructor(private deviceApi: DeviceApi) {}

  // ==================== Device Operations ====================

  /**
   * Load all devices
   */
  loadAllDevices(): void {
    this.loadingDevicesSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.getAllDevices().subscribe({
      next: (devices) => {
        this.devicesSignal.set(devices);
        this.loadingDevicesSignal.set(false);
        console.log('✅ DeviceStore: Loaded', devices.length, 'devices');
      },
      error: (error) => {
        this.errorSignal.set('Error loading devices: ' + error.message);
        this.loadingDevicesSignal.set(false);
        console.error('❌ DeviceStore: Error loading devices:', error);
      }
    });
  }

  /**
   * Load device by ID and set as selected
   */
  loadDeviceById(deviceId: number): void {
    this.loadingDevicesSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.getDeviceById(deviceId).subscribe({
      next: (device) => {
        this.selectedDeviceSignal.set(device);
        // Also update in devices array
        const devices = this.devicesSignal();
        const index = devices.findIndex(d => d.id === deviceId);
        if (index >= 0) {
          devices[index] = device;
          this.devicesSignal.set([...devices]);
        } else {
          this.devicesSignal.set([...devices, device]);
        }
        this.loadingDevicesSignal.set(false);
        console.log('✅ DeviceStore: Loaded device', deviceId);
      },
      error: (error) => {
        this.errorSignal.set('Error loading device: ' + error.message);
        this.loadingDevicesSignal.set(false);
        console.error('❌ DeviceStore: Error loading device:', error);
      }
    });
  }

  /**
   * Create a new device
   */
  createDevice(model: string, holderId: number, holderType: string): void {
    this.loadingDevicesSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.createDevice({ model, holderId, holderType }).subscribe({
      next: (device) => {
        this.devicesSignal.update(devices => [...devices, device]);
        this.loadingDevicesSignal.set(false);
        console.log('✅ DeviceStore: Created device', device.id);
      },
      error: (error) => {
        this.errorSignal.set('Error creating device: ' + error.message);
        this.loadingDevicesSignal.set(false);
        console.error('❌ DeviceStore: Error creating device:', error);
      }
    });
  }

  // ==================== Alert Operations ====================

  /**
   * Load all alerts
   */
  loadAllAlerts(): void {
    this.loadingAlertsSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.getAllAlerts().subscribe({
      next: (alerts) => {
        this.alertsSignal.set(alerts);
        this.loadingAlertsSignal.set(false);
        console.log('✅ DeviceStore: Loaded', alerts.length, 'alerts');
      },
      error: (error) => {
        this.errorSignal.set('Error loading alerts: ' + error.message);
        this.loadingAlertsSignal.set(false);
        console.error('❌ DeviceStore: Error loading alerts:', error);
      }
    });
  }

  /**
   * Load alerts by device ID
   */
  loadAlertsByDeviceId(deviceId: number): void {
    this.loadingAlertsSignal.set(true);
    this.errorSignal.set(null);

    console.log(`📡 DeviceStore: Attempting to load alerts for device ${deviceId}`);
    
    this.deviceApi.getAllAlertsByDeviceId(deviceId).subscribe({
      next: (alerts) => {
        // Store in the map
        this.deviceAlertsSignal.update(map => {
          const newMap = new Map(map);
          newMap.set(deviceId, alerts);
          return newMap;
        });
        this.loadingAlertsSignal.set(false);
        console.log('✅ DeviceStore: Loaded', alerts.length, 'alerts for device', deviceId);
      },
      error: (error) => {
        const errorMsg = error?.message || 'Unknown error';
        this.errorSignal.set('Error loading alerts: ' + errorMsg);
        this.loadingAlertsSignal.set(false);
        console.error('❌ DeviceStore: Error loading alerts for device', deviceId, ':', {
          error: error,
          message: errorMsg,
          stack: error?.stack
        });
        
        // If it's a network error, provide helpful message
        if (errorMsg.includes('Network Error') || errorMsg.includes('Unable to connect')) {
          console.warn('⚠️ DeviceStore: Backend connection issue. Please verify:');
          console.warn('  1. Backend server is running');
          console.warn('  2. Backend URL is correct in environment configuration');
          console.warn('  3. CORS is properly configured on the backend');
        }
      }
    });
  }

  /**
   * Get alerts for a specific device (computed)
   */
  getAlertsForDevice(deviceId: number): Signal<Alert[]> {
    return computed(() => {
      const map = this.deviceAlertsSignal();
      return map.get(deviceId) || [];
    });
  }

  // ==================== Blood Pressure Measurements ====================

  /**
   * Load blood pressure measurements for a device
   */
  loadBloodPressureMeasurements(deviceId: number): void {
    this.loadingMeasurementsSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.getAllBloodPressureMeasurements(deviceId).subscribe({
      next: (measurements) => {
        this.bloodPressureMeasurementsSignal.update(map => {
          const newMap = new Map(map);
          newMap.set(deviceId, measurements);
          return newMap;
        });
        this.loadingMeasurementsSignal.set(false);
        console.log('✅ DeviceStore: Loaded', measurements.length, 'BP measurements for device', deviceId);
      },
      error: (error) => {
        this.errorSignal.set('Error loading BP measurements: ' + error.message);
        this.loadingMeasurementsSignal.set(false);
        console.error('❌ DeviceStore: Error loading BP measurements:', error);
      }
    });
  }

  /**
   * Add blood pressure measurement
   */
  addBloodPressureMeasurement(deviceId: number, systolic: number, diastolic: number): void {
    this.loadingMeasurementsSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.addBloodPressureMeasurement(deviceId, {
      systolic,
      diastolic,
      measuredAt: new Date().toISOString()
    }).subscribe({
      next: () => {
        // Reload measurements after adding
        this.loadBloodPressureMeasurements(deviceId);
        console.log('✅ DeviceStore: Added BP measurement to device', deviceId);
      },
      error: (error) => {
        this.errorSignal.set('Error adding BP measurement: ' + error.message);
        this.loadingMeasurementsSignal.set(false);
        console.error('❌ DeviceStore: Error adding BP measurement:', error);
      }
    });
  }

  /**
   * Get blood pressure measurements for a device (computed)
   */
  getBloodPressureMeasurementsForDevice(deviceId: number): Signal<BloodPressureMeasurement[]> {
    return computed(() => {
      const map = this.bloodPressureMeasurementsSignal();
      return map.get(deviceId) || [];
    });
  }

  // ==================== Heart Rate Measurements ====================

  /**
   * Load heart rate measurements for a device
   */
  loadHeartRateMeasurements(deviceId: number): void {
    this.loadingMeasurementsSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.getAllHeartRateMeasurements(deviceId).subscribe({
      next: (measurements) => {
        this.heartRateMeasurementsSignal.update(map => {
          const newMap = new Map(map);
          newMap.set(deviceId, measurements);
          return newMap;
        });
        this.loadingMeasurementsSignal.set(false);
        console.log('✅ DeviceStore: Loaded', measurements.length, 'HR measurements for device', deviceId);
      },
      error: (error) => {
        this.errorSignal.set('Error loading HR measurements: ' + error.message);
        this.loadingMeasurementsSignal.set(false);
        console.error('❌ DeviceStore: Error loading HR measurements:', error);
      }
    });
  }

  /**
   * Add heart rate measurement
   */
  addHeartRateMeasurement(deviceId: number, bpm: number): void {
    this.loadingMeasurementsSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.addHeartRateMeasurement(deviceId, {
      bpm,
      measuredAt: new Date().toISOString()
    }).subscribe({
      next: () => {
        this.loadHeartRateMeasurements(deviceId);
        console.log('✅ DeviceStore: Added HR measurement to device', deviceId);
      },
      error: (error) => {
        this.errorSignal.set('Error adding HR measurement: ' + error.message);
        this.loadingMeasurementsSignal.set(false);
        console.error('❌ DeviceStore: Error adding HR measurement:', error);
      }
    });
  }

  /**
   * Get heart rate measurements for a device (computed)
   */
  getHeartRateMeasurementsForDevice(deviceId: number): Signal<HeartRateMeasurement[]> {
    return computed(() => {
      const map = this.heartRateMeasurementsSignal();
      return map.get(deviceId) || [];
    });
  }

  // ==================== Temperature Measurements ====================

  /**
   * Load temperature measurements for a device
   */
  loadTemperatureMeasurements(deviceId: number): void {
    this.loadingMeasurementsSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.getAllTemperatureMeasurements(deviceId).subscribe({
      next: (measurements) => {
        this.temperatureMeasurementsSignal.update(map => {
          const newMap = new Map(map);
          newMap.set(deviceId, measurements);
          return newMap;
        });
        this.loadingMeasurementsSignal.set(false);
        console.log('✅ DeviceStore: Loaded', measurements.length, 'temp measurements for device', deviceId);
      },
      error: (error) => {
        this.errorSignal.set('Error loading temp measurements: ' + error.message);
        this.loadingMeasurementsSignal.set(false);
        console.error('❌ DeviceStore: Error loading temp measurements:', error);
      }
    });
  }

  /**
   * Add temperature measurement
   */
  addTemperatureMeasurement(deviceId: number, temperature: number): void {
    this.loadingMeasurementsSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.addTemperatureMeasurement(deviceId, {
      celsius: temperature,  // El backend espera "celsius"
      measuredAt: new Date().toISOString()
    }).subscribe({
      next: () => {
        this.loadTemperatureMeasurements(deviceId);
        console.log('✅ DeviceStore: Added temp measurement to device', deviceId);
      },
      error: (error) => {
        this.errorSignal.set('Error adding temp measurement: ' + error.message);
        this.loadingMeasurementsSignal.set(false);
        console.error('❌ DeviceStore: Error adding temp measurement:', error);
      }
    });
  }

  /**
   * Get temperature measurements for a device (computed)
   */
  getTemperatureMeasurementsForDevice(deviceId: number): Signal<TemperatureMeasurement[]> {
    return computed(() => {
      const map = this.temperatureMeasurementsSignal();
      return map.get(deviceId) || [];
    });
  }

  // ==================== Oxygen Measurements ====================

  /**
   * Load oxygen measurements for a device
   */
  loadOxygenMeasurements(deviceId: number): void {
    this.loadingMeasurementsSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.getAllOxygenMeasurements(deviceId).subscribe({
      next: (measurements) => {
        this.oxygenMeasurementsSignal.update(map => {
          const newMap = new Map(map);
          newMap.set(deviceId, measurements);
          return newMap;
        });
        this.loadingMeasurementsSignal.set(false);
        console.log('✅ DeviceStore: Loaded', measurements.length, 'O2 measurements for device', deviceId);
      },
      error: (error) => {
        this.errorSignal.set('Error loading O2 measurements: ' + error.message);
        this.loadingMeasurementsSignal.set(false);
        console.error('❌ DeviceStore: Error loading O2 measurements:', error);
      }
    });
  }

  /**
   * Add oxygen measurement
   */
  addOxygenMeasurement(deviceId: number, saturation: number): void {
    this.loadingMeasurementsSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.addOxygenMeasurement(deviceId, {
      spo2: saturation,  // El backend espera "spo2"
      measuredAt: new Date().toISOString()
    }).subscribe({
      next: () => {
        this.loadOxygenMeasurements(deviceId);
        console.log('✅ DeviceStore: Added O2 measurement to device', deviceId);
      },
      error: (error) => {
        this.errorSignal.set('Error adding O2 measurement: ' + error.message);
        this.loadingMeasurementsSignal.set(false);
        console.error('❌ DeviceStore: Error adding O2 measurement:', error);
      }
    });
  }

  /**
   * Get oxygen measurements for a device (computed)
   */
  getOxygenMeasurementsForDevice(deviceId: number): Signal<OxygenMeasurement[]> {
    return computed(() => {
      const map = this.oxygenMeasurementsSignal();
      return map.get(deviceId) || [];
    });
  }

  // ==================== Utility Methods ====================

  /**
   * Load all measurements for a device
   */
  loadAllMeasurementsForDevice(deviceId: number): void {
    console.log(`📡 DeviceStore: Attempting to load all measurements for device ${deviceId}`);
    this.loadBloodPressureMeasurements(deviceId);
    this.loadHeartRateMeasurements(deviceId);
    this.loadTemperatureMeasurements(deviceId);
    this.loadOxygenMeasurements(deviceId);
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.devicesSignal.set([]);
    this.selectedDeviceSignal.set(null);
    this.alertsSignal.set([]);
    this.deviceAlertsSignal.set(new Map());
    this.bloodPressureMeasurementsSignal.set(new Map());
    this.heartRateMeasurementsSignal.set(new Map());
    this.temperatureMeasurementsSignal.set(new Map());
    this.oxygenMeasurementsSignal.set(new Map());
    this.errorSignal.set(null);
  }

  /**
   * Clear error
   */
  clearError(): void {
    this.errorSignal.set(null);
  }
}
