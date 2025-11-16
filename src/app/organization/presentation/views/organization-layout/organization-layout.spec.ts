import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrganizationLayout } from './organization-layout';

describe('OrganizationLayout', () => {
  let component: OrganizationLayout;
  let fixture: ComponentFixture<OrganizationLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationLayout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrganizationLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
