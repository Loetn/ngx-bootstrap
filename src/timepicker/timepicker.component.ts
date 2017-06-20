/* tslint:disable:no-forward-ref max-file-line-count */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  forwardRef,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { TimepickerActions } from './reducer/timepicker.actions';
import { TimepickerStore } from './reducer/timepicker.store';
import { getControlsValue } from './timepicker-controls.util';
import { TimepickerConfig } from './timepicker.config';
import { TimeChangeSource, TimepickerComponentState, TimepickerControls } from './timepicker.models';
import { isValidDate, padNumber, parseTime } from './timepicker.utils';

export const TIMEPICKER_CONTROL_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  // tslint:disable-next-line
  useExisting: forwardRef(() => TimepickerComponent),
  multi: true
};

@Component({
  selector: 'timepicker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TIMEPICKER_CONTROL_VALUE_ACCESSOR, TimepickerStore],
  template: `
    <table>
      <tbody>
      <tr class="text-center" [class.hidden]="!isSpinnersVisible">
        <!-- increment hours button-->
        <td>
          <a class="btn btn-link" [class.disabled]="!canIncrementHours"
             (click)="changeHours(hourStep)">
            <span class="glyphicon glyphicon-chevron-up"></span>
          </a>
        </td>
        <!-- divider -->
        <td>&nbsp;&nbsp;&nbsp;</td>
        <!-- increment minutes button -->
        <td>
          <a class="btn btn-link" [class.disabled]="!canIncrementMinutes"
             (click)="changeMinutes(minuteStep)">
            <span class="glyphicon glyphicon-chevron-up"></span>
          </a>
        </td>
        <!-- divider -->
        <td *ngIf="showSeconds">&nbsp;</td>
        <!-- increment seconds button -->
        <td *ngIf="showSeconds">
          <a class="btn btn-link" [class.disabled]="!canIncrementSeconds"
             (click)="changeSeconds(secondsStep)">
            <span class="glyphicon glyphicon-chevron-up"></span>
          </a>
        </td>
        <!-- space between -->
        <td>&nbsp;&nbsp;&nbsp;</td>
        <!-- meridian placeholder-->
        <td *ngIf="showMeridian"></td>
      </tr>
      <tr>
        <!-- hours -->
        <td class="form-group" [class.has-error]="invalidHours">
          <input type="text" style="width:50px;"
                 class="form-control text-center"
                 placeholder="HH"
                 maxlength="2"
                 #input_hours
                 [readonly]="readonlyInput"
                 [value]="hours"
                 (wheel)="prevDef($event);changeHours(hourStep * wheelSign($event), 'wheel')"
                 (keydown.ArrowUp)="changeHours(hourStep, 'key')"
                 (keydown.ArrowDown)="changeHours(-hourStep, 'key')"
                 (keydown.Enter)="updateHours(input_hours.value)"
                 (change)="updateHours(input_hours.value)"></td>
        <!-- divider -->
        <td>&nbsp;:&nbsp;</td>
        <!-- minutes -->
        <td class="form-group" [class.has-error]="invalidMinutes">
          <input style="width:50px;" type="text"
                 class="form-control text-center"
                 placeholder="MM"
                 maxlength="2"
                 #input_minutes
                 [readonly]="readonlyInput"
                 [value]="minutes"
                 (wheel)="prevDef($event);changeMinutes(minuteStep * wheelSign($event), 'wheel')"
                 (keydown.ArrowUp)="changeMinutes(minuteStep, 'key')"
                 (keydown.ArrowDown)="changeMinutes(-minuteStep, 'key')"
                 (change)="updateMinutes(input_minutes.value)">
        </td>
        <!-- divider -->
        <td *ngIf="showSeconds">&nbsp;:&nbsp;</td>
        <!-- seconds -->
        <td class="form-group" *ngIf="showSeconds" [class.has-error]="invalidSeconds">
          <input style="width:50px;" type="text"
                 class="form-control text-center"
                 placeholder="SS"
                 maxlength="2"
                 #input_seconds
                 [readonly]="readonlyInput"
                 [value]="seconds"
                 (wheel)="prevDef($event);changeSeconds(secondsStep * wheelSign($event), 'wheel')"
                 (keydown.ArrowUp)="changeSeconds(secondsStep, 'key')"
                 (keydown.ArrowDown)="changeSeconds(-secondsStep, 'key')"
                 (change)="updateSeconds(input_seconds.value)">
        </td>
        <!-- space between -->
        <td>&nbsp;&nbsp;&nbsp;</td>
        <!-- meridian -->
        <td *ngIf="showMeridian">
          <button type="button" class="btn btn-default text-center"
                  [disabled]="readonlyInput"
                  [class.disabled]="readonlyInput"
                  (click)="toggleMeridian()">
            {{meridian}}
          </button>
        </td>
      </tr>
      <tr class="text-center" [class.hidden]="!isSpinnersVisible">
        <!-- decrement hours button-->
        <td>
          <a class="btn btn-link" [class.disabled]="!canDecrementHours" (click)="changeHours(-hourStep)">
            <span class="glyphicon glyphicon-chevron-down"></span>
          </a>
        </td>
        <!-- divider -->
        <td>&nbsp;&nbsp;&nbsp;</td>
        <!-- decrement minutes button-->
        <td>
          <a class="btn btn-link" [class.disabled]="!canDecrementMinutes" (click)="changeMinutes(-minuteStep)">
            <span class="glyphicon glyphicon-chevron-down"></span>
          </a>
        </td>
        <!-- divider -->
        <td *ngIf="showSeconds">&nbsp;</td>
        <!-- decrement seconds button-->
        <td *ngIf="showSeconds">
          <a class="btn btn-link" [class.disabled]="!canDecrementSeconds" (click)="changeSeconds(-secondsStep)">
            <span class="glyphicon glyphicon-chevron-down"></span>
          </a>
        </td>
        <!-- space between -->
        <td>&nbsp;&nbsp;&nbsp;</td>
        <!-- meridian placeholder-->
        <td *ngIf="showMeridian"></td>
      </tr>
      </tbody>
    </table>
  `
})
export class TimepickerComponent implements ControlValueAccessor, TimepickerComponentState, TimepickerControls, OnChanges {
  /** hours change step */
  @Input() hourStep: number;
  /** hours change step */
  @Input() minuteStep: number;
  /** seconds change step */
  @Input() secondsStep: number;
  /** if true hours and minutes fields will be readonly */
  @Input() readonlyInput: boolean;
  /** if true scroll inside hours and minutes inputs will change time */
  @Input() mousewheel: boolean;
  /** if true up/down arrowkeys inside hours and minutes inputs will change time */
  @Input() arrowkeys: boolean;
  /** if true spinner arrows above and below the inputs will be shown */
  @Input() showSpinners: boolean;
  @Input() showMeridian: boolean;
  @Input() showSeconds: boolean;

