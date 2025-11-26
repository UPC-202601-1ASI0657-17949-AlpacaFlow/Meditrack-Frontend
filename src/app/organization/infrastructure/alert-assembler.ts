import { Alert } from "../domain/model/alert.entity";
import { AlertResponse } from "./alert-response";

/**
 * AlertAssembler
 * Transforms AlertResponse to Alert entity
 */
export class AlertAssembler {
  static toEntity(response: AlertResponse): Alert {
    // Parse the registeredAt to extract date and time
    const registeredDate = new Date(response.registeredAt);
    const date = registeredDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    const time = registeredDate.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    return new Alert({
      id: response.id,
      alertTitle: response.alertType,
      date: date,
      time: time,
      dataRegistered: response.dataRegistered.toString(),
      reason: response.message
    });
  }

  static toEntityList(responses: AlertResponse[]): Alert[] {
    return responses.map(response => this.toEntity(response));
  }
}
