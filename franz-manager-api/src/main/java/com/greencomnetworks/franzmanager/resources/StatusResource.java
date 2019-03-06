package com.greencomnetworks.franzmanager.resources;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonValue;
import com.greencomnetworks.franzmanager.FranzManagerApiConfig;
import com.greencomnetworks.franzmanager.core.NoAuthentication;
import com.greencomnetworks.franzmanager.utils.FUtils;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.List;

@Path("/status")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@NoAuthentication
public class StatusResource {
    private static final Logger logger = LoggerFactory.getLogger(StatusResource.class);

    private final FranzManagerApiConfig config ;

    public StatusResource() {
        this.config = FranzManagerApiConfig.fromProperties();
    }

    public StatusResource(FranzManagerApiConfig config) {
        this.config = config;
    }

    @HEAD
    public Response head() {
        return Response.ok().build();
    }

    @GET
    public Response get(@QueryParam("type") StatusType type) {
        if(type == StatusType.EXTENDED) {
            StatusPayload statusPayload = new StatusPayload(config.projectId, Status.OK, FUtils.List.empty());
            return Response.ok(statusPayload).build();
        } else {
            StatusPayload statusPayload = new StatusPayload(config.projectId, Status.OK);
            return Response.ok(statusPayload).build();
        }
    }

    public enum StatusType {
        BASIC,
        EXTENDED;

        @JsonCreator
        public static StatusType fromString(String value) {
            for (StatusType statusType : StatusType.values()) {
                if(StringUtils.equals(statusType.toString(), value)) return statusType;
            }
            throw new IllegalArgumentException("Invalid StatusType");
        }

        @Override
        @JsonValue
        public String toString() {
            return this.name().toLowerCase();
        }
    }

    private enum Status {
        OK,
        KO,
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private static class StatusPayload {
        public final String id;
        public final Status status;
        public final List<StatusPayload> children;

        @JsonCreator
        public StatusPayload(@JsonProperty("id") String id,
                             @JsonProperty("status") Status status,
                             @JsonProperty("children") List<StatusPayload> children) {
            this.id = id;
            this.status = status;
            this.children = children;
        }
        
        public StatusPayload(String projectId, Status status) {
            this(projectId, status, null);
        }
    }
}