  /** meridian labels based on locale */
  @Input() meridians: string[];

  /** minimum time user can select */
  @Input() min: Date;
  /** maximum time user can select */
  @Input() max: Date;

  // ui variables
  hours: string;
  minutes: string;
  seconds: string;
  meridian: string;

  get isSpinnersVisible(): boolean {
    return this.showSpinners && !this.readonlyInput;
  }

  // min\max validation for input fields
  invalidHours = false;
  invalidMinutes = false;
  invalidSeconds = false;

  // time picker controls state
  canIncrementHours: boolean;
  canIncrementMinutes: boolean;
  canIncrementSeconds: boolean;

  canDecrementHours: boolean;
  canDecrementMinutes: boolean;
  canDecrementSeconds: boolean;

  // control value accessor methods
  onChange: any = Function.prototype;
  onTouched: any = Function.prototype;

  constructor(_config: TimepickerConfig,
              private _cd: ChangeDetectorRef,
              private _store: TimepickerStore,
              private _timepickerActions: TimepickerActions) {
    Object.assign(this, _config);
    // todo: add unsubscribe
    _store
      .select((state) => state.value)
      .subscribe((value) => {
        // update UI values if date changed
        this._renderTime(value);
        this.onChange(value);

        this._store.dispatch(this._timepickerActions.updateControls(getControlsValue(this)));
      });

    _store
      .select((state) => state.controls)
      .subscribe((controlsState) => {
        Object.assign(this, controlsState);
        _cd.markForCheck();
      });
  }

  prevDef($event: any) {
    $event.preventDefault();
  }

