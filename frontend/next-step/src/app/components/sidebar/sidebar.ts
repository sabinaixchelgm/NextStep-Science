import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {

  public isCollapsed: boolean = false;

  toggleSidebar() {
  this.isCollapsed = !this.isCollapsed;
  }

}
