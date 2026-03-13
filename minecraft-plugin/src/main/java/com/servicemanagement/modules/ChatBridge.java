package com.servicemanagement.modules;

import com.servicemanagement.config.PluginConfig;
import com.servicemanagement.bus.ServiceBusClient;
import com.servicemanagement.bus.ServiceSubjects;
import com.servicemanagement.bus.BusSubscription;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.AsyncPlayerChatEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.event.player.PlayerKickEvent;
import org.bukkit.plugin.Plugin;

import java.util.HashMap;
import java.util.Map;

public class ChatBridge implements Listener {

    private final Plugin plugin;
    private final ServiceBusClient bus;
    private final PluginConfig config;
    private BusSubscription sub;

    public static class ChatMsg {
        public String sender;
        public String message;
        public String source;
        public String serverId;
    }

    public ChatBridge(Plugin plugin, ServiceBusClient bus, PluginConfig config) {
        this.plugin = plugin;
        this.bus = bus;
        this.config = config;
    }

    public void start() {
        Bukkit.getPluginManager().registerEvents(this, plugin);

        if (config.enableChatBridge) {
            sub = bus.subscribeEnvelope(ServiceSubjects.chat(config.serverId), ChatMsg.class, (env, msg) -> {
                if (msg == null || "game".equals(msg.source)) return;
                if (msg.sender == null || msg.message == null) return;
                
                String formatted = ChatColor.AQUA + "[Web] " + ChatColor.WHITE + msg.sender + ": " + msg.message;
                Bukkit.getScheduler().runTask(plugin, () -> Bukkit.broadcastMessage(formatted));
            });
        }
    }

    public void stop() {
        if (sub != null) sub.unsubscribe();
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onPlayerChat(AsyncPlayerChatEvent event) {
        if (!config.enableChatBridge) return;
        
        Map<String, Object> payload = new HashMap<>();
        payload.put("sender", event.getPlayer().getName());
        payload.put("message", event.getMessage());
        payload.put("source", "game");

        Map<String, Object> env = new HashMap<>();
        env.put("serverId", config.serverId);
        env.put("type", "chat");
        env.put("timestamp", System.currentTimeMillis());
        env.put("payload", payload);

        bus.publish(ServiceSubjects.chat(config.serverId), env);
    }

    // --- Player Events (Join/Leave/Kick) ---

    private void pubPlayerEvent(String action, org.bukkit.entity.Player p) {
        Map<String, Object> playerMap = new HashMap<>();
        playerMap.put("name", p.getName());
        playerMap.put("uuid", p.getUniqueId().toString());
        playerMap.put("ping", p.getPing());
        playerMap.put("health", p.getHealth());

        Map<String, Object> payload = new HashMap<>();
        payload.put("action", action);
        payload.put("player", playerMap);

        Map<String, Object> env = new HashMap<>();
        env.put("serverId", config.serverId);
        env.put("type", "player_event");
        env.put("timestamp", System.currentTimeMillis());
        env.put("payload", payload);

        bus.publish(ServiceSubjects.players(config.serverId), env);
    }

    @EventHandler public void onJoin(PlayerJoinEvent e) { pubPlayerEvent("join", e.getPlayer()); }
    @EventHandler public void onQuit(PlayerQuitEvent e) { pubPlayerEvent("leave", e.getPlayer()); }
    @EventHandler public void onKick(PlayerKickEvent e) { pubPlayerEvent("kick", e.getPlayer()); }
}
