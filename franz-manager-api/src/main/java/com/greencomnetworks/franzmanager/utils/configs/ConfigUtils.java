package com.greencomnetworks.franzmanager.utils.configs;

import org.apache.commons.configuration2.builder.fluent.Configurations;
import org.apache.commons.configuration2.ex.ConfigurationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public abstract class ConfigUtils {
    private static final Logger logger = LoggerFactory.getLogger(ConfigUtils.class);

    protected static final Pattern propertyPattern = Pattern.compile("\\$\\{(.*?)\\}");

    public static SafePropertiesConfiguration properties(String file) {
        try {
            return new SafePropertiesConfiguration(new Configurations().properties(file));
        } catch(ConfigurationException e) {
            throw new ConfigException("Couldn't load properties '" + file + "'", e);
        }
    }


    protected static boolean hasPropertyNotReplaced(String value) {
        Matcher matcher = propertyPattern.matcher(value);
        if(matcher.matches()) {
            return true;
        }
        return false;
    }

    protected static String findPropertyNotReplaced(String value) {
        Matcher matcher = propertyPattern.matcher(value);
        if(matcher.matches()) {
            return matcher.group(1);
        }
        return null;
    }
}
