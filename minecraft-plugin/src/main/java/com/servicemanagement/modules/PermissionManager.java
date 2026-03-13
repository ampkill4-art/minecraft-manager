package com.servicemanagement.modules;

import com.servicemanagement.bus.BusSubscription;
import com.servicemanagement.bus.ServiceBusClient;
import com.servicemanagement.bus.ServiceSubjects;
import com.servicemanagement.config.PluginConfig;

import java.util.HashSet;
import java.util.Set;

public class PermissionManager {

    public static class PermissionReq {
        public String[] players;
    }

    private final ServiceBusClient bus;
    private final PluginConfig config;
    private final ChatBridge chatBridge;
    private BusSubscription sub;

    public PermissionManager(ServiceBusClient bus, PluginConfig config, ChatBridge chatBridge) {
        this.bus = bus;
        this.config = config;
        this.chatBridge = chatBridge;
    }

    public void start() {
        sub = bus.subscribeEnvelope(
            ServiceSubjects.permReq(config.serverId),
            PermissionReq.class,
            config.bridgeToken,
            (env, req) -> {
                if (req == null || req.players == null) return;
                Set<String> players = new HashSet<>();
                for (String p : req.players) {
                    if (p != null && !p.isBlank()) players.add(p.trim());
                }
                chatBridge.setPrivilegedPlayers(players);
            }
        );
    }

    public void stop() {
        if (sub != null) sub.unsubscribe();
    }
}
