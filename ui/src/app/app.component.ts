import { Component } from '@angular/core';
import { NgZone } from '@angular/core';
import * as $ from 'jquery';

import { MatDialog } from '@angular/material/dialog';
import { ErrorAlertComponent } from './error-alert/error-alert.component';
import { CarImageModalComponent } from './car-image-modal/car-image-modal.component';

import { Car } from './models/car';
import { CarService } from './services/car.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  inventoryData: Car[] = new Array();
  inventoryDataToDelete: Car[] = new Array();
  sortByColumnNumber: number | null = null;
  searchValue: string = '';
  currentPage: number = 1;
  rowsPerPage: number = 5;

  constructor(
    private carService: CarService,
    private dialog: MatDialog, 
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    let _this = this;
    $(function() {
      _this.initializeTable();

      $('#add-row-btn').click(function() {
        let newCar = new Car();
        newCar.dbStatus = 'add';
        _this.inventoryData.push(newCar);
        _this.goToLastPage();
        _this.generateTable();
      });

      $('#edit-btn').click(function() {
        _this.startEditing();
      });

      $('#save-btn').click(function() {
        if (!_this.saveDataToDB()) {
          return;
        }
        _this.doneEditing();
      });

      $('#cancel-btn').click(function() {
        _this.initializeTable();
        _this.doneEditing();
      });

      $('th').click(function() {
        let columnHeaderId = $(this).attr('id');
        _this.sortByColumnNumber = Number(columnHeaderId?.substring(
          columnHeaderId.length - 1,
          columnHeaderId.length
        ));
        _this.toggleSortIcon(this);
        _this.sort(_this.sortByColumnNumber, $(this).find('i').hasClass('fa-sort-up'));
        _this.generateTable();
      });

      $('td').keypress(function(event) {
        return event.key != 'Enter';
      })

      $('#searchbar-field').keyup((event) => {
        if (event.key == 'Enter') {
          _this.searchInputHandler()
        }
      });

      $('#search-btn').click(() => _this.searchInputHandler());

      $('#clear-search-btn').click(function() {
        _this.searchValue = '';
        $('#searchbar-field').val('');
        _this.setAllRowsToSearchVisible();
        _this.generateTable();
      });

      $('#next-page-btn').click(function() {
        if (!_this.isPageOnTopEdgeOfBounds()) {
          _this.currentPage++;
          _this.generateTable();
        }
      });

      $('#prev-page-btn').click(function() {
        if (!_this.isPageOnBottomEdgeOfBounds()) {
          _this.currentPage--;
          _this.generateTable();
        }
      });

      $('#rows-per-page-field')
        .change(() => _this.rowsPerPageInputHandler())
        .keyup((event) => {
          if (($('#rows-per-page-field').val() as string) == '0') {
            $('#rows-per-page-field').val(_this.rowsPerPage);
          }
          else if (event.keyCode != 37 && event.keyCode != 39) {
            _this.rowsPerPageInputHandler();
          }
        })
        .keypress(function(event) {
          return (event.key == '1' || event.key == '2' || event.key == '3' || event.key == '4' || event.key == '5' || event.key == '6' || event.key == '7' || event.key == '8' || event.key == '9' || event.key == '0') && !(event.key == '0' && ($(this).val() as string).length == 0);
        })
        .blur(function() {
          if (($(this).val() as string) == '0' || ($(this).val() as string).length == 0) {
            $(this).val(_this.rowsPerPage);
          }
        });
    });
  }

  initializeTable() {
    this.populateInventoryData(() => {
      this.loadHeadingIds();
      this.generateTable();
    });
  }

  populateInventoryData(callback: Function) {
    this.inventoryData = new Array();
    this.carService.getCars((data: any) => {
      for (let i = 0; i < data.cars.length; i++) {
        let newCar = new Car();

        newCar.vin = data.cars[i].vin;
        newCar.brand = data.cars[i].brand;
        newCar.model = data.cars[i].model;
        newCar.color = data.cars[i].color;
        newCar.year = (data.cars[i].year != null) ? Number(data.cars[i].year) : null;
        newCar.mileage = (data.cars[i].mileage != null) ? Number(data.cars[i].mileage) : null;
        newCar.price = (data.cars[i].price != null) ? Number(data.cars[i].price) : null;
        newCar.image = data.cars[i].image;

        this.inventoryData.push(newCar);
      }
      callback();
    });
  }

  loadHeadingIds() {
    let headings = document.querySelectorAll('th');
    for (let i = 0; i < headings.length; i++) {
      $(headings[i]).attr('id', 'column-header-' + i);
    }
  }

  generateTable() {
    this.updatePagination();
    $('tbody').html('');
    for (let i = 0; i < this.inventoryData.length; i++) {
      if (this.isInventoryVisible(i)) {
        $('tbody').append(this.generateRow(this.inventoryData[i], i));
      }
    }
    this.addDeleteButtonHandlers();
    this.addUpdateCellHandlers();
    this.addRowDetailsHandlers();
    this.adjustHoverEffect();
    if (this.sortByColumnNumber != null) {
      this.highlightSortByColumn(this.sortByColumnNumber);
    }
  }

  generateRow(data: any, rowNumber: number) {
    let row = '<tr>';
    for (let i = 0; i < document.querySelectorAll('th').length; i++) {
      row += '<td class="column-data-' + i + '" align-middle"';
      row += (this.isEditable() && i != 0) || (i == 0 && this.inventoryData[rowNumber].dbStatus == 'add') ? ' contenteditable="true"' : '';
      row += '>';
      row += this.generateCellContents(data, i);
      row += '</td>';
    }
    row += '<td class="button-cell align-middle'
    row += this.isEditable() ? '" contenteditable="false"' : ' d-none"';
    row += '>';
    row += '<button class="btn btn-danger delete-btn"> \
              <i class="fas fa-trash"></i> \
            </button>';
    row += '</td>';
    row += '</tr>';
    return row;
  }

  generateCellContents(data: any, i: number) {
    let cell = '';
    switch (i) {
      case 0: cell += data.vin || ''; break;
      case 1: cell += data.brand || ''; break;
      case 2: cell += data.model || ''; break;
      case 3: cell += data.color || ''; break;
      case 4: cell += (data.year != null) ? data.year : ''; break;
      case 5: cell += (data.mileage != null) ? data.mileage.toLocaleString() : ''; break;
      case 6: cell += (data.price != null) ? '$' + data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''; break;
    }
    return cell;
  }

  addRowDetailsHandlers() {
    if (!this.isEditable()) {
      let _this = this;
      $('tbody tr').off('click').click(function() {
        let inventoryIndex = _this.getInventoryIndexOfRow($(this).parent().children().index($(this)));
        _this.ngZone.run(() => {
          let dialogRef = _this.dialog.open(CarImageModalComponent, {
            data: {
              image: _this.inventoryData[inventoryIndex].image,
              label: (_this.inventoryData[inventoryIndex].brand ? _this.inventoryData[inventoryIndex].brand : '') + ' ' + (_this.inventoryData[inventoryIndex].model ? _this.inventoryData[inventoryIndex].model : ''),
              vin: _this.inventoryData[inventoryIndex].vin 
            },
            width: '50%'
          });
          dialogRef.afterClosed().subscribe((image) => {
            _this.inventoryData[inventoryIndex].image = image;
          });
        });
      })
    }
  }

  isEditable() {
    return $('#edit-btn').hasClass('d-none');
  }

  isInventoryVisible(inventoryIndex: number) {
    return this.isInventorySearchVisible(inventoryIndex) && this.isInventoryPageVisible(inventoryIndex);
  }

  isInventorySearchVisible(inventoryIndex: number) {
    return this.inventoryData[inventoryIndex].toDisplaySearch;
  }

  isInventoryPageVisible(inventoryIndex: number) {
    return this.inventoryData[inventoryIndex].toDisplayPage;
  }

  adjustHoverEffect() {
    this.isEditable() ? $('tbody tr').removeClass('hover') : $('tbody tr').addClass('hover');
  }

  addUpdateCellHandlers() {
    let _this = this;
    let originalCellContent: string;
    $('td')
      .focus(function() {
        originalCellContent = $(this).text();
        let inventoryIndex = _this.getInventoryIndexOfRow($(this).parent().parent().children().index($(this).parent()));
        if (_this.inventoryData[inventoryIndex].dbStatus != 'add') {
          _this.inventoryData[inventoryIndex].dbStatus = 'update';
        }
      })
      .blur(function() {
        let cellContent = $(this).text();
        let columnNumber = $(this).attr('class')?.split(' ')[0].split('-')[2];
        let inventoryIndex = _this.getInventoryIndexOfRow($(this).parent().parent().children().index($(this).parent()));
        if (!_this.validateInput(cellContent, Number(columnNumber), inventoryIndex)) {
          $(this).text(originalCellContent);
          _this.inventoryData[inventoryIndex].dbStatus = null;
          _this.openErrorAlert('Invalid input. Please try again.');
          return;
        } 
        _this.updateInventoryData(inventoryIndex, Number(columnNumber), cellContent);
        _this.formatCellOnUpdate(this, Number(columnNumber), inventoryIndex);
      });
  }

  validateInput(value: string, columnNumber: number, inventoryIndex: number) {
    if (value == '') {
      return true;
    }
    let regex;
    switch (columnNumber) {
      case 0: regex = /^[a-zA-Z\d]{17}$/; break;
      case 1: case 2: regex = /^[a-zA-Z\d ]*$/; break;
      case 3: regex = /^[a-zA-Z ]*$/; break;
      case 4: regex = /^([1-2]\d{3})$/; break;
      case 5: case 7: regex = /^(\d+|\d{1,3}(,\d{3})*)$/; break;
      case 6: regex = /^(\$?(\d+|\d{1,3}(,\d{3})*)(\.\d{2})?)$/; break;
    }
    let regexCheck = regex?.test(value);
    let uniqueCheck = (columnNumber === 0) ? this.isUniqueVIN(value, inventoryIndex) : true;
    return regexCheck && uniqueCheck;
  }

  openErrorAlert(message: string) {
    this.ngZone.run(() => {
      this.dialog.open(ErrorAlertComponent, {
        data: {
          message: message
        },
        width: '325px',
        height: '175px'
      });
    });
  }

  updateInventoryData(inventoryIndex: number, columnNumber: number, cellContent: string) {
    switch (columnNumber)
    {
      case 0: this.inventoryData[inventoryIndex].vin = cellContent ? cellContent.toUpperCase() : null; break;
      case 1: this.inventoryData[inventoryIndex].brand = cellContent ? cellContent : null; break;
      case 2: this.inventoryData[inventoryIndex].model = cellContent ? cellContent : null; break;
      case 3: this.inventoryData[inventoryIndex].color = cellContent ? cellContent : null; break;
      case 4: this.inventoryData[inventoryIndex].year = cellContent ? Number(cellContent) : null; break;
      case 5: this.inventoryData[inventoryIndex].mileage = cellContent ? Number(cellContent.replace(/[,]/g, '')) : null; break;
      case 6: this.inventoryData[inventoryIndex].price = cellContent ? Number(cellContent.replace(/[$,]/g, '')) : null; break;
    }
  }

  formatCellOnUpdate(cell: any, columnNumber: number, inventoryIndex: number) {
    switch (columnNumber) {
      case 0:
        $(cell).text(
          (this.inventoryData[inventoryIndex].vin != null) ? 
          this.inventoryData[inventoryIndex].vin as string : 
          ''
        );
        break;
      case 5:
        $(cell).text(
          (this.inventoryData[inventoryIndex].mileage != null) ? 
          Number(this.inventoryData[inventoryIndex].mileage).toLocaleString() : 
          ''
        );
        break;
      case 6:
        $(cell).text(
          (this.inventoryData[inventoryIndex].price != null) ? 
          '$' + Number(this.inventoryData[inventoryIndex].price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) :
          ''
        );
        break;
    }
  }

  isUniqueVIN(vin: string, inventoryIndex: number) {
    for (let i = 0; i < this.inventoryData.length; i++) {
      if (this.inventoryData[i].vin == vin.toUpperCase() && i != inventoryIndex) {
        return false;
      }
    }
    return true;
  }

  addDeleteButtonHandlers() {
    let _this = this;
    $('.delete-btn').off('click').click(function() {
      let inventoryIndex = _this.getInventoryIndexOfRow($(this).parent().parent().parent().children().index($(this).parent().parent()));
      let deletedCar = _this.inventoryData.splice(inventoryIndex, 1)[0];
      if (deletedCar.dbStatus != 'add') {
        _this.inventoryDataToDelete.push(deletedCar);
      }
      _this.adjustPageIfEmpty();
      _this.generateTable();
    });
  }
  
  startEditing() {
    $('#save-btn, #cancel-btn, .button-cell').removeClass('d-none');
    $('#edit-btn').addClass('d-none');
    $('.button-container').addClass('button-container-editable');
    $('table').removeClass('table-hover');
    $('table').addClass('table-bordered');
    this.adjustHoverEffect();
    $('td').attr({
      contenteditable: 'true'
    });
    $('.column-data-0, .button-cell').attr({
      contenteditable: 'false'
    });
    $('tbody tr').off('click');
  }

  doneEditing() {
    $('#save-btn, #cancel-btn, .button-cell').addClass('d-none');
    $('#edit-btn').removeClass('d-none');
    $('.button-container').removeClass('button-container-editable');
    $('table').addClass('table-hover');
    $('table').removeClass('table-bordered');
    this.adjustHoverEffect();
    $('td').attr({
      contenteditable: 'false'
    });
    this.addRowDetailsHandlers();
    this.setRowVisibilityBySearch();
    if (this.sortByColumnNumber) {
      this.sort(this.sortByColumnNumber, $('#column-header-' + this.sortByColumnNumber).find('i').hasClass('fa-sort-up'));
    }
    this.adjustPageIfEmpty();
    this.generateTable();
  }

  saveDataToDB() {
    for (let i = 0; i < this.inventoryData.length; i++) {
      if (!this.inventoryData[i].vin) {
        this.openErrorAlert('VIN is required. Please try again.');
        return false;
      }
      if (this.inventoryData[i].dbStatus == 'add') {
        this.carService.addCar(this.inventoryData[i]);
      } else if (this.inventoryData[i].dbStatus == 'update') {
        this.carService.updateCar(this.inventoryData[i], this.inventoryData[i].vin as string);
      }
      this.inventoryData[i].dbStatus = null;
    }
    for (let i = 0; i < this.inventoryDataToDelete.length; i++) {
      this.carService.deleteCar(this.inventoryDataToDelete[i].vin as string);
    }
    this.inventoryDataToDelete = new Array();
    return true;
  }

  sort(columnNumber: number, isAscending: boolean) {
    for (let i = 0; i < this.inventoryData.length - 1; i++) {
      for (let j = 0; j < this.inventoryData.length - i - 1; j++) {
        if (this.shouldSwap(j, columnNumber, isAscending)) {
          let temp = this.inventoryData[j];
          this.inventoryData[j] = this.inventoryData[j + 1];
          this.inventoryData[j + 1] = temp;
        }
      }
    }
  }

  shouldSwap(inventoryIndex: number, columnNumber: number, isAscending: boolean) {
    let curr: any = this.inventoryData[inventoryIndex];
    let next: any = this.inventoryData[inventoryIndex + 1];
    switch (columnNumber) {
      case 0: curr = curr.vin; next = next.vin; break;
      case 1: curr = curr.brand; next = next.brand; break;
      case 2: curr = curr.model; next = next.model; break;
      case 3: curr = curr.color; next = next.color; break;
      case 4: curr = curr.year; next = next.year; break;
      case 5: curr = curr.mileage; next = next.mileage; break;
      case 6: curr = curr.price; next = next.price; break;
    }
    if (columnNumber < 4) {
      curr = curr ? curr.toLowerCase() : this.subInfinityForBlanksInSort(isAscending, true);
      next = next ? next.toLowerCase() : this.subInfinityForBlanksInSort(isAscending, true);
    }
    else {
      curr = curr ? Number(curr) : this.subInfinityForBlanksInSort(isAscending, false);
      next = next ? Number(next) : this.subInfinityForBlanksInSort(isAscending, false);
    }
    return isAscending ? curr > next : curr < next;
  }

  subInfinityForBlanksInSort(isAscending: boolean, isChar: boolean) {
    if (isChar) {
      return isAscending ? '\uFFFF' : '\u0000';
    }
    else {
      return isAscending ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    }
  }

  highlightSortByColumn(columnNumber: number) {
    document.querySelectorAll('th').forEach(function(header) {
      $(header).removeClass('sort-by-header');
    });
    $('#column-header-' + columnNumber).addClass('sort-by-header');
    document.querySelectorAll('td').forEach(function(cell) {
      $(cell).removeClass('sort-by-cell');
    });
    document.querySelectorAll('.column-data-' + columnNumber).forEach(function(cell) {
      $(cell).addClass('sort-by-cell');
    });
  }

  toggleSortIcon(_this: any) {
    if ($(_this).find('i').hasClass('fa-sort')) {
      document.querySelectorAll('.sort-icon').forEach(function(header) {
        $(header)
          .addClass('fa-sort')
          .removeClass('fa-sort-up')
          .removeClass('fa-sort-down');
      });
      $(_this).find('i').removeClass('fa-sort').addClass('fa-sort-up');
    } else {
      $(_this)
        .find('i')
        .toggleClass('fa-sort-up')
        .toggleClass('fa-sort-down');
    }
  }

  searchInputHandler() {
    this.setSearchValue();
    this.setRowVisibilityBySearch();
    this.adjustPageIfEmpty();
    this.generateTable();
  }

  setRowVisibilityBySearch() {
    this.setAllRowsToSearchVisible();
    if (this.searchValue.length == 0) {
      return;
    }
    for (let i = 0; i < this.inventoryData.length; i++) {
      if (!this.inventoryData[i].contains(this.searchValue)) {
        this.inventoryData[i].toDisplaySearch = false;
      }
    }
  }

  setAllRowsToSearchVisible() {
    for (let i = 0; i < this.inventoryData.length; i++) {
      this.inventoryData[i].toDisplaySearch = true;
    }
  }

  setSearchValue() {
    this.searchValue = ($('#searchbar-field').val() as string).trim();
  }

  updatePagination() {
    $('#current-page').text(this.currentPage);
    $('#rows-per-page-field').val(this.rowsPerPage);
    $('#prev-page-btn').removeAttr('disabled');
    $('#next-page-btn').removeAttr('disabled');
    if (this.isPageOnBottomEdgeOfBounds()) {
      $('#prev-page-btn').attr('disabled', 'disabled');
    }
    if (this.isPageOnTopEdgeOfBounds()) {
      $('#next-page-btn').attr('disabled', 'disabled');
    }
    this.setRowVisibilityByPage();
  }

  setRowVisibilityByPage() {
    this.setAllRowsToPageVisible();
    let k = 0;
    for (let i = 0; i < this.inventoryData.length; i++) {
      if (k < this.getFirstItemOnPage() || k > this.getLastItemOnPage()) {
        this.inventoryData[i].toDisplayPage = false;
      }
      if (this.inventoryData[i].toDisplaySearch) {
        k++;
      }
    } 
  }

  setAllRowsToPageVisible() {
    for (let i = 0; i < this.inventoryData.length; i++) {
      this.inventoryData[i].toDisplayPage = true;
    }
  }

  rowsPerPageInputHandler() {
    let input = Number($('#rows-per-page-field').val());
    if (input > 0) {
      this.rowsPerPage = input;
      this.adjustPageIfEmpty();
      this.generateTable();
    }
  }

  goToLastPage() {
    this.currentPage = Math.ceil(this.getEnabledInventoryCount() / this.rowsPerPage);
  }

  adjustPageIfEmpty() {
    if (this.isPageEmpty() && this.currentPage > 1) {
      this.currentPage--;
    }
  }

  isPageEmpty() {
    return this.currentPage > Math.ceil(this.getEnabledInventoryCount() / this.rowsPerPage);
  }

  getFirstItemOnPage() {
    return (this.currentPage - 1) * this.rowsPerPage;
  }

  getLastItemOnPage() {
    return this.getFirstItemOnPage() + this.rowsPerPage - 1;
  }

  isPageOnBottomEdgeOfBounds() {
    return this.currentPage <= 1;
  }

  isPageOnTopEdgeOfBounds() {
    return this.getLastItemOnPage() >= (this.getEnabledInventoryCount() - 1);
  }

  getEnabledInventoryCount() {
    let count = 0;
    for (let i = 0; i < this.inventoryData.length; i++) {
      if (this.inventoryData[i].toDisplaySearch) {
        count++;
      }
    }
    return count;
  }

  getInventoryIndexOfRow(rowNumber: number) {
    let count = 0;
    for (let i = 0; i < this.inventoryData.length; i++) {
      if (this.isInventorySearchVisible(i)) {
        count++;
      }
      if (count == (this.getFirstItemOnPage() + rowNumber + 1)) {
        return i;
      }
    }
    return -1;
  }

}
