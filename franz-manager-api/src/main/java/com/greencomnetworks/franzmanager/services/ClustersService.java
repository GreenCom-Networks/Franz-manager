package com.greencomnetworks.franzmanager.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.greencomnetworks.franzmanager.entities.Cluster;
import com.greencomnetworks.franzmanager.utils.CustomObjectMapper;
import com.greencomnetworks.franzmanager.utils.configs.ConfigException;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.List;

public class ClustersService {
    private static final Logger logger = LoggerFactory.getLogger(KafkaMetricsService.class);

    public static List<Cluster> clusters;

    public static void init() throws ConfigException {
        String KAFKA_CONF = System.getenv("KAFKA_CONF");
        if (KAFKA_CONF == null) {
            throw new ConfigException("Missing environment variable KAFKA_CONF.");
        }

        try {
            clusters = CustomObjectMapper.defaultInstance().readValue(KAFKA_CONF, new TypeReference<List<Cluster>>() {});
        } catch (IOException e) {
            throw new ConfigException("Unable to read KAFKA_CONF: " + e.getMessage(), e);
        }

        if(logger.isDebugEnabled()) {
            StringBuilder b = new StringBuilder();
            for(Cluster cluster : clusters) {
                b.append(cluster);
            }
            logger.debug("Loaded clusters config:\n{}", b);
        }
    }

    public static Cluster getCluster(String clusterId) {
        if(clusterId == null && clusters.size() == 1) return clusters.get(0);
        for(Cluster cluster : clusters) {
            if(StringUtils.equals(cluster.name, clusterId)) return cluster;
        }
        return null;
    }
}
