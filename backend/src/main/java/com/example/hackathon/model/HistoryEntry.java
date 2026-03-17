package com.example.hackathon.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "history_entries")
public class HistoryEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Instant ts;
    private String location;
    private double surface;
    private double energyKwh;
    private int employees;
    private double totalKg;
    private int parkingSpots;

    @ElementCollection
    @CollectionTable(name = "history_materials", joinColumns = @JoinColumn(name = "history_id"))
    private List<MaterialUse> materials = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "history_energy", joinColumns = @JoinColumn(name = "history_id"))
    private List<EnergyUse> energy = new ArrayList<>();

    public HistoryEntry() {}

    public Long getId() { return id; }

    public Instant getTs() { return ts; }
    public void setTs(Instant ts) { this.ts = ts; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public double getSurface() { return surface; }
    public void setSurface(double surface) { this.surface = surface; }

    public double getEnergyKwh() { return energyKwh; }
    public void setEnergyKwh(double energyKwh) { this.energyKwh = energyKwh; }

    public int getEmployees() { return employees; }
    public void setEmployees(int employees) { this.employees = employees; }

    public double getTotalKg() { return totalKg; }
    public void setTotalKg(double totalKg) { this.totalKg = totalKg; }

    public int getParkingSpots() { return parkingSpots; }
    public void setParkingSpots(int parkingSpots) { this.parkingSpots = parkingSpots; }

    public List<MaterialUse> getMaterials() { return materials; }
    public void setMaterials(List<MaterialUse> materials) { this.materials = materials; }

    public List<EnergyUse> getEnergy() { return energy; }
    public void setEnergy(List<EnergyUse> energy) { this.energy = energy; }
}
