package com.greencomnetworks.franzmanager.resources;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.greencomnetworks.franzmanager.entities.Cluster;
import com.greencomnetworks.franzmanager.entities.Message;
import com.greencomnetworks.franzmanager.services.AdminClientService;
import com.greencomnetworks.franzmanager.services.ClustersService;
import com.greencomnetworks.franzmanager.utils.CustomObjectMapper;
import com.greencomnetworks.franzmanager.utils.KafkaUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.errors.WakeupException;
import org.apache.kafka.common.header.Header;
import org.apache.kafka.common.serialization.Deserializer;
import org.apache.kafka.common.serialization.Serdes;
import org.glassfish.grizzly.http.HttpRequestPacket;
import org.glassfish.grizzly.websockets.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.NotFoundException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

public class LiveMessagesResource extends WebSocketApplication {
    private static final Logger logger = LoggerFactory.getLogger(LiveMessagesResource.class);

    private Map<WebSocket, FranzConsumer> franzConsumers = new HashMap<>();

    private static class WS extends DefaultWebSocket {
        public final String remoteAddress;
        public final String origin;

        public WS(ProtocolHandler protocolHandler, HttpRequestPacket request, WebSocketListener... listeners) {
            super(protocolHandler, request, listeners);

            String forwardedFor = request.getHeader("x-forwarded-for");
            String origin = request.getHeader("origin");
            this.remoteAddress = forwardedFor != null ? forwardedFor : request.getRemoteAddress();
            this.origin = origin != null ? origin : "";
        }

        @Override
        public String toString() {
            return String.format("%s|%s", remoteAddress, origin);
        }
    }

    @Override
    public WebSocket createSocket(ProtocolHandler handler, HttpRequestPacket requestPacket, WebSocketListener... listeners) {
        return new WS(handler, requestPacket, listeners);
    }

    @Override
    public void onMessage(WebSocket socket, String data) {
        if(StringUtils.isEmpty(data)) {
            logger.warn("Received empty message from '{}'", socket);
            return;
        }

        String[] actions = data.split(":");

        String action = actions[0];
        switch (action) {
            case "subscribe":
                if(actions.length < 3) {
                    logger.warn("Invalid subscribe action from '{}': '{}'", socket, data);
                    return;
                }
                this.newSocketConsumer(socket, actions[1], actions[2]);
                break;
            case "close":
                socket.close();
                break;
            default:
                logger.warn("Unknown socket action from '{}': '{}'", socket, action);
                break;
        }
    }

    @Override
    public void onConnect(WebSocket socket) {
        logger.info("New websocket connection: '{}'", socket);
    }

    @Override
    public void onClose(WebSocket socket, DataFrame frame) {
        FranzConsumer franzConsumer = franzConsumers.get(socket);
        if(franzConsumer != null) {
            franzConsumer.shutdown();
            franzConsumers.remove(socket);
            logger.info("Websocket '{}' closed, consumer {} closed.", socket, franzConsumer.id);
        } else {
            logger.info("Websocket '{}' closed.", socket);
        }
    }

    private void newSocketConsumer(WebSocket socket, String topic, String clusterId) {
        logger.info("New subscription from '{}': Cluster:'{}' - Topic:'{}'", socket, clusterId, topic);

        Cluster cluster = ClustersService.getCluster(clusterId);
        if(cluster == null) {
            logger.warn("Trying to subscribe to an unknown cluster: {}", clusterId);
        }

        AdminClient adminClient = AdminClientService.getAdminClient(cluster);
        if(KafkaUtils.describeTopic(adminClient, topic) == null) {
            logger.warn("Trying to subscribe to an unknown topic: '{}' on '{}'", topic, cluster.name);
            socket.close();
            return;
        }

        // Close previous subscription if there was one.
        {
            FranzConsumer consumer = franzConsumers.get(socket);
            if(consumer != null) {
                logger.warn("Multiple subscription on same ws '{}'. Closing consumer {}.", socket, consumer.id);
                consumer.shutdown();
            }
        }
        FranzConsumer franzConsumer = new FranzConsumer("franz-manager-api_live", topic, socket, clusterId);
        franzConsumers.put(socket, franzConsumer);
        franzConsumer.start();
    }

    private class FranzConsumer implements Runnable {

        private final KafkaConsumer<String, String> consumer;
        private final String id;
        private final String clientId;
        private final String topic;
        private final WebSocket socket;

        private final Thread thread;

        // TODO: Keep track of how many messages got read.

        private FranzConsumer(String clientId,
                              String topic,
                              WebSocket socket,
                              String clusterId) {
            this.id = UUID.randomUUID().toString();
            this.clientId = clientId + '_' + id;
            this.topic = topic;
            this.socket = socket;
            Cluster cluster = null;
            for (Cluster c : ClustersService.clusters) {
                if (StringUtils.equals(c.name, clusterId)) {
                    cluster = c;
                    break;
                }
            }
            if (cluster == null) {
                throw new NotFoundException("Cluster not found for the id " + clusterId);
            }

            final Properties props = new Properties();
            props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, cluster.brokersConnectString);
            props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
            props.put(ConsumerConfig.CLIENT_ID_CONFIG, this.clientId);
            props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "latest");

            if(cluster.sslConfiguration != null) {
                props.put(AdminClientConfig.SECURITY_PROTOCOL_CONFIG, "SSL");
                props.put("ssl.endpoint.identification.algorithm", "");
                props.put("ssl.truststore.location", cluster.sslConfiguration.truststoreFile);
                props.put("ssl.truststore.password", cluster.sslConfiguration.truststorePassword);
                props.put("ssl.keystore.type", "PKCS12");
                props.put("ssl.keystore.location", cluster.sslConfiguration.keystoreFile);
                props.put("ssl.keystore.password", cluster.sslConfiguration.keystorePassword);
            }

            Deserializer<String> deserializer = Serdes.String().deserializer();
            this.consumer = new KafkaConsumer<>(props, deserializer, deserializer);

            this.thread = new Thread(this);
        }

        @Override
        public void run() {
            try {
                ObjectMapper objectMapper = CustomObjectMapper.defaultInstance();
                List<TopicPartition> topicPartitions = KafkaUtils.topicPartitionsOf(consumer, this.topic);
                consumer.assign(topicPartitions);
                //consumer.seekToEnd(topicPartitions);

                while (true) {
                    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));
                    List<Message> messages = new ArrayList<>();
                    for (ConsumerRecord<String, String> record : records) {
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
                    if (messages.size() > 0) {
                        logger.trace("{}: consumed {} message(s)", this.id, messages.size());
                        try {
                            String s = objectMapper.writeValueAsString(messages);
                            this.socket.send(s);
                        } catch (JsonProcessingException e) {
                            logger.error("Unable to serializer messages: {}", e.getMessage(), e);
                        }
                        Thread.sleep(1000);
                    }
                }
            } catch (WakeupException | InterruptedException e) {
                // ignore for shutdown
            } finally {
                consumer.close();
            }
        }

        public void start() {
            thread.start();
        }

        public void shutdown() {
            consumer.wakeup();
            try { thread.join(2000); } catch (InterruptedException e) { /* noop */ }
        }
    }
}