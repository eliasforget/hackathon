import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';

type HelloResponse = { message: string; user: string; ts: string };
type HealthResponse = { status: string; timestamp: string };

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Hackathon Angular';
  apiUrl = getApiUrl();
  health = signal<HealthResponse | null>(null);
  hello = signal<HelloResponse | null>(null);
  error = signal<string | null>(null);
  token = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadHealth();
  }

  loadHealth(): void {
    this.http.get<HealthResponse>(`${this.apiUrl}/api/health`).subscribe({
      next: (data) => this.health.set(data),
      error: () => this.error.set('API non joignable')
    });
  }

  loginDemo(): void {
    this.http.post<{ accessToken: string; tokenType: string }>(`${this.apiUrl}/api/auth/token`, {
      username: 'demo',
      password: 'demo'
    }).subscribe({
      next: (res) => {
        this.token.set(res.accessToken);
        this.error.set(null);
      },
      error: () => this.error.set('Échec login demo')
    });
  }

  loadHello(): void {
    const headers = this.token()
      ? new HttpHeaders({ Authorization: `Bearer ${this.token()}` })
      : undefined;

    const options = headers ? { headers } : {};

    this.http.get<HelloResponse>(`${this.apiUrl}/api/hello`, options).subscribe({
      next: (data) => {
        this.hello.set(data);
        this.error.set(null);
      },
      error: () => this.error.set('Appel /hello refusé (auth?)')
    });
  }
}

declare global {
  interface Window { __RUNTIME_CONFIG__?: { API_URL?: string }; }
}

function getApiUrl(): string {
  return window.__RUNTIME_CONFIG__?.API_URL || 'http://localhost:8080';
}
