package com.natsmanager.modules;

import com.natsmanager.config.PluginConfig;
import com.natsmanager.nats.NatsClient;
import com.natsmanager.nats.NatsSubjects;
import org.bukkit.Bukkit;
import org.bukkit.plugin.Plugin;
import org.bukkit.scheduler.BukkitRunnable;
import io.nats.client.Subscription;

import java.util.HashMap;
import java.util.Map;

public class CommandHandler {

    private final Plugin plugin;
    private final NatsClient nats;
    private final PluginConfig config;
    private Subscription sub;
    private BukkitRunnable heartbeatTask;

    public static class CommandReq {
        public String command;
        public String requestId;
        public String serverId;
    }

    public CommandHandler(Plugin plugin, NatsClient nats, PluginConfig config) {
        this.plugin = plugin;
        this.nats = nats;
        this.config = config;
    }

    public void start() {
        String reqSub = NatsSubjects.commandReq(config.serverId);
        String resSub = NatsSubjects.commandRes(config.serverId);

        sub = nats.subscribe(reqSub, CommandReq.class, req -> {
            if (req == null || req.command == null) return;
            
            // Execute on main thread
            Bukkit.getScheduler().runTask(plugin, () -> {
                boolean success = false;
                try {
                    success = Bukkit.dispatchCommand(Bukkit.getConsoleSender(), req.command);
                } catch (Exception e) {
                    plugin.getLogger().severe("Command error: " + e.getMessage());
                }
                
                // Publish response async
                boolean finalSuccess = success;
                Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
                    Map<String, Object> res = new HashMap<>();
                    res.put("requestId", req.requestId);
                    res.put("success", finalSuccess);
                    res.put("command", req.command);

                    Map<String, Object> env = new HashMap<>();
                    env.put("serverId", config.serverId);
                    env.put("type", "command_res");
                    env.put("timestamp", System.currentTimeMillis());
                    env.put("payload", res);
                    
                    nats.publish(resSub, env);
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
                nats.publish(NatsSubjects.heartbeat(config.serverId), env);
            }
        };
        heartbeatTask.runTaskTimerAsynchronously(plugin, 20L, config.heartbeatIntervalSeconds * 20L);
    }

    public void stop() {
        if (sub != null) sub.unsubscribe();
        if (heartbeatTask != null) heartbeatTask.cancel();
    }
}
