package com.servicemanagement.modules;

import com.servicemanagement.bus.ServiceBusClient;
import com.servicemanagement.bus.ServiceSubjects;
import com.servicemanagement.config.PluginConfig;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.core.Appender;
import org.apache.logging.log4j.core.LogEvent;
import org.apache.logging.log4j.core.Logger;
import org.apache.logging.log4j.core.appender.AbstractAppender;
import org.apache.logging.log4j.core.config.Property;

import java.util.HashMap;
import java.util.Map;

public class ConsoleStreamer {

    private final ServiceBusClient bus;
    private final PluginConfig config;
    private Appender appender;

    public ConsoleStreamer(ServiceBusClient bus, PluginConfig config) {
        this.bus = bus;
        this.config = config;
    }

    public void start() {
        if (!config.enableConsoleStream) return;

        Logger rootLogger = (Logger) LogManager.getRootLogger();
        appender = new AbstractAppender("ServiceManagementConsole", null, null, true, Property.EMPTY_ARRAY) {
            @Override
            public void append(LogEvent event) {
                if (!bus.isConnected()) return;
                if (event == null || event.getMessage() == null) return;

                Map<String, Object> payload = new HashMap<>();
                payload.put("level", event.getLevel().name());
                payload.put("message", event.getMessage().getFormattedMessage());
                payload.put("logger", event.getLoggerName());

                Map<String, Object> env = new HashMap<>();
                env.put("serverId", config.serverId);
                env.put("type", "log");
                env.put("timestamp", event.getTimeMillis());
                env.put("payload", payload);

                bus.publish(ServiceSubjects.logs(config.serverId), env);
            }
        };

        appender.start();
        rootLogger.addAppender(appender);
    }

    public void stop() {
        if (appender == null) return;
        Logger rootLogger = (Logger) LogManager.getRootLogger();
        rootLogger.removeAppender(appender);
        appender.stop();
        appender = null;
    }
}

