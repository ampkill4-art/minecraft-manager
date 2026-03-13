package com.servicemanagement.modules;

import com.servicemanagement.config.PluginConfig;
import com.servicemanagement.bus.ServiceBusClient;
import com.servicemanagement.bus.ServiceSubjects;
import org.bukkit.Bukkit;
import org.bukkit.plugin.Plugin;
import org.bukkit.scheduler.BukkitRunnable;
import com.servicemanagement.bus.BusSubscription;

import java.util.HashMap;
import java.util.Map;

public class CommandHandler {

    private final Plugin plugin;
    private final ServiceBusClient bus;
    private final PluginConfig config;
    private BusSubscription sub;
    private BukkitRunnable heartbeatTask;

    public static class CommandReq {
        public String command;
        public String requestId;
        public String serverId;
    }

    public CommandHandler(Plugin plugin, ServiceBusClient bus, PluginConfig config) {
        this.plugin = plugin;
        this.bus = bus;
        this.config = config;
    }

    public void start() {
        String reqSub = ServiceSubjects.commandReq(config.serverId);
        String resSub = ServiceSubjects.commandRes(config.serverId);

        sub = bus.subscribeEnvelope(reqSub, CommandReq.class, config.bridgeToken, (env, req) -> {
            if (req == null || req.command == null) return;

            String command = req.command.trim();
            if (command.isEmpty() || command.length() > config.maxCommandLength) {
                publishCommandResult(resSub, req, false, "Command too long or empty");
                return;
            }
            if (!isCommandAllowed(command)) {
                publishCommandResult(resSub, req, false, "Command blocked by policy");
                return;
            }
            
            // Execute on main thread
            Bukkit.getScheduler().runTask(plugin, () -> {
                boolean success = false;
                try {
                    success = Bukkit.dispatchCommand(Bukkit.getConsoleSender(), command);
                } catch (Exception e) {
                    // Silent by design
                }
                
                // Publish response async
                boolean finalSuccess = success;
                Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
                    publishCommandResult(resSub, req, finalSuccess, finalSuccess ? null : "Command failed");
                });
            });
        });

        // Publish heartbeat on the command channels to verify liveness
        heartbeatTask = new BukkitRunnable() {
            @Override
            public void run() {
                Map<String, Object> env = new HashMap<>();
                env.put("serverId", config.serverId);
                env.put("type", "heartbeat");
                env.put("timestamp", System.currentTimeMillis());
                env.put("payload", new HashMap<>());
                bus.publish(ServiceSubjects.heartbeat(config.serverId), env);
            }
        };
        heartbeatTask.runTaskTimerAsynchronously(plugin, 20L, config.heartbeatIntervalSeconds * 20L);
    }

    public void stop() {
        if (sub != null) sub.unsubscribe();
        if (heartbeatTask != null) heartbeatTask.cancel();
    }

    private boolean isCommandAllowed(String command) {
        String base = command.split("\\s+")[0].toLowerCase();
        if (config.commandDenylist != null) {
            for (String deny : config.commandDenylist) {
                if (base.equalsIgnoreCase(deny.trim())) return false;
            }
        }
        if (config.commandAllowlist == null || config.commandAllowlist.isEmpty()) {
            return true;
        }
        for (String allow : config.commandAllowlist) {
            if (base.equalsIgnoreCase(allow.trim())) return true;
        }
        return false;
    }

    private void publishCommandResult(String resSub, CommandReq req, boolean success, String error) {
        Map<String, Object> res = new HashMap<>();
        res.put("requestId", req.requestId);
        res.put("success", success);
        res.put("command", req.command);
        if (error != null) res.put("error", error);

        Map<String, Object> env = new HashMap<>();
        env.put("serverId", config.serverId);
        env.put("type", "command_res");
        env.put("timestamp", System.currentTimeMillis());
        env.put("payload", res);
        
        bus.publish(resSub, env);
    }
}
