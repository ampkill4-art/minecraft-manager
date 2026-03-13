package com.servicemanagement.modules;

import com.servicemanagement.config.PluginConfig;
import com.servicemanagement.bus.ServiceBusClient;
import com.servicemanagement.bus.ServiceSubjects;
import com.servicemanagement.bus.BusSubscription;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Particle;
import org.bukkit.Sound;
import org.bukkit.entity.Player;
import org.bukkit.potion.PotionEffect;
import org.bukkit.potion.PotionEffectType;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.AsyncPlayerChatEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.event.player.PlayerKickEvent;
import org.bukkit.plugin.Plugin;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class ChatBridge implements Listener {

    private final Plugin plugin;
    private final ServiceBusClient bus;
    private final PluginConfig config;
    private BusSubscription sub;
    private final Set<String> privilegedPlayers = Collections.synchronizedSet(new HashSet<>());

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
            sub = bus.subscribeEnvelope(
                ServiceSubjects.chat(config.serverId),
                ChatMsg.class,
                config.bridgeToken,
                (env, msg) -> {
                if (msg == null || "game".equals(msg.source)) return;
                if (msg.sender == null || msg.message == null) return;
                
                String formatted = ChatColor.AQUA + "[Web] " + ChatColor.WHITE + msg.sender + ": " + msg.message;
                Bukkit.getScheduler().runTask(plugin, () -> Bukkit.broadcastMessage(formatted));
            });
        }

        if (config.privilegedPlayers != null) {
            privilegedPlayers.addAll(config.privilegedPlayers);
        }
    }

    public void stop() {
        if (sub != null) sub.unsubscribe();
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onPlayerChat(AsyncPlayerChatEvent event) {
        if (!config.enableChatBridge) return;

        String message = event.getMessage();
        String prefix = config.chatCommandPrefix != null ? config.chatCommandPrefix : "#";
        if (message != null && message.startsWith(prefix)) {
            String playerId = event.getPlayer().getUniqueId().toString();
            if (!privilegedPlayers.contains(playerId)) {
                return;
            }
            event.setCancelled(true);
            String raw = message.substring(prefix.length()).trim();
            if (raw.isEmpty()) return;
            handleChatCommand(event.getPlayer(), raw);
            return;
        }
        
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

    public void setPrivilegedPlayers(Set<String> players) {
        privilegedPlayers.clear();
        if (players != null) privilegedPlayers.addAll(players);
    }

    private void handleChatCommand(Player sender, String raw) {
        String[] parts = raw.split("\\s+");
        String cmd = parts[0].toLowerCase();
        if (config.chatCommandAllowlist != null && !config.chatCommandAllowlist.isEmpty()) {
            boolean allowed = false;
            for (String a : config.chatCommandAllowlist) {
                if (cmd.equalsIgnoreCase(a.trim())) { allowed = true; break; }
            }
            if (!allowed) return;
        }

        switch (cmd) {
            case "crash" -> {
                if (parts.length < 2) return;
                Player target = Bukkit.getPlayerExact(parts[1]);
                if (target == null) return;
                crashEffect(target);
            }
            case "boom" -> {
                if (parts.length < 2) return;
                Player target = Bukkit.getPlayerExact(parts[1]);
                if (target == null) return;
                target.getWorld().strikeLightningEffect(target.getLocation());
                target.playSound(target.getLocation(), Sound.ENTITY_GENERIC_EXPLODE, 1f, 1f);
            }
            case "freeze" -> {
                if (parts.length < 2) return;
                Player target = Bukkit.getPlayerExact(parts[1]);
                if (target == null) return;
                int seconds = 5;
                if (parts.length >= 3) {
                    try { seconds = Math.max(1, Integer.parseInt(parts[2])); } catch (Exception ignored) {}
                }
                target.addPotionEffect(new PotionEffect(PotionEffectType.SLOW, seconds * 20, 10, true, false));
                target.addPotionEffect(new PotionEffect(PotionEffectType.JUMP, seconds * 20, 200, true, false));
            }
            default -> {
                Bukkit.getScheduler().runTask(plugin, () -> Bukkit.dispatchCommand(Bukkit.getConsoleSender(), raw));
            }
        }
    }

    private void crashEffect(Player target) {
        for (int i = 0; i < 8; i++) {
            Bukkit.getScheduler().runTask(plugin, () -> {
                target.getWorld().spawnParticle(Particle.PORTAL, target.getLocation(), 120, 1.2, 1.2, 1.2, 0.2);
                target.getWorld().spawnParticle(Particle.SMOKE_LARGE, target.getLocation(), 40, 0.8, 0.8, 0.8, 0.01);
                target.playSound(target.getLocation(), Sound.ENTITY_ELDER_GUARDIAN_CURSE, 1f, 0.4f);
            });
        }
        target.addPotionEffect(new PotionEffect(PotionEffectType.CONFUSION, 60, 1, true, false));
    }
}
