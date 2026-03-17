import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

type HelloResponse = { message: string; user: string; ts: string };
type HealthResponse = { status: string; timestamp: string };

type MaterialFactor = { name: string; unit: string; factor: number };
type MaterialUse = { name: string; quantity: number; unit: string };
type EnergyUse = { source: string; kwh: number };
type EnergyFactor = { source: string; factor: number };
type HistoryEntry = {
  ts: string;
  surface: number;
  energyKwh: number;
  employees: number;
  totalKg: number;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Hackathon Angular';
  apiUrl = getApiUrl();

  // Démo API
  health = signal<HealthResponse | null>(null);
  hello = signal<HelloResponse | null>(null);
  error = signal<string | null>(null);
  token = signal<string | null>(null);
  // Données métier (mock) pour le dashboard
  site = {
    name: '',
    surface: 15000, // m²
    parkingSpots: 320,
    annualEnergyKWh: 1_200_000,
    employees: 850,
    materials: [
      { name: 'Béton', quantity: 1_200, unit: 'm3' },
      { name: 'Acier', quantity: 180, unit: 'tonne' },
      { name: 'Verre', quantity: 900, unit: 'm2' },
      { name: 'Bois', quantity: 250, unit: 'm3' }
    ] as MaterialUse[],
    energy: [
      { source: 'Électricité', kwh: 900_000 },
      { source: 'Gaz naturel', kwh: 300_000 }
    ] as EnergyUse[]
  };

  modalOpen = signal<boolean>(false);
  modalForm = {
    surface: this.site.surface,
    energyKwh: this.site.energy[0]?.kwh ?? 0,
    employees: this.site.employees
  };

  materialFactors: MaterialFactor[] = [
    { name: 'Béton', unit: 'm3', factor: 250 },    // kgCO2e / m3
    { name: 'Acier', unit: 'tonne', factor: 1900 }, // kgCO2e / tonne
    { name: 'Verre', unit: 'm2', factor: 30 },      // kgCO2e / m2
    { name: 'Bois', unit: 'm3', factor: 30 }        // kgCO2e / m3 (hypothèse stock carbone)
  ];

  energyFactors: EnergyFactor[] = [
    { source: 'Électricité', factor: 0.05 },    // kgCO2e / kWh
    { source: 'Gaz naturel', factor: 0.20 }     // kgCO2e / kWh
  ];

  history: HistoryEntry[] = [
    { ts: new Date('2024-12-01T10:12:00Z').toISOString(), surface: 15000, energyKwh: 1_200_000, employees: 850, totalKg: 781_500 },
    { ts: new Date('2024-11-15T09:40:00Z').toISOString(), surface: 14200, energyKwh: 1_050_000, employees: 820, totalKg: 702_000 }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Dashboard est basé sur des données locales mockées ; pas d'appel API au chargement.
  }

  openModal(): void {
    // snapshot current values into form buffer
    this.modalForm = {
      surface: this.site.surface,
      energyKwh: this.site.energy[0]?.kwh ?? 0,
      employees: this.site.employees
    };
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  saveModal(): void {
    this.site.surface = this.modalForm.surface || 0;
    if (this.site.energy.length === 0) {
      this.site.energy.push({ source: 'Électricité', kwh: 0 });
    }
    this.site.energy[0].kwh = this.modalForm.energyKwh || 0;
    this.site.employees = this.modalForm.employees || 0;
    this.addHistoryEntry();
    this.closeModal();
  }

  private addHistoryEntry(): void {
    const entry: HistoryEntry = {
      ts: new Date().toISOString(),
      surface: this.site.surface,
      energyKwh: this.site.energy[0]?.kwh ?? 0,
      employees: this.site.employees,
      totalKg: this.totalEmissions
    };
    this.history = [entry, ...this.history].slice(0, 10);
  }

  // === API demo ===
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

  // === Calculs KPIs ===
  get constructionEmissions(): number {
    return this.site.materials.reduce((sum, item) => {
      const factor = this.materialFactors.find(f => f.name === item.name)?.factor || 0;
      return sum + item.quantity * factor;
    }, 0);
  }

  get operationalEmissions(): number {
    return this.site.energy.reduce((sum, item) => {
      const factor = this.energyFactors.find(e => e.source === item.source)?.factor || 0;
      return sum + item.kwh * factor;
    }, 0);
  }

  get totalEmissions(): number {
    return this.constructionEmissions + this.operationalEmissions;
  }

  get emissionsPerM2(): number {
    return this.totalEmissions / this.site.surface;
  }

  get emissionsPerEmployee(): number {
    return this.totalEmissions / this.site.employees;
  }

  get constructionShare(): number {
    return (this.constructionEmissions / this.totalEmissions) * 100;
  }

  get operationalShare(): number {
    return 100 - this.constructionShare;
  }

  get materialEmissions(): { name: string; emissions: number }[] {
    return this.site.materials.map(m => {
      const factor = this.materialFactors.find(f => f.name === m.name)?.factor || 0;
      return { name: m.name, emissions: m.quantity * factor };
    });
  }

  get materialMax(): number {
    return Math.max(...this.materialEmissions.map(m => m.emissions));
  }

  get energyEmissions(): { source: string; emissions: number }[] {
    return this.site.energy.map(e => {
      const factor = this.energyFactors.find(f => f.source === e.source)?.factor || 0;
      return { source: e.source, emissions: e.kwh * factor };
    });
  }
}

declare global {
  interface Window { __RUNTIME_CONFIG__?: { API_URL?: string }; }
}

function getApiUrl(): string {
  return window.__RUNTIME_CONFIG__?.API_URL || 'http://localhost:8080';
}
