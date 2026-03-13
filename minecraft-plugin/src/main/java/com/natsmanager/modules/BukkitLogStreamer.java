package com.natsmanager.modules;

import com.natsmanager.config.PluginConfig;
import com.natsmanager.nats.NatsClient;
import com.natsmanager.nats.NatsSubjects;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.core.Appender;
import org.apache.logging.log4j.core.CoreLogger;
import org.apache.logging.log4j.core.LogEvent;
import org.apache.logging.log4j.core.Logger;
import org.apache.logging.log4j.core.appender.AbstractAppender;
import org.apache.logging.log4j.core.config.Property;

import java.util.HashMap;
import java.util.Map;

public class BukkitLogStreamer {

    private final NatsClient nats;
    private final PluginConfig config;
    private Appender appender;

    public BukkitLogStreamer(NatsClient nats, PluginConfig config) {
        this.nats = nats;
        this.config = config;
    }

    public void start() {
        if (!config.enableLogStreaming) return;

        Logger rootLogger = (Logger) LogManager.getRootLogger();

        appender = new AbstractAppender("NatsManagerAppender", null, null, true, Property.EMPTY_ARRAY) {
            @Override
            public void append(LogEvent event) {
                // Prevent infinite loop if NATS logging triggers this
                if (event.getMessage().getFormattedMessage().contains("[NatsManager]")) return;

                if (nats.isConnected()) {
                    Map<String, Object> payload = new HashMap<>();
                    payload.put("level", event.getLevel().name());
                    payload.put("message", event.getMessage().getFormattedMessage());
                    payload.put("logger", event.getLoggerName());

                    Map<String, Object> env = new HashMap<>();
                    env.put("serverId", config.serverId);
                    env.put("type", "log");
                    env.put("timestamp", event.getTimeMillis());
                    env.put("payload", payload);

                    nats.publish(NatsSubjects.logs(config.serverId), env);
                }
            }
        };

        appender.start();
        rootLogger.addAppender(appender);
    }

    public void stop() {
        if (appender != null) {
            Logger rootLogger = (Logger) LogManager.getRootLogger();
            rootLogger.removeAppender(appender);
            appender.stop();
        }
    }
}
