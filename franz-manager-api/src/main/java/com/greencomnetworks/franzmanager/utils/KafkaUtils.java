package com.greencomnetworks.franzmanager.utils;

import org.apache.commons.lang3.StringUtils;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.Config;
import org.apache.kafka.clients.admin.TopicDescription;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.config.ConfigResource;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

public class KafkaUtils {
    public static <K,V> List<TopicPartition> topicPartitionsOf(Consumer<K,V> consumer, String topic) {
        return consumer.partitionsFor(topic).stream()
                .map(pi -> new TopicPartition(pi.topic(), pi.partition()))
                .collect(Collectors.toList());
    }

    public static TopicDescription describeTopic(AdminClient adminClient, String topic) {
        try {
            if(StringUtils.isEmpty(topic)) return null;
            return adminClient.describeTopics(FUtils.List.of(topic)).all().get().get(topic);
        } catch (InterruptedException e) {
            return null;
        } catch (ExecutionException e) {
            // TODO: throw exception?
            return null;
        }
    }

    public static Config describeTopicConfig(AdminClient adminClient, String topic) {
        return describeConfig(adminClient, new ConfigResource(ConfigResource.Type.TOPIC, topic));
    }

    public static Config describeBrokerConfig(AdminClient adminClient, String brokerId) {
        return describeConfig(adminClient, new ConfigResource(ConfigResource.Type.BROKER, brokerId));
    }

    public static Config describeConfig(AdminClient adminClient, ConfigResource configResource) {
        Set<ConfigResource> configResources = FUtils.Set.of(configResource);

        try {
            return adminClient.describeConfigs(configResources).all().get().get(configResource);
        } catch (InterruptedException e) {
            return null;
        } catch (ExecutionException e) {
            // TODO: throw causes?
            return null;
        }
    }
}
