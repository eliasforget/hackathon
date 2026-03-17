import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

type HelloResponse = { message: string; user: string; ts: string };
type HealthResponse = { status: string; timestamp: string };

type MaterialFactor = { name: string; unit: string; factor: number };
type MaterialUse = { name: string; quantity: number; unit: string };
type EnergyUse = { source: string; kwh: number };
type EnergyFactor = { source: string; factor: number };
type HistoryEntry = {
  id?: number;
  ts: string;
  surface: number;
  energyKwh: number;
  employees: number;
  totalKg: number;
  location?: string;
  materials: MaterialUse[];
  energy: EnergyUse[];
  parkingSpots?: number;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Hackathon';
  apiUrl = getApiUrl();

  // Démo API
  health = signal<HealthResponse | null>(null);
  hello = signal<HelloResponse | null>(null);
  error = signal<string | null>(null);
  token = signal<string | null>(null);
  // Données dynamiques pour le dashboard (chargées depuis l'historique ou saisie)
  site = {
    name: '',
    surface: 0,
    parkingSpots: 0,
    annualEnergyKWh: 0,
    employees: 0,
    materials: [] as MaterialUse[],
    energy: [] as EnergyUse[]
  };

  modalOpen = signal<boolean>(false);
  modalForm: {
    surface: number;
    employees: number;
    location: string;
    parkingSpots: number;
    materials: MaterialUse[];
    energy: EnergyUse[];
  } = {
    surface: 0,
    employees: 0,
    location: '',
    parkingSpots: 0,
    materials: [],
    energy: []
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

  history: HistoryEntry[] = [];
  loadingHistory = false;
  historyError: string | null = null;
  locationFilter: string = 'all';
  private readonly HISTORY_KEY = 'history-cache';
  selectedSite: string = '';
  selectedTs: string = '';
  pendingDeletion: HistoryEntry | null = null;
  editingEntry: HistoryEntry | null = null;

  get materialOptions(): string[] {
    return this.materialFactors.map(m => m.name);
  }

  getMaterialOptionsFor(index: number): string[] {
    const selectedNames = this.modalForm.materials
      .map((m, i) => (i === index ? null : m.name))
      .filter((v): v is string => !!v);
    return this.materialOptions.filter(opt => !selectedNames.includes(opt));
  }

  get energyOptions(): string[] {
    return this.energyFactors.map(e => e.source);
  }

  getEnergyOptionsFor(index: number): string[] {
    const selectedSources = this.modalForm.energy
      .map((e, i) => (i === index ? null : e.source))
      .filter((v): v is string => !!v);
    return this.energyOptions.filter(opt => !selectedSources.includes(opt));
  }

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadLocalHistory();
    this.loginForHistory();
  }

  addMaterialRow(): void {
    this.modalForm.materials = [...this.modalForm.materials, { name: '', quantity: 0, unit: 'm3' }];
  }

  removeMaterialRow(index: number): void {
    this.modalForm.materials = this.modalForm.materials.filter((_, i) => i !== index);
    if (this.modalForm.materials.length === 0) this.addMaterialRow();
  }

  addEnergyRow(): void {
    this.modalForm.energy = [...this.modalForm.energy, { source: '', kwh: 0 }];
  }

  removeEnergyRow(index: number): void {
    this.modalForm.energy = this.modalForm.energy.filter((_, i) => i !== index);
    if (this.modalForm.energy.length === 0) this.addEnergyRow();
  }

  onMaterialNameChange(index: number): void {
    const name = this.modalForm.materials[index]?.name;
    const unit = this.materialFactors.find(f => f.name === name)?.unit;
    if (unit) {
      this.modalForm.materials[index].unit = unit;
    }
  }

  openModal(entry?: HistoryEntry): void {
    if (entry) {
      this.editingEntry = entry;
      this.modalForm = {
        surface: entry.surface,
        employees: entry.employees,
        location: entry.location || '',
        parkingSpots: entry.parkingSpots || 0,
        materials: entry.materials ? entry.materials.map(m => ({ ...m })) : [],
        energy: entry.energy ? entry.energy.map(e => ({ ...e })) : []
      };
    } else {
      this.editingEntry = null;
      this.resetModalForm();
    }
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  saveModal(): void {
    this.site.surface = Number(this.modalForm.surface) || 0;
    this.site.employees = Number(this.modalForm.employees) || 0;
    this.site.name = this.modalForm.location || '';
    this.site.parkingSpots = Number(this.modalForm.parkingSpots) || 0;
    this.site.materials = this.modalForm.materials
      .map(m => ({ ...m, quantity: Number(m.quantity) || 0 }))
      .filter(m => m.name && m.quantity >= 0);
    this.site.energy = this.modalForm.energy
      .map(e => ({ ...e, kwh: Number(e.kwh) || 0 }))
      .filter(e => e.source && e.kwh >= 0);
    const ts = this.editingEntry?.ts || new Date().toISOString();
    const id = this.editingEntry?.id;
    const entry: HistoryEntry = {
      id,
      ts,
      surface: this.site.surface,
      energyKwh: this.site.energy.reduce((s, e) => s + e.kwh, 0),
      employees: this.site.employees,
      totalKg: this.totalEmissions,
      location: this.site.name,
      materials: this.site.materials,
      energy: this.site.energy,
      parkingSpots: this.site.parkingSpots
    };
    if (this.editingEntry?.id) {
      this.updateHistoryToApi(entry);
    } else {
      this.saveHistoryToApi(entry);
    }
    this.closeModal();
    this.resetModalForm();
    this.editingEntry = null;
  }

  loadHistoryFromApi(): void {
    this.loadingHistory = true;
    this.historyError = null;
    this.http.get<HistoryEntry[]>(`${this.apiUrl}/api/history`, this.authOptions()).subscribe({
      next: (rows) => {
        this.history = (rows || []).reverse();
        if (this.history.length) {
          this.applyEntryToSite(this.history[0]);
          this.selectedSite = this.history[0].location || '';
          this.selectedTs = this.history[0].ts;
        }
        this.persistHistory();
        this.loadingHistory = false;
        this.historyError = null;
      },
      error: () => {
        this.historyError = 'Impossible de charger l’historique (API ?)';
        this.loadingHistory = false;
        // fallback local pour ne pas perdre l'affichage
        this.loadLocalHistory();
      }
    });
  }

  private saveHistoryToApi(entry: HistoryEntry): void {
    this.http.post<HistoryEntry>(`${this.apiUrl}/api/history`, entry, this.authOptions()).subscribe({
      next: (saved) => {
        const insert = saved || entry;
        this.history = [insert, ...this.history];
        this.applyEntryToSite(insert);
        this.selectedSite = insert.location || '';
        this.selectedTs = insert.ts;
        this.historyError = null;
        this.persistHistory();
      },
      error: () => {
        this.historyError = 'Enregistrement en base impossible';
        this.history = [entry, ...this.history];
        this.applyEntryToSite(entry);
        this.selectedSite = entry.location || '';
        this.selectedTs = entry.ts;
        this.persistHistory();
      }
    });
  }

  private updateHistoryToApi(entry: HistoryEntry): void {
    if (!entry.id) {
      this.saveHistoryToApi(entry);
      return;
    }
    this.http.put<HistoryEntry>(`${this.apiUrl}/api/history/${entry.id}`, entry, this.authOptions()).subscribe({
      next: (saved) => {
        const updated = saved || entry;
        this.history = this.history.map(h => h.id === updated.id ? updated : h);
        this.applyEntryToSite(updated);
        this.selectedSite = updated.location || '';
        this.selectedTs = updated.ts;
        this.historyError = null;
        this.persistHistory();
      },
      error: () => {
        this.historyError = 'Mise à jour impossible (API ?)';
        this.history = this.history.map(h => h.id === entry.id ? entry : h);
        this.applyEntryToSite(entry);
        this.selectedSite = entry.location || '';
        this.selectedTs = entry.ts;
        this.persistHistory();
      }
    });
  }

  private loginForHistory(): void {
    this.http.post<{ accessToken: string; tokenType: string }>(`${this.apiUrl}/api/auth/token`, {
      username: 'demo',
      password: 'demo'
    }).subscribe({
      next: (res) => {
        this.token.set(res.accessToken);
        this.historyError = null;
        this.loadHistoryFromApi();
      },
      error: () => {
        this.historyError = 'Auth demo impossible';
        this.loadingHistory = false;
      }
    });
  }

  private authOptions() {
    const t = this.token();
    if (!t) return {};
    return { headers: new HttpHeaders({ Authorization: `Bearer ${t}` }) };
  }

  private loadLocalHistory(): void {
    try {
      const raw = localStorage.getItem(this.HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as HistoryEntry[];
        this.history = parsed;
        if (this.history.length) {
          this.applyEntryToSite(this.history[0]);
          this.historyError = null;
          this.selectedSite = this.history[0].location || '';
          this.selectedTs = this.history[0].ts;
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  private persistHistory(): void {
    try {
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.history));
    } catch {
      // ignore storage errors
    }
  }

  private applyEntryToSite(entry: HistoryEntry): void {
    this.site = {
      name: entry.location || '',
      surface: entry.surface,
      parkingSpots: entry.parkingSpots || 0,
      annualEnergyKWh: entry.energyKwh,
      employees: entry.employees,
      materials: entry.materials || [],
      energy: entry.energy || []
    };
  }

  // === Sélection d'un site et date pour le dashboard ===
  get availableSites(): string[] {
    return this.uniqueLocations;
  }

  get availableDatesForSelectedSite(): HistoryEntry[] {
    if (!this.selectedSite) return [];
    return this.history.filter(h => (h.location || '') === this.selectedSite);
  }

  onSiteSelect(site: string): void {
    this.selectedSite = site;
    const list = this.availableDatesForSelectedSite;
    if (list.length) {
      this.selectedTs = list[0].ts;
      this.applyEntryToSite(list[0]);
    } else {
      this.selectedTs = '';
    }
  }

  onDateSelect(ts: string): void {
    const entry = this.history.find(h => h.ts === ts);
    if (entry) {
      this.applyEntryToSite(entry);
      this.selectedSite = entry.location || '';
      this.selectedTs = entry.ts;
    }
  }

  private resetModalForm(): void {
    this.modalForm = {
      surface: 0,
      employees: 0,
      location: '',
      parkingSpots: 0,
      materials: [{ name: '', quantity: 0, unit: 'm3' }],
      energy: [{ source: '', kwh: 0 }]
    };
  }

  get filteredHistory(): HistoryEntry[] {
    if (this.locationFilter === 'all') return this.history;
    return this.history.filter(h => (h.location || '') === this.locationFilter);
  }

  openDeleteConfirm(entry: HistoryEntry): void {
    this.pendingDeletion = entry;
  }

  closeDeleteConfirm(): void {
    this.pendingDeletion = null;
  }

  confirmDelete(): void {
    if (this.pendingDeletion) {
      this.deleteHistory(this.pendingDeletion);
      this.pendingDeletion = null;
    }
  }

  deleteHistory(entry: HistoryEntry): void {
    if (entry.id) {
      this.http.delete<void>(`${this.apiUrl}/api/history/${entry.id}`, this.authOptions()).subscribe({
        next: () => this.removeHistoryLocally(entry),
        error: () => this.removeHistoryLocally(entry) // fallback: still remove locally
      });
    } else {
      this.removeHistoryLocally(entry);
    }
  }

  private removeHistoryLocally(entry: HistoryEntry): void {
    const wasSelected = this.selectedTs === entry.ts;
    this.history = this.history.filter(h => h.id ? h.id !== entry.id : h.ts !== entry.ts);

    if (this.locationFilter === (entry.location || '') && !this.history.some(h => (h.location || '') === (entry.location || ''))) {
      this.locationFilter = 'all';
    }

    if (wasSelected) {
      const next = this.history.find(h => (h.location || '') === entry.location) || this.history[0];
      if (next) {
        this.applyEntryToSite(next);
        this.selectedSite = next.location || '';
        this.selectedTs = next.ts;
      } else {
        this.selectedSite = '';
        this.selectedTs = '';
        this.site = {
          name: '',
          surface: 0,
          parkingSpots: 0,
          annualEnergyKWh: 0,
          employees: 0,
          materials: [],
          energy: []
        };
      }
    }

    this.persistHistory();
  }

  get uniqueLocations(): string[] {
    const set = new Set(this.history.map(h => h.location).filter((v): v is string => !!v));
    return Array.from(set);
  }

  isHistoryPage(): boolean {
    return this.router.url.startsWith('/history');
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
    return this.site.surface ? this.totalEmissions / this.site.surface : 0;
  }

  get emissionsPerEmployee(): number {
    return this.site.employees ? this.totalEmissions / this.site.employees : 0;
  }

  get constructionShare(): number {
    return this.totalEmissions ? (this.constructionEmissions / this.totalEmissions) * 100 : 0;
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
    const list = this.materialEmissions.map(m => m.emissions);
    return list.length ? Math.max(...list) : 0;
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
