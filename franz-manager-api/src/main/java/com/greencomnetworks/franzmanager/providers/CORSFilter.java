package com.greencomnetworks.franzmanager.providers;

import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.container.ContainerResponseContext;
import javax.ws.rs.container.ContainerResponseFilter;
import javax.ws.rs.container.PreMatching;
import javax.ws.rs.core.MultivaluedMap;
import javax.ws.rs.ext.Provider;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

@Provider
@PreMatching
public class CORSFilter implements ContainerResponseFilter {
    @Override
    public void filter(ContainerRequestContext requestContext, ContainerResponseContext responseContext) {
        MultivaluedMap<String, Object> headers = responseContext.getHeaders();
        Set<String> exposedHeaders = new HashSet<>(headers.keySet());

        headers.putSingle("Access-Control-Allow-Origin", "*");

        exposedHeaders.remove("Content-Type");
        if(!exposedHeaders.isEmpty()) {
            headers.putSingle("Access-Control-Expose-Headers", String.join(",", exposedHeaders));
            headers.add("Vary", "Access-Control-Expose-Headers");
        }

        // preflight
        if("OPTIONS".equals(requestContext.getMethod())) {
            headers.putSingle("Access-Control-Max-Age", -1); // Needed because we can't use `Access-Control-Allow-Headers: *`....

            String allowedMethods = responseContext.getHeaderString("Allow");
            headers.putSingle("Access-Control-Allow-Methods", allowedMethods);

            String allowedHeaders = requestContext.getHeaderString("Access-Control-Request-Headers");
            if(allowedHeaders != null) {
                headers.putSingle("Access-Control-Allow-Headers", allowedHeaders);
            }
            headers.add("Vary", "Access-Control-Allow-Headers");

            headers.remove("Content-Type");
            headers.putSingle("Content-Length", 0);
            responseContext.setEntity(null);
            responseContext.setStatus(204);
        }
    }
}
