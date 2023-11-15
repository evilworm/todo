import { Component, OnInit } from '@angular/core';
import { ConnService } from '../../conn/conn.service';

@Component({
  selector: 'app-connection',
  templateUrl: './connection.component.html',
  styleUrls: ['./connection.component.scss'],
})
export class ConnectionComponent implements OnInit {
  isConnected: boolean = false;

  constructor(private readonly conn: ConnService) {}
  ngOnInit(): void {
    this.conn.connectionState$.subscribe((state) => {
      this.isConnected = state;
    });
  }
}
