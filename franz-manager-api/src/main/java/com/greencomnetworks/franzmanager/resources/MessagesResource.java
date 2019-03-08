package com.greencomnetworks.franzmanager.resources;

import com.greencomnetworks.franzmanager.entities.Cluster;
import com.greencomnetworks.franzmanager.entities.Message;
import com.greencomnetworks.franzmanager.services.AdminClientService;
import com.greencomnetworks.franzmanager.services.ClustersService;
import com.greencomnetworks.franzmanager.utils.FUtils;
import com.greencomnetworks.franzmanager.utils.KafkaUtils;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.TopicDescription;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.header.Header;
import org.apache.kafka.common.serialization.Deserializer;
import org.apache.kafka.common.serialization.Serdes;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Path("/topics/{topicId}/messages")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class MessagesResource {
    private static final Logger logger = LoggerFactory.getLogger(MessagesResource.class);

    private Cluster cluster;

    public MessagesResource(@HeaderParam("clusterId") String clusterId){
        this.cluster = ClustersService.getCluster(clusterId);
    }
    @GET
    public List<Message> getMessages(@PathParam("topicId") String topicId,
                              @DefaultValue("10") @QueryParam("quantity") Integer quantity,
                              @QueryParam("from") Long from) {
        if(cluster == null) throw new NotFoundException("Cluster not found");

        AdminClient adminClient = AdminClientService.getAdminClient(cluster);
        TopicDescription topicDescription = KafkaUtils.describeTopic(adminClient, topicId);
        if (topicDescription == null) {
            throw new NotFoundException("This topic (" + topicId + ") doesn't exist.");
        }

        final Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, cluster.brokersConnectString);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "franz-manager-api");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);

        Deserializer<String> deserializer = Serdes.String().deserializer();
        final Consumer<String, String> consumer = new KafkaConsumer<>(props, deserializer, deserializer);
        try {
            List<Message> messages = new ArrayList<>();
            List<TopicPartition> topicPartitions = KafkaUtils.topicPartitionsOf(consumer, topicId);

            consumer.assign(topicPartitions);
            consumer.seekToEnd(topicPartitions);

            Map<TopicPartition, Long> beginningOffsets;

            if (from != null) {
                Map<TopicPartition, Long> map = new HashMap<>();
                Map<TopicPartition, Long> beginningOffsetsCopy = new HashMap<>();
                topicPartitions.forEach(topicPartition -> map.put(topicPartition, from));

                consumer.offsetsForTimes(map).forEach((topicPartition, offsetAndTimestamp) -> {
                    if (offsetAndTimestamp != null) {
                        beginningOffsetsCopy.put(topicPartition, offsetAndTimestamp.offset());
                    } else {
                        beginningOffsetsCopy.put(topicPartition, 0L);
                    }
                });

                beginningOffsets = beginningOffsetsCopy;
            } else {
                beginningOffsets = consumer.beginningOffsets(topicPartitions);
            }

            for (TopicPartition topicPartition : topicPartitions) {
                long offset = consumer.position(topicPartition);
                long beginningOffset = beginningOffsets.get(topicPartition);

                if (from != null) {
                    consumer.seek(topicPartition, beginningOffset);
                } else {
                    if (offset - beginningOffset < quantity) {
                        consumer.seekToBeginning(FUtils.List.of(topicPartition));
                    } else {
                        consumer.seek(topicPartition, offset - quantity);
                    }
                }
            }

            final int giveUp = 5;
            int noRecordsCount = 0;
            while (true) {
                final ConsumerRecords<String, String> consumerRecords = consumer.poll(Duration.ofMillis(100));
                if (consumerRecords.count() == 0) {
                    noRecordsCount++;
                    if (noRecordsCount > giveUp) break;
                } else {
                    for(ConsumerRecord<String, String> record : consumerRecords) {
                        Map<String, List<String>> headers = new HashMap<>();

                        for(Header header : record.headers()) {
                            List<String> currentValues = headers.computeIfAbsent(header.key(), k -> new ArrayList<>(1));
                            currentValues.add(new String(header.value(), StandardCharsets.UTF_8));
                        }
                        messages.add(new Message(
                            record.topic(),
                            record.partition(),
                            record.offset(),
                            record.timestamp(),
                            headers,
                            record.key(),
                            record.value()
                        ));
                    }
                    if (from == null && messages.size() >= topicPartitions.size() * quantity) break;
                }
            }


            List<Message> resultMessages = messages.stream().sorted((m1, m2) -> -Long.compare(m1.timestamp, m2.timestamp)).collect(Collectors.toList());

            if (from != null) {
                return resultMessages.stream().filter(message -> message.timestamp != -1 && message.timestamp > from).collect(Collectors.toList());
            } else {
                return resultMessages.stream().limit(quantity).collect(Collectors.toList());
            }
        } finally {
            consumer.close();
        }
    }
}
