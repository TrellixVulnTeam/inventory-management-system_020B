import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { MatDialogModule } from '@angular/material/dialog';

import { AppComponent } from './app.component';
import { CarDetailsComponent } from './car-details/car-details.component';
import { InvalidInputAlertComponent } from './invalid-input-alert/invalid-input-alert.component';

@NgModule({
  declarations: [
    AppComponent,
    CarDetailsComponent,
    InvalidInputAlertComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatDialogModule,
    HttpClientModule
  ],
  entryComponents: [
    CarDetailsComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
