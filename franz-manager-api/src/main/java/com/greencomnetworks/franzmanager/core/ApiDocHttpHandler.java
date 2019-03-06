package com.greencomnetworks.franzmanager.core;

import org.glassfish.grizzly.Grizzly;
import org.glassfish.grizzly.http.Method;
import org.glassfish.grizzly.http.server.Request;
import org.glassfish.grizzly.http.server.Response;
import org.glassfish.grizzly.http.server.StaticHttpHandler;
import org.glassfish.grizzly.http.util.Header;
import org.glassfish.grizzly.http.util.HttpStatus;

import java.io.File;
import java.util.logging.Level;
import java.util.logging.Logger;

public class ApiDocHttpHandler extends StaticHttpHandler {
    private static final Logger LOGGER = Grizzly.logger(ApiDocHttpHandler.class);

    public ApiDocHttpHandler(String... docRoots) {
        super(docRoots);
        this.setFileCacheEnabled(false);
    }

    // Fix redirect that don't take into account the context path...
    @Override
    protected boolean handle(String uri, Request request, Response response) throws Exception {
        boolean found = false;

        final File[] fileFolders = docRoots.getArray();
        if (fileFolders == null) {
            return false;
        }

        File resource = null;

        for (int i = 0; i < fileFolders.length; i++) {
            final File webDir = fileFolders[i];
            // local file
            resource = new File(webDir, uri);
            final boolean exists = resource.exists();
            final boolean isDirectory = resource.isDirectory();

            if (exists && isDirectory) {

                if (!isDirectorySlashOff() && !uri.endsWith("/")) { // redirect to the same url, but with trailing slash
                    // Append context path
                    String contextPath = request.getContextPath();
                    if(contextPath == null) contextPath = "";
                    response.setStatus(HttpStatus.MOVED_PERMANENTLY_301);
                    response.setHeader(Header.Location,
                        response.encodeRedirectURL(contextPath + uri + "/"));
                    return true;
                }

                final File f = new File(resource, "/index.html");
                if (f.exists()) {
                    resource = f;
                    found = true;
                    break;
                }
            }

            if (isDirectory || !exists) {
                found = false;
            } else {
                found = true;
                break;
            }
        }

        if (!found) {
            if (LOGGER.isLoggable(Level.FINE)) {
                LOGGER.log(Level.FINE, "File not found {0}", resource);
            }
            return false;
        }

        assert resource != null;

        // If it's not HTTP GET - return method is not supported status
        if (!Method.GET.equals(request.getMethod())) {
            if (LOGGER.isLoggable(Level.FINE)) {
                LOGGER.log(Level.FINE, "File found {0}, but HTTP method {1} is not allowed",
                    new Object[] {resource, request.getMethod()});
            }
            response.setStatus(HttpStatus.METHOD_NOT_ALLOWED_405);
            response.setHeader(Header.Allow, "GET");
            return true;
        }

        pickupContentType(response, resource.getPath());

        addToFileCache(request, response, resource);
        sendFile(response, resource);

        return true;
    }
}
