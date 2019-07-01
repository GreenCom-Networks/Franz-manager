package com.greencomnetworks.franzmanager.resources;

import com.greencomnetworks.franzmanager.entities.Broker;
import com.greencomnetworks.franzmanager.entities.Cluster;
import com.greencomnetworks.franzmanager.services.BrokersService;
import com.greencomnetworks.franzmanager.services.ClustersService;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import java.util.List;
import java.util.stream.Collectors;

@Path("/brokers")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class BrokersResource {
    private static final Logger logger = LoggerFactory.getLogger(BrokersResource.class);

    private Cluster cluster;

    public BrokersResource(@HeaderParam("clusterId") String clusterId) {
        this.cluster = ClustersService.getCluster(clusterId);
    }

    @GET
    public List<Broker> getBrokers(@QueryParam("withConfiguration") boolean withConfiguration) {
        if(cluster == null) throw new NotFoundException("Cluster not found");

        List<Broker> brokers = BrokersService.getKnownKafkaBrokers(cluster);

        if(withConfiguration) {
            return brokers;
        } else {
            return brokers.stream()
                .map(b -> new Broker(b.id, b.host, b.port, b.jmxPort, b.rack, b.leader, null, b.state)).collect(Collectors.toList());
        }
    }

    @GET
    @Path("/{brokerId}")
    public Broker getBroker(@PathParam("brokerId") String brokerId) {
        if(cluster == null) throw new NotFoundException("Cluster not found");

        List<Broker> brokers = BrokersService.getKnownKafkaBrokers(cluster);

        for(Broker broker : brokers) {
            if(StringUtils.equals(broker.id, brokerId)) return broker;
        }
        throw new NotFoundException("Broker not found");
    }
}
