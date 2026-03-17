package com.example.hackathon.model;

import jakarta.persistence.Embeddable;

@Embeddable
public class EnergyUse {
    private String source;
    private double kwh;

    public EnergyUse() {}

    public EnergyUse(String source, double kwh) {
        this.source = source;
        this.kwh = kwh;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public double getKwh() {
        return kwh;
    }

    public void setKwh(double kwh) {
        this.kwh = kwh;
    }
}
