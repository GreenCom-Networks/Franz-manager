package com.greencomnetworks.franzmanager.services;

import com.greencomnetworks.franzmanager.entities.Cluster;
import com.greencomnetworks.franzmanager.resources.BrokersResource;
import org.apache.zookeeper.WatchedEvent;
import org.apache.zookeeper.Watcher;
import org.apache.zookeeper.ZooKeeper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

public class ZookeeperService {
    private static final Logger logger = LoggerFactory.getLogger(BrokersResource.class);
    private static Map<String, ZooKeeper> zookeeperConnections = new HashMap<>();

    private static final Duration zookeeperTimeout = Duration.ofMillis(15000);

    public static void init() {
        for(Cluster cluster : ClustersService.clusters) {
            registerZookeeperClient(cluster);
        }
    }

    private static void registerZookeeperClient(Cluster cluster) {
        try {
            ZookeeperWrapper wrapper = new ZookeeperWrapper(cluster, zookeeperTimeout);
            zookeeperConnections.put(cluster.name, wrapper.zookeeper);
        } catch(IOException e) {
            logger.error("Critical error while creating zookeeper client: {}", e, e); // Can't happen... ¯\_(ツ)_/¯
        }
    }

    public static ZooKeeper getZookeeperConnection(Cluster cluster) {
        return zookeeperConnections.get(cluster.name);
    }

    private static class ZookeeperWrapper implements Watcher {
        private final Cluster cluster;
        private final Duration timeout;
        public final ZooKeeper zookeeper;

        public ZookeeperWrapper(Cluster cluster, Duration timeout) throws IOException {
            this.cluster = cluster;
            this.timeout = timeout;
            this.zookeeper = new ZooKeeper(cluster.zookeeperConnectString, (int) timeout.toMillis(), this); // Argh!
        }

        @Override
        public void process(WatchedEvent event) {
            if(event.getType() == Event.EventType.None) {
                Event.KeeperState state = event.getState();
                if(state == Event.KeeperState.Expired) {
                    logger.warn("Zookeeper client for \"{}\" expired. Reconnecting...", cluster.name);
                    try { Thread.sleep(timeout.toMillis()); } catch(InterruptedException e) { /* noop */ }
                    registerZookeeperClient(cluster); // Yeah! "auto" reconnect!  *paf* 🤦
                }
            }
        }
    }
}