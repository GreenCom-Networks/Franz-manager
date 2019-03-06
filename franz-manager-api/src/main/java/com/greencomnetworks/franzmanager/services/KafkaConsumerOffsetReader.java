package com.greencomnetworks.franzmanager.services;

import com.greencomnetworks.franzmanager.entities.Cluster;
import com.greencomnetworks.franzmanager.entities.ConsumerOffsetRecord;
import com.greencomnetworks.franzmanager.utils.KafkaUtils;
import org.apache.kafka.clients.CommonClientConfigs;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.KafkaException;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.errors.InterruptException;
import org.apache.kafka.common.errors.WakeupException;
import org.apache.kafka.common.protocol.types.*;
import org.apache.kafka.common.serialization.Deserializer;
import org.apache.kafka.common.serialization.Serdes;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.ByteBuffer;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import static com.greencomnetworks.franzmanager.services.KafkaConsumerOffsetReader.GroupMetadataSchemas.*;

public class KafkaConsumerOffsetReader {
    private static final Logger logger = LoggerFactory.getLogger(KafkaConsumerOffsetReader.class);

    private static final String CONSUMER_OFFSET_TOPIC = "__consumer_offsets";
    private static final String CONSUMER_GROUP_ID = "franz-manager-api_consumer-offset-reader";
    private static final String CONSUMER_CLIENT_ID = CONSUMER_GROUP_ID + "_" + System.getenv("HOSTNAME");

    private static final Duration pollTimeout = Duration.ofSeconds(1);
    private static final Duration reconnectTimeout = Duration.ofSeconds(30);

    public static class GroupMetadataSchemas {
        public static Schema OFFSET_COMMIT_KEY_SCHEMA = new Schema(
            new Field("group", Type.STRING),
            new Field("topic", Type.STRING),
            new Field("partition", Type.INT32));
        public static BoundField OFFSET_KEY_GROUP_FIELD = OFFSET_COMMIT_KEY_SCHEMA.get("group");
        public static BoundField OFFSET_KEY_TOPIC_FIELD = OFFSET_COMMIT_KEY_SCHEMA.get("topic");
        public static BoundField OFFSET_KEY_PARTITION_FIELD = OFFSET_COMMIT_KEY_SCHEMA.get("partition");


        public static Schema OFFSET_COMMIT_VALUE_SCHEMA_V0 = new Schema(
            new Field("offset", Type.INT64),
            new Field("metadata", Type.STRING, "Associated metadata.", ""),
            new Field("timestamp", Type.INT64));
        public static BoundField OFFSET_VALUE_OFFSET_FIELD_V0 = OFFSET_COMMIT_VALUE_SCHEMA_V0.get("offset");
        public static BoundField OFFSET_VALUE_METADATA_FIELD_V0 = OFFSET_COMMIT_VALUE_SCHEMA_V0.get("metadata");
        public static BoundField OFFSET_VALUE_TIMESTAMP_FIELD_V0 = OFFSET_COMMIT_VALUE_SCHEMA_V0.get("timestamp");


        public static Schema OFFSET_COMMIT_VALUE_SCHEMA_V1 = new Schema(
            new Field("offset", Type.INT64),
            new Field("metadata", Type.STRING, "Associated metadata.", ""),
            new Field("commit_timestamp", Type.INT64),
            new Field("expire_timestamp", Type.INT64));
        public static BoundField OFFSET_VALUE_OFFSET_FIELD_V1 = OFFSET_COMMIT_VALUE_SCHEMA_V1.get("offset");
        public static BoundField OFFSET_VALUE_METADATA_FIELD_V1 = OFFSET_COMMIT_VALUE_SCHEMA_V1.get("metadata");
        public static BoundField OFFSET_VALUE_COMMIT_TIMESTAMP_FIELD_V1 = OFFSET_COMMIT_VALUE_SCHEMA_V1.get("commit_timestamp");
        public static BoundField OFFSET_VALUE_EXPIRE_TIMESTAMP_FIELD_V1 = OFFSET_COMMIT_VALUE_SCHEMA_V1.get("expire_timestamp");


        public static Schema OFFSET_COMMIT_VALUE_SCHEMA_V2 = new Schema(
            new Field("offset", Type.INT64),
            new Field("metadata", Type.STRING, "Associated metadata.", ""),
            new Field("commit_timestamp", Type.INT64));
        public static BoundField OFFSET_VALUE_OFFSET_FIELD_V2 = OFFSET_COMMIT_VALUE_SCHEMA_V2.get("offset");
        public static BoundField OFFSET_VALUE_METADATA_FIELD_V2 = OFFSET_COMMIT_VALUE_SCHEMA_V2.get("metadata");
        public static BoundField OFFSET_VALUE_COMMIT_TIMESTAMP_FIELD_V2 = OFFSET_COMMIT_VALUE_SCHEMA_V2.get("commit_timestamp");


