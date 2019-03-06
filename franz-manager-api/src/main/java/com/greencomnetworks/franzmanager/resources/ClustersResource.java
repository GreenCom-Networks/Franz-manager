package com.greencomnetworks.franzmanager.resources;

import com.greencomnetworks.franzmanager.entities.Cluster;
import com.greencomnetworks.franzmanager.services.ClustersService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import java.util.List;

@Path("/clusters")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class ClustersResource {
    private static final Logger logger = LoggerFactory.getLogger(ClustersResource.class);

    @GET
    public List<Cluster> getClusters() {
        return ClustersService.clusters;
    }
}