  wheelSign($event: any): number {
    return Math.sign($event.deltaY as number) * -1;
  }

  ngOnChanges(changes: SimpleChanges): void {
    this._store.dispatch(this._timepickerActions.updateControls(getControlsValue(this)));
  }

  changeHours(step: number, source: TimeChangeSource): void {
    this._store.dispatch(this._timepickerActions.changeHours({step, source}));
  }

  changeMinutes(step: number, source: TimeChangeSource): void {
    this._store.dispatch(this._timepickerActions.changeMinutes({step, source}));
  }

  changeSeconds(step: number, source: TimeChangeSource): void {
    this._store.dispatch(this._timepickerActions.changeSeconds({step, source}));
  }

  updateHours(hour: string): void {
    const dex = 10;
    const _hoursPerDay = 24;
    const _newHour = parseInt(hour, dex);
    this.hours = hour;

    if (isNaN(_newHour) || _newHour < 0 || _newHour > _hoursPerDay) {
      this.hours = '';
      this.invalidHours = true;
      this.onChange(null);

      return;
    }
    this.invalidHours = false;
    this._store.dispatch(this._timepickerActions
      .setTimeUnit({hour: _newHour % _hoursPerDay}));
  }

  updateMinutes(minute: string) {
    const dex = 10;
    const _minutesPerHour = 60;
    const _newMinute = parseInt(minute, dex);

    if (isNaN(_newMinute) || _newMinute < 0 || _newMinute > _minutesPerHour) {
      this.minutes = '';
      this.invalidMinutes = true;
      this.onChange(null);

      return;
    }

    this.invalidMinutes = false;
    console.log(this.hours);
    this._store.dispatch(this._timepickerActions
      .setTimeUnit({minute: _newMinute % _minutesPerHour}));
  }

  updateSeconds(seconds: string) {
    const dex = 10;
    const _secondsPerMinute = 60;
    const _newSeconds = parseInt(seconds, dex);

    if (isNaN(_newSeconds) || _newSeconds < 0 || _newSeconds > _secondsPerMinute) {
      this.minutes = '';
      this.invalidMinutes = true;

      return;
    }

    this.invalidMinutes = false;
    this._store.dispatch(this._timepickerActions
      .setTimeUnit({seconds: _newSeconds % _secondsPerMinute}));
  }

  toggleMeridian(): void {
    if (!this.showMeridian || this.readonlyInput) {
      return;
    }

    const _hoursPerDayHalf = 12;
    this._store.dispatch(this._timepickerActions.changeHours({step: _hoursPerDayHalf, source: ''}));
  }

  /**
   * Write a new value to the element.
   */
  writeValue(obj: any): void {
    if (isValidDate(obj)) {
      this._store.dispatch(this._timepickerActions.writeValue(parseTime(obj)));
    }
  }

  /**
   * Set the function to be called when the control receives a change event.
   */
  registerOnChange(fn: (_: any) => {}): void {
    this.onChange = fn;
  }

  /**
   * Set the function to be called when the control receives a touch event.
   */
  registerOnTouched(fn: () => {}): void {
    this.onTouched = fn;
  }

  /**
   * This function is called when the control status changes to or from "DISABLED".
   * Depending on the value, it will enable or disable the appropriate DOM element.
   *
   * @param isDisabled
   */
  setDisabledState(isDisabled: boolean): void {
    this.readonlyInput = isDisabled;
  }

  private _renderTime(value: string | Date): void {
    if (!isValidDate(value)) {
      this.hours = '';
      this.minutes = '';
      this.seconds = '';
      this.meridian = this.meridians[0];

      return;
    }

    const _value = parseTime(value);
    const _hoursPerDayHalf = 12;
    let _hours = _value.getHours();

    if (this.showMeridian) {
      this.meridian = this.meridians[_hours >= _hoursPerDayHalf ? 1 : 0];
      _hours = _hours % _hoursPerDayHalf;
      // should be 12 PM, not 00 PM
      if (_hours === 0) {
        _hours = _hoursPerDayHalf;
      }
    }

    this.hours = padNumber(_hours);
    this.minutes = padNumber(_value.getMinutes());
    this.seconds = padNumber(_value.getUTCSeconds());
  }
}
