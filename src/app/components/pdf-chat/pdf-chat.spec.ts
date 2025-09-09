import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfChat } from './pdf-chat';

describe('PdfChat', () => {
  let component: PdfChat;
  let fixture: ComponentFixture<PdfChat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfChat]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfChat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
