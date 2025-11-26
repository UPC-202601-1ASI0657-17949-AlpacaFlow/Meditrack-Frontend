export interface AlertResponse {
  id: number;
  deviceId: number;
  alertType: string;
  message: string;
  dataRegistered: number;
  registeredAt: string;
}
