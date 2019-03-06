package com.greencomnetworks.franzmanager.entities;

import java.util.Map;

public class Metric {
    public String type;
    public String name;
    public int brokerId;
    public Map<String, Object> metrics;

    public Metric() {}
    public Metric(String type, String name, int brokerId, Map<String, Object> metrics) {
        this.type = type;
        this.name = name;
        this.brokerId = brokerId;
        this.metrics = metrics;
    }

    @Override
    public String toString() {
        return "Metric " + type + " / " + name;
    }
}
