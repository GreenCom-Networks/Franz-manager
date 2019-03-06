package com.greencomnetworks.franzmanager.entities;

import org.apache.kafka.common.Node;
import org.apache.kafka.common.TopicPartitionInfo;

public class Partition {
    public String topic;
    public int partition;
    public long beginningOffset;
    public long endOffset;
    public int leader;
    public int[] replicas;
    public int[] inSyncReplicas;
    public int[] offlineReplicas;

    public Partition() {}
    public Partition(String topic, int partition, long beginningOffset, long endOffset, int leader, int[] replicas, int[] inSyncReplicas, int[] offlineReplicas) {
        this.topic = topic;
        this.partition = partition;
        this.beginningOffset = beginningOffset;
        this.endOffset = endOffset;
        this.leader = leader;
        this.replicas = replicas;
        this.inSyncReplicas = inSyncReplicas;
        this.offlineReplicas = offlineReplicas;
    }

    public Partition(String topic, long beginningOffset, long endOffset, TopicPartitionInfo topicPartitionInfo, int[] offlineReplicas) {
        this.topic = topic;
        this.partition = topicPartitionInfo.partition();
        this.beginningOffset = beginningOffset;
        this.endOffset = endOffset;
        this.leader = topicPartitionInfo.leader() == null ? -1 : topicPartitionInfo.leader().id();
        this.replicas = topicPartitionInfo.replicas().stream().mapToInt(Node::id).toArray();
        this.inSyncReplicas = topicPartitionInfo.isr().stream().mapToInt(Node::id).toArray();
        this.offlineReplicas = offlineReplicas;
    }
}
