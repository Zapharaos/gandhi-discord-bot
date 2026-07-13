import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ShellChromeComponent } from './shell-chrome.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [ShellChromeComponent, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-shell-chrome><router-outlet /></app-shell-chrome>`,
})
export class ShellComponent {}
