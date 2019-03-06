package com.greencomnetworks.franzmanager.utils.configs;

import org.apache.commons.configuration2.ConfigurationMap;
import org.apache.commons.configuration2.PropertiesConfiguration;

import static com.greencomnetworks.franzmanager.utils.configs.ConfigUtils.findPropertyNotReplaced;
import static com.greencomnetworks.franzmanager.utils.configs.ConfigUtils.hasPropertyNotReplaced;

public class SafePropertiesConfiguration {
    public PropertiesConfiguration properties;

    public SafePropertiesConfiguration(PropertiesConfiguration properties) {
        this.properties = properties;
    }

    public String getString(String key) {
        String property = properties.getString(key);
        if(property == null) throw new ConfigException("Property missing: " + key);
        if(hasPropertyNotReplaced(property)) throw new ConfigException(String.format("Property not replaced: %s=%s  (${%s})", key, property, findPropertyNotReplaced(property)));
        return property;
    }

    public String getString(String key, String defaultValue) {
        String property = properties.getString(key);
        if(property == null) return defaultValue;
        if(hasPropertyNotReplaced(property)) return defaultValue;
        return property;
    }

    public Integer getInteger(String key) {
        Integer property = properties.getInteger(key, null);
        if(property == null) throw new ConfigException("Property missing: " + key);
        return property;

    }

    public Integer getInteger(String key, Integer defaultValue) {
        Integer property = properties.getInteger(key, defaultValue);
        return property;
    }

    public Long getLong(String key) {
        Long property = properties.getLong(key, null);
        if(property == null) throw new ConfigException("Property missing: " + key);
        return property;
    }

    public Long getLong(String key, Long defaultValue) {
        Long property = properties.getLong(key, defaultValue);
        return property;
    }

    public Boolean getBoolean(String key) {
        Boolean property = properties.getBoolean(key, null);
        if(property == null) throw new ConfigException("Property missing: " + key);
        return property;
    }

    public Boolean getBoolean(String key, Boolean defaultValue) {
        Boolean property = properties.getBoolean(key, defaultValue);
        return property;
    }

    public <T> T get(Class<T> type, String key) {
        T property = properties.get(type, key);
        if(property == null) throw new ConfigException("Property missing: " + key);
        return property;
    }

    public <T> T get(Class<T> type, String key, T defaultValue) {
        try {
            T property = properties.get(type, key, defaultValue);
            if(property == null) return defaultValue;
            return property;
        } catch(RuntimeException e) {
            return defaultValue;
        }
    }

    public ConfigurationMap toMap() {
        return new ConfigurationMap(properties);
    }
}
