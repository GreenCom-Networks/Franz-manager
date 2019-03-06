package com.greencomnetworks.franzmanager.entities;

import java.time.ZonedDateTime;

public class ConsumerOffsetRecord {
    public String group;
    public String topic;
    public int partition;

    public ZonedDateTime timestamp;  // Timestamp at which we read the entry. Confusing name...

    public Long offset;
    public Integer leaderEpoch;
    public String metadata;
    public ZonedDateTime commitTimestamp;
    public ZonedDateTime expireTimestamp;
}
