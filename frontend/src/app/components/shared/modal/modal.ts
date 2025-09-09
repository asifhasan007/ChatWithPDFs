import { Component, Input, Output, EventEmitter } from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-modal',
  imports: [CommonModule], 
templateUrl: './modal.html',
  styleUrl: './modal.scss'
})
export class Modal {

    @Input() isVisible = false;
  @Output() close = new EventEmitter<void>();
}
