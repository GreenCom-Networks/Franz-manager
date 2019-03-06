package com.greencomnetworks.franzmanager.entities;

import java.util.List;
import java.util.Map;

public class Message {
    public String topic;
    public int partition;
    public long offset;
    public long timestamp;
    public Map<String, List<String>> headers;
    public String key;
    public String value;

    public Message() {}
    public Message(String topic, int partition, long offset, long timestamp, Map<String, List<String>> headers, String key, String value) {
        this.topic = topic;
        this.partition = partition;
        this.offset = offset;
        this.timestamp = timestamp;
        this.headers = headers;
        this.key = key;
        this.value = value;
    }
}
