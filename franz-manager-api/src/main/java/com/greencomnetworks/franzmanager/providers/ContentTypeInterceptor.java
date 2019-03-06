package com.greencomnetworks.franzmanager.providers;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.WebApplicationException;
import javax.ws.rs.container.PreMatching;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.ext.Provider;
import javax.ws.rs.ext.ReaderInterceptor;
import javax.ws.rs.ext.ReaderInterceptorContext;
import java.io.IOException;

@Provider
@PreMatching
public class ContentTypeInterceptor implements ReaderInterceptor {
    private static final Logger logger = LoggerFactory.getLogger(ContentTypeInterceptor.class);

    @Override
    public Object aroundReadFrom(ReaderInterceptorContext context) throws IOException, WebApplicationException {
        if(context.getHeaders().get("Content-Type") == null) {
            context.setMediaType(MediaType.APPLICATION_JSON_TYPE);
        }

        return context.proceed();
    }
}
