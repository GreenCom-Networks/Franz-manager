package com.greencomnetworks.franzmanager.entities;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

public class TopicCreation {
    public String id;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public Integer partitions;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public Integer replications;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public Map<String, String> configurations;

    public TopicCreation() {}
    public TopicCreation(String id,
                         Integer partitions,
                         Integer replications,
                         Map<String, String> configurations) {
        this.id = id;
        this.partitions = partitions;
        this.replications = replications;
        this.configurations = configurations;
    }

    @Override
    public String toString() {
        return "Topic: " + id;
    }
}