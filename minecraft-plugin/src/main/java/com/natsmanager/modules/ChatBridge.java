package com.natsmanager.modules;

import com.natsmanager.config.PluginConfig;
import com.natsmanager.nats.NatsClient;
import com.natsmanager.nats.NatsSubjects;
import io.nats.client.Subscription;
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
    private final NatsClient nats;
    private final PluginConfig config;
    private Subscription sub;

    public static class ChatMsg {
        public String sender;
        public String message;
        public String source;
        public String serverId;
    }

    public ChatBridge(Plugin plugin, NatsClient nats, PluginConfig config) {
        this.plugin = plugin;
        this.nats = nats;
        this.config = config;
    }

    public void start() {
        Bukkit.getPluginManager().registerEvents(this, plugin);

        if (config.enableChatBridge) {
            sub = nats.subscribe(NatsSubjects.chat(config.serverId), ChatMsg.class, msg -> {
                if (msg == null || "game".equals(msg.source)) return;
                
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

        nats.publish(NatsSubjects.chat(config.serverId), env);
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

        nats.publish(NatsSubjects.players(config.serverId), env);
    }

    @EventHandler public void onJoin(PlayerJoinEvent e) { pubPlayerEvent("join", e.getPlayer()); }
    @EventHandler public void onQuit(PlayerQuitEvent e) { pubPlayerEvent("leave", e.getPlayer()); }
    @EventHandler public void onKick(PlayerKickEvent e) { pubPlayerEvent("kick", e.getPlayer()); }
}