        public static Schema OFFSET_COMMIT_VALUE_SCHEMA_V3 = new Schema(
            new Field("offset", Type.INT64),
            new Field("leader_epoch", Type.INT32),
            new Field("metadata", Type.STRING, "Associated metadata.", ""),
            new Field("commit_timestamp", Type.INT64));
        public static BoundField OFFSET_VALUE_OFFSET_FIELD_V3 = OFFSET_COMMIT_VALUE_SCHEMA_V3.get("offset");
        public static BoundField OFFSET_VALUE_LEADER_EPOCH_FIELD_V3 = OFFSET_COMMIT_VALUE_SCHEMA_V3.get("leader_epoch");
        public static BoundField OFFSET_VALUE_METADATA_FIELD_V3 = OFFSET_COMMIT_VALUE_SCHEMA_V3.get("metadata");
        public static BoundField OFFSET_VALUE_COMMIT_TIMESTAMP_FIELD_V3 = OFFSET_COMMIT_VALUE_SCHEMA_V3.get("commit_timestamp");
    }

    private HashMap<String, Map<String, ConsumerOffsetRecord>> consumerOffsetRecordArray = new HashMap<>();

    private static final AtomicReference<KafkaConsumerOffsetReader> _instance = new AtomicReference<>();

    public static KafkaConsumerOffsetReader getInstance() {
        KafkaConsumerOffsetReader instance = _instance.get();
        if(instance == null) {
            _instance.compareAndSet(null, new KafkaConsumerOffsetReader());
            instance = _instance.get();
        }
        return instance;
    }

    public static void init(){
        getInstance();
    }

    private KafkaConsumerOffsetReader() {
        ClustersService.clusters.forEach(cluster -> {
            startConsumer(cluster.name, cluster.brokersConnectString);
        });
    }

