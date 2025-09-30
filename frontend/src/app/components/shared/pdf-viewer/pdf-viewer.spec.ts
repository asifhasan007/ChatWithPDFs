import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfViewer } from './pdf-viewer';

describe('PdfViewer', () => {
  let component: PdfViewer;
  let fixture: ComponentFixture<PdfViewer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfViewer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfViewer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
