import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { OrganizationStore } from '../../../application/organization.store';
import { SeniorCitizen } from "../../../domain/model/senior-citizen.entity";

@Component({
  selector: 'app-senior-citizen-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatInputModule, TranslatePipe],
  templateUrl: './senior-citizen-form.html',
  styleUrls: ['./senior-citizen-form.css']
})
export class SeniorCitizenForm implements OnChanges {
  @Input() seniorCitizen: SeniorCitizen | null = null;
  @Output() saved = new EventEmitter<SeniorCitizen>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;
  localError: string | null = null;

  constructor(
    private fb: FormBuilder, 
    public organizationStore: OrganizationStore,
    private translate: TranslateService
  ) {
    // Get organizationId from store (patrón de relatives)
    const organizationId = this.organizationStore.getCurrentOrganizationId() || 0;
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      birthDate: ['', Validators.required],
      gender: ['', Validators.required],
      weight: [null, [Validators.required, Validators.min(0)]],
      height: [null, [Validators.required, Validators.min(0)]],
      dni: ['', Validators.required],
      imageUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)]],
      deviceId: [null, [Validators.required, Validators.min(1)]],
      organizationId: [organizationId] // Get from store (patrón de relatives)
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['seniorCitizen'] && this.seniorCitizen) {
      // Precargar form si estamos editando
      const birthDateStr = this.seniorCitizen.birthDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      this.form.patchValue({
        firstName: this.seniorCitizen.firstName,
        lastName: this.seniorCitizen.lastName,
        birthDate: birthDateStr,
        age: this.seniorCitizen.age,
        gender: this.seniorCitizen.gender,
        weight: this.seniorCitizen.weight,
        height: this.seniorCitizen.height,
        dni: this.seniorCitizen.dni,
        imageUrl: this.seniorCitizen.imageUrl,
        deviceId: this.seniorCitizen.deviceId,
        organizationId: this.seniorCitizen.organizationId
      });
    } else if (changes['seniorCitizen'] && !this.seniorCitizen) {
      // Limpiar el form si estamos creando un nuevo senior citizen
      // Set organizationId from store (patrón de relatives)
      const organizationId = this.organizationStore.getCurrentOrganizationId() || 0;
      this.form.reset();
      this.form.patchValue({ organizationId });
    }
  }

  onSubmit(): void {
    // Clear any previous errors
    this.localError = null;
    
    if (this.form.invalid) {
      // Marcar todos los campos como touched para mostrar errores
      this.form.markAllAsTouched();
      return;
    }

    // Get organizationId from store at submit time to ensure it's always correct
    // Patrón de relatives: userId → organizationId (a través del store)
    const organizationId = this.organizationStore.getCurrentOrganizationId();
    if (!organizationId || organizationId === 0) {
      this.localError = 'Cannot create senior citizen: No organization context available. Please select an organization.';
      console.error(this.localError);
      return;
    }

    // Validate deviceId before creating SeniorCitizen entity
    const deviceId = Number(this.form.value.deviceId);
    const MAX_SAFE_INTEGER = 9007199254740991; // Number.MAX_SAFE_INTEGER
    
    if (isNaN(deviceId) || deviceId <= 0) {
      this.localError = 'Device ID must be a positive number';
      return;
    }
    
    if (deviceId > MAX_SAFE_INTEGER) {
      this.localError = this.translate.instant('senior-citizen.deviceIdTooLarge', {
        maxValue: MAX_SAFE_INTEGER.toLocaleString()
      });
      return;
    }

    const seniorCitizen = new SeniorCitizen({
      id: this.seniorCitizen ? this.seniorCitizen.id : 0,
      organizationId: organizationId, // Use from user context, not form value
      firstName: this.form.value.firstName,
      lastName: this.form.value.lastName,
      birthDate: this.form.value.birthDate, // Will be converted to Date in constructor
      age: this.form.value.age ? Number(this.form.value.age) : undefined, // Optional, calculated from birthDate
      gender: this.form.value.gender,
      weight: Number(this.form.value.weight),
      height: Number(this.form.value.height),
      dni: this.form.value.dni,
      imageUrl: this.form.value.imageUrl || '/assets/default-senior-citizen.png',
      deviceId: deviceId
    });

    // Log para verificar que el organizationId se está estableciendo correctamente
    console.log(`📝 Creating/updating senior citizen with organizationId: ${organizationId}`, seniorCitizen);
    
    if (this.seniorCitizen) {
      // Actualizar senior citizen existente
      this.organizationStore.updateSeniorCitizen(seniorCitizen);
    } else {
      // Crear nuevo senior citizen
      // Usar el mismo patrón que doctor-form: llamar al store y emitir inmediatamente
      // La lista recargará desde el backend en onSeniorCitizenSaved
      this.organizationStore.addSeniorCitizen(seniorCitizen);
    }
    
    // Emitir inmediatamente (igual que doctor-form)
    // La lista recargará desde el backend para obtener los datos actualizados
    this.saved.emit(seniorCitizen);
  }

  onCancel(): void {
    this.localError = null;
    this.cancel.emit();
  }
}