    private void startConsumer(String clusterId, String bootstrapServers) {
        logger.info("Connecting to '{}': {}", bootstrapServers, CONSUMER_OFFSET_TOPIC);

        Map<String, Object> config = new HashMap<>();
        config.put(CommonClientConfigs.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(CommonClientConfigs.CLIENT_ID_CONFIG, CONSUMER_CLIENT_ID + "_" + clusterId);
        config.put(CommonClientConfigs.RECONNECT_BACKOFF_MAX_MS_CONFIG, reconnectTimeout.toMillis());
        config.put(ConsumerConfig.GROUP_ID_CONFIG, CONSUMER_GROUP_ID);
        config.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        config.put(ConsumerConfig.EXCLUDE_INTERNAL_TOPICS_CONFIG, false);

        Deserializer<ByteBuffer> deserializer = Serdes.ByteBuffer().deserializer();

        final KafkaConsumer<ByteBuffer, ByteBuffer> consumer = new KafkaConsumer<>(config, deserializer, deserializer);
        final AtomicBoolean running = new AtomicBoolean(true);

        Thread thread = new Thread(() -> {
            try {
                while (running.get()) {
                    try {
                        Map<String, ConsumerOffsetRecord> consumerOffsetRecords = new HashMap<>();
                        consumerOffsetRecordArray.put(clusterId, consumerOffsetRecords);

                        // TODO: add hook to update the topicPartitions when they are updated, it might be safer to use a subscribe here
                        // with auto commit disabled, and a unique groupId for each instance.
                        //                                       lgaillard - 30/08/2018
                        List<TopicPartition> topicPartitions = KafkaUtils.topicPartitionsOf(consumer, CONSUMER_OFFSET_TOPIC);
                        consumer.assign(topicPartitions);
                        consumer.seekToBeginning(topicPartitions);
                        while(running.get()) {
                            try {
                                ConsumerRecords<ByteBuffer, ByteBuffer> records = consumer.poll(pollTimeout);

                                for(ConsumerRecord<ByteBuffer, ByteBuffer> record : records) {
                                    ByteBuffer keyByteBuffer = record.key();
                                    ByteBuffer valueByteBuffer = record.value();

                                    try {
                                        Short keyVersion = keyByteBuffer.getShort();

                                        if(keyVersion < 2) { // Group consumption offset
                                            ConsumerOffsetRecord consumerOffsetRecord = new ConsumerOffsetRecord();

                                            consumerOffsetRecord.timestamp = ZonedDateTime.now();

                                            { // Read key
                                                Struct struct = OFFSET_COMMIT_KEY_SCHEMA.read(keyByteBuffer);

                                                consumerOffsetRecord.group = struct.getString(OFFSET_KEY_GROUP_FIELD);
                                                consumerOffsetRecord.topic = struct.getString(OFFSET_KEY_TOPIC_FIELD);
                                                consumerOffsetRecord.partition = struct.getInt(OFFSET_KEY_PARTITION_FIELD);
                                            }

                                            String messageKey = consumerOffsetRecord.group + "." + consumerOffsetRecord.topic + "." + consumerOffsetRecord.partition;

                                            if(valueByteBuffer == null) { // Tombstone
                                                consumerOffsetRecords.remove(messageKey);
                                            } else {
                                                short valueVersion = valueByteBuffer.getShort();
                                                logger.debug("Value Version is " + valueVersion);
                                                if(valueVersion == 0) {
                                                    Struct struct = OFFSET_COMMIT_VALUE_SCHEMA_V0.read(valueByteBuffer);

                                                    consumerOffsetRecord.offset = struct.getLong(OFFSET_VALUE_OFFSET_FIELD_V0);
                                                    consumerOffsetRecord.metadata = struct.getString(OFFSET_VALUE_METADATA_FIELD_V0);
                                                    consumerOffsetRecord.commitTimestamp = ZonedDateTime.ofInstant(
                                                        Instant.ofEpochMilli(struct.getLong(OFFSET_VALUE_TIMESTAMP_FIELD_V0)), ZoneOffset.UTC);
                                                } else if(valueVersion == 1) {
                                                    Struct struct = OFFSET_COMMIT_VALUE_SCHEMA_V1.read(valueByteBuffer);

                                                    consumerOffsetRecord.offset = struct.getLong(OFFSET_VALUE_OFFSET_FIELD_V1);
                                                    consumerOffsetRecord.metadata = struct.getString(OFFSET_VALUE_METADATA_FIELD_V1);
                                                    consumerOffsetRecord.commitTimestamp = ZonedDateTime.ofInstant(
                                                        Instant.ofEpochMilli(struct.getLong(OFFSET_VALUE_COMMIT_TIMESTAMP_FIELD_V1)), ZoneOffset.UTC);
                                                    consumerOffsetRecord.expireTimestamp = ZonedDateTime.ofInstant(
                                                        Instant.ofEpochMilli(struct.getLong(OFFSET_VALUE_EXPIRE_TIMESTAMP_FIELD_V1)), ZoneOffset.UTC);
                                                } else if(valueVersion == 2) {
                                                    Struct struct = OFFSET_COMMIT_VALUE_SCHEMA_V2.read(valueByteBuffer);

                                                    consumerOffsetRecord.offset = struct.getLong(OFFSET_VALUE_OFFSET_FIELD_V2);
                                                    consumerOffsetRecord.metadata = struct.getString(OFFSET_VALUE_METADATA_FIELD_V2);
                                                    consumerOffsetRecord.commitTimestamp = ZonedDateTime.ofInstant(
                                                        Instant.ofEpochMilli(struct.getLong(OFFSET_VALUE_COMMIT_TIMESTAMP_FIELD_V2)), ZoneOffset.UTC);
                                                } else if(valueVersion == 3) {
                                                    Struct struct = OFFSET_COMMIT_VALUE_SCHEMA_V3.read(valueByteBuffer);

                                                    consumerOffsetRecord.offset = struct.getLong(OFFSET_VALUE_OFFSET_FIELD_V3);
                                                    consumerOffsetRecord.leaderEpoch = struct.getInt(OFFSET_VALUE_LEADER_EPOCH_FIELD_V3);
                                                    consumerOffsetRecord.metadata = struct.getString(OFFSET_VALUE_METADATA_FIELD_V3);
                                                    consumerOffsetRecord.commitTimestamp = ZonedDateTime.ofInstant(
                                                        Instant.ofEpochMilli(struct.getLong(OFFSET_VALUE_COMMIT_TIMESTAMP_FIELD_V3)), ZoneOffset.UTC);
                                                } else {
                                                    logger.warn("Unsupported offset message version: {}", valueVersion);
                                                }

                                                if(consumerOffsetRecord.offset != null) {
                                                    consumerOffsetRecords.put(messageKey, consumerOffsetRecord);
                                                }
                                            }
                                        } else if(keyVersion == 2) { // Group metadata
                                            // We are not interested by the metadata
                                        } else {
                                            logger.debug("Unsupported group metadata message version: {}", keyVersion);
                                        }
                                    } catch(RuntimeException e) {
                                        logger.error("Unexpected error while processing message from consumer offset topic: {}", e, e);
                                    }
                                }
                            } catch(WakeupException | InterruptException e) {
                                /* noop */
                            } catch(KafkaException e) {
                                logger.error("Unhandled kafka error: {}\nRestarting consumer...", e, e);
                                break;
                            }
                        }
                        if(running.get()) {
                            try { Thread.sleep(reconnectTimeout.toMillis()); } catch(InterruptedException e) { /* noop */ }
                        }
                    } catch(WakeupException | InterruptException e) {
                        /* noop */
                    }
                }
            } catch(Throwable e) {
                logger.error("Unexpected error: {}", e, e);
            } finally {
                consumer.close();
            }
        }, "ConsumerOffsetReader-" + clusterId);

        thread.setDaemon(true);
        thread.start();

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            running.set(false);
            consumer.wakeup();
            try { thread.join(2000); } catch (InterruptedException e) { /* noop */ }
        }));
    }


    public Collection<ConsumerOffsetRecord> getConsumerOffsetRecords(Cluster cluster) {
        return this.consumerOffsetRecordArray.get(cluster.name).values();
    }
}


