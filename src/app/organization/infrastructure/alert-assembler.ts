import { Alert } from "../domain/model/alert.entity";
import { AlertResponse } from "./alert-response";
import { formatVitalTimeLabel, parseMeasuredAt } from "../../shared/utils/vital-chart.utils";

/**
 * AlertAssembler
 * Transforms AlertResponse to Alert entity
 */
export class AlertAssembler {
  static toEntity(response: AlertResponse): Alert {
    const registeredAt = response.registeredAt?.trim() ?? '';
    const registeredDate = parseMeasuredAt(registeredAt);
    const date = Number.isNaN(registeredDate.getTime())
      ? ''
      : registeredDate.toLocaleDateString('en-CA');
    const time = Number.isNaN(registeredDate.getTime())
      ? ''
      : formatVitalTimeLabel(registeredAt);

    return new Alert({
      id: response.id,
      alertTitle: response.alertType,
      alertType: response.alertType,
      deviceId: response.deviceId,
      date,
      time,
      dataRegistered: response.dataRegistered.toString(),
      reason: response.message,
      registeredAt,
    });
  }

  static toEntityList(responses: AlertResponse[]): Alert[] {
    return responses.map(response => this.toEntity(response));
  }
}
