package com.greencomnetworks.franzmanager.resources;

import com.greencomnetworks.franzmanager.entities.Cluster;
import com.greencomnetworks.franzmanager.entities.ConsumerOffsetRecord;
import com.greencomnetworks.franzmanager.services.ClustersService;
import com.greencomnetworks.franzmanager.services.KafkaConsumerOffsetReader;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import java.util.ArrayList;
import java.util.Collection;


@Path("/consumers")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class ConsumerResource {
    private static final Logger logger = LoggerFactory.getLogger(ConsumerResource.class);

    private Cluster cluster;

    public ConsumerResource(@HeaderParam("clusterId") String clusterId){
        this.cluster = ClustersService.getCluster(clusterId);
    }

    @GET
    public Collection<ConsumerOffsetRecord> get(@QueryParam("group") String group, @QueryParam("topic") String topic){
        if(cluster == null) throw new NotFoundException("Cluster not found");

        Collection<ConsumerOffsetRecord> result = KafkaConsumerOffsetReader.getInstance().getConsumerOffsetRecords(cluster);

        if(null != group){
            result = filterByGroup(result, group);
        }
        if(null != topic){
            result = filterByTopic(result, topic);
        }

        return result;
    }

    private Collection<ConsumerOffsetRecord> filterByGroup(Collection<ConsumerOffsetRecord> consumerOffsetRecords, String group){
        Collection<ConsumerOffsetRecord> result = new ArrayList<>();

        for(ConsumerOffsetRecord record : consumerOffsetRecords){
            if(StringUtils.equals(record.group, group)) {
                result.add(record);
            }
        }

        return result;
    }

    private Collection<ConsumerOffsetRecord> filterByTopic(Collection<ConsumerOffsetRecord> consumerOffsetRecords, String topic){
        Collection<ConsumerOffsetRecord> result = new ArrayList<>();

        for(ConsumerOffsetRecord record : consumerOffsetRecords){
            if(StringUtils.equals(record.topic, topic)) {
                result.add(record);
            }
        }

        return result;
    }
}
