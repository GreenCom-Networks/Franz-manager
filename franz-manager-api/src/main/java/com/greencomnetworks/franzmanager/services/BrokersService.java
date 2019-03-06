package com.greencomnetworks.franzmanager.services;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.greencomnetworks.franzmanager.entities.Broker;
import com.greencomnetworks.franzmanager.entities.Cluster;
import com.greencomnetworks.franzmanager.utils.CustomObjectMapper;
import org.apache.commons.lang3.StringUtils;
import org.apache.zookeeper.KeeperException;
import org.apache.zookeeper.ZooKeeper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

public class BrokersService {
    private static final Logger logger = LoggerFactory.getLogger(BrokersService.class);
    private static Map<String, List<Broker>> brokersByCluster = new HashMap<>();

    private static final Duration discoveryPeriod = Duration.ofSeconds(30);

    public static void init() {
        for(Cluster cluster : ClustersService.clusters) {
            KafkaBrokersDiscovery discovery = new KafkaBrokersDiscovery(cluster);
            discovery.start();
        }
    }

    public static List<Broker> getKnownKafkaBrokers(Cluster cluster) {
        return brokersByCluster.getOrDefault(cluster.name, new ArrayList<>(0));
    }

    private static class KafkaBrokersDiscovery implements Runnable {

        private final Cluster cluster;
        private final AtomicBoolean running = new AtomicBoolean();

        public KafkaBrokersDiscovery(Cluster cluster) {
            this.cluster = cluster;
        }


        public void start() {
            if(running.get()) {
                logger.warn("Kafka Brokers Discovery already running.");
                return;
            }

            running.set(true);
            logger.info("Starting brokers discovery for cluster \"{}\"",  cluster.name);
            Thread thread = new Thread(this, "KafkaBrokersDiscovery-" + cluster.name);
            thread.setDaemon(true);
            thread.start();
        }

        public void run() {
            try {
                while(running.get()) {
                    try {
                        while(running.get()) {
                            List<Broker> previouslyKnownBrokers = getKnownKafkaBrokers(cluster);
                            List<Broker> brokers = scanBrokers(previouslyKnownBrokers);
                            brokersByCluster.put(cluster.name, brokers);

                            Thread.sleep(discoveryPeriod.toMillis());
                        }
                    } catch(InterruptedException e) {
                        /* noop */
                    }
                }
            } catch(Throwable e) {
                logger.error("Critical error in Kafka Brokers Discovery: {}", e, e);
            }
        }

        private List<Broker> scanBrokers(List<Broker> previouslyKnownBrokers) {
            List<Broker> brokers = new ArrayList<>(previouslyKnownBrokers.size());

            try {
                ZooKeeper zooKeeper = ZookeeperService.getZookeeperConnection(cluster);
                if (zooKeeper == null) throw new IllegalStateException("Unable to obtain zookeeper connection for cluster \"" + cluster.name + "\"");

                List<String> brokerIds = zooKeeper.getChildren("/brokers/ids", false);
                for(String brokerId : brokerIds) {
                    byte[] zkData = zooKeeper.getData("/brokers/ids/" + brokerId, false, null);
                    ZkKafkaBroker zkKafkaBroker = new CustomObjectMapper().readValue(zkData, ZkKafkaBroker.class); // SPEED: reuse objectMapper?
                    String host;
                    {
                        String[] split = zkKafkaBroker.host.split(":");
                        if(split.length == 2) host = split[0];
                        else host = zkKafkaBroker.host;
                    }
                    brokers.add(new Broker(
                        brokerId,
                        host,
                        zkKafkaBroker.port,
                        zkKafkaBroker.jmxPort,
                        null,
                        Broker.State.OK));
                }
            } catch (KeeperException|IOException e) {
                logger.error("Error while scanning brokers of cluster {}: {}", cluster.name, e, e);
            } catch(InterruptedException e) {
                /* noop */
            }

            // Add previously known brokers that we missed
            for(Broker previouslyKnownBroker : previouslyKnownBrokers) {
                Broker broker = null;
                for(Broker b : brokers) {
                    if(b.equals(previouslyKnownBroker)) {
                        broker = b;
                        break;
                    }
                }
                if(broker == null) {
                    if(previouslyKnownBroker.state != Broker.State.BROKEN) {
                        logger.warn("Broker {}:{} lost.", previouslyKnownBroker.host, previouslyKnownBroker.port);
                    }
                    brokers.add(new Broker(
                        previouslyKnownBroker.id,
                        previouslyKnownBroker.host,
                        previouslyKnownBroker.port,
                        previouslyKnownBroker.jmxPort,
                        previouslyKnownBroker.configurations,
                        Broker.State.BROKEN
                    ));
                }
            }

            // Add brokers provided by the configuration that we missed
            {
                String[] connectStrings = cluster.brokersConnectString.split(",");
                for(int i = 0; i < connectStrings.length; ++i) {
                    String host = connectStrings[i];
                    int port = 9092;
                    {
                        String[] split = host.split(":");
                        if(split.length == 2) {
                            host = split[0];
                            port = Integer.parseInt(split[1]);
                        }
                    }
                    Broker broker = null;
                    for(Broker b : brokers) {
                        if(StringUtils.equals(b.host, host) && b.port == port) {
                            broker = b;
                            break;
                        }
                    }
                    if(broker == null) {
                        int jmxPort = 9999;
                        {
                            String jmxConnectString = cluster.jmxConnectString.split(",")[i];
                            String[] split = jmxConnectString.split(":");
                            if(split.length == 2) {
                                jmxPort = Integer.parseInt(split[1]);
                            }
                        }

                        brokers.add(new Broker(
                            "?",
                            host,
                            port,
                            jmxPort,
                            null,
                            Broker.State.BROKEN
                            ));
                    }
                }
            }
            return brokers;
        }
    }

    private static class ZkKafkaBroker {
        public String host;
        public long timestamp;
        public Integer port;
        @JsonProperty("jmx_port")
        public Integer jmxPort;
    }
}
