export interface DeviceResponse {
  id: number;
  model: string;
  status: string;
  holderId: number;
  holderType: string;
}

export interface CreateDeviceRequest {
  model: string;
  holderId: number;
  holderType: string;
}
