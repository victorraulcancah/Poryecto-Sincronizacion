// src\app\layouts\alt-layouts\secondlayout\secondlayout.component.ts
import { Component } from '@angular/core';
import { SecondfooterComponent } from '../secondfooter/secondfooter.component';
import { SecondheaderComponent } from '../secondheader/secondheader.component';
import { RouterOutlet } from '@angular/router';


@Component({
  selector: 'app-secondlayout',
  imports: [SecondfooterComponent, SecondheaderComponent, RouterOutlet],
  templateUrl: './secondlayout.component.html',
  styleUrl: './secondlayout.component.scss'
})
export class SecondlayoutComponent {

}
