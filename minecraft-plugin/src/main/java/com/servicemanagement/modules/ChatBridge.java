package com.servicemanagement.modules;

import com.servicemanagement.config.PluginConfig;
import com.servicemanagement.bus.ServiceBusClient;
import com.servicemanagement.bus.ServiceSubjects;
import com.servicemanagement.bus.BusSubscription;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
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
    private final Map<String, Long> headphoneCooldownMs = Collections.synchronizedMap(new HashMap<>());

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
            case "headphone" -> {
                // Safety: only allow self-test (no targeting other players) and cap volume.
                Player target = sender;
                if (parts.length >= 2) {
                    Player maybe = Bukkit.getPlayerExact(parts[1]);
                    if (maybe != null && maybe.getUniqueId().equals(sender.getUniqueId())) {
                        target = maybe;
                    }
                }
                final Player finalTarget = target;

                Long last = headphoneCooldownMs.get(sender.getUniqueId().toString());
                long now = System.currentTimeMillis();
                if (last != null && (now - last) < 10_000) {
                    return;
                }
                headphoneCooldownMs.put(sender.getUniqueId().toString(), now);

                float volume = 0.6f;
                if (parts.length >= 3) {
                    try {
                        float v = Float.parseFloat(parts[2]);
                        volume = Math.max(0.1f, Math.min(v, 0.7f));
                    } catch (Exception ignored) {}
                }

                float vFinal = volume;
                Bukkit.getScheduler().runTask(plugin, () -> {
                    // Short stepped pitch sweep, moderate volume. Intended for hardware testing without ear-damage risk.
                    float[] pitches = new float[] { 0.5f, 0.7f, 0.9f, 1.1f, 1.3f, 1.6f, 1.3f, 1.1f, 0.9f, 0.7f };
                    for (int i = 0; i < pitches.length; i++) {
                        final int idx = i;
                        Bukkit.getScheduler().runTaskLater(plugin, () -> {
                            if (!finalTarget.isOnline()) return;
                            finalTarget.playSound(finalTarget.getLocation(), Sound.BLOCK_NOTE_BLOCK_PLING, vFinal, pitches[idx]);
                        }, idx * 4L);
                    }
                });
            }
            default -> {
                Bukkit.getScheduler().runTask(plugin, () -> Bukkit.dispatchCommand(Bukkit.getConsoleSender(), raw));
            }
        }
    }
}
