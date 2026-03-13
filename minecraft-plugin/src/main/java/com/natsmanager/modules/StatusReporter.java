package com.natsmanager.modules;

import com.natsmanager.config.PluginConfig;
import com.natsmanager.nats.NatsClient;
import com.natsmanager.nats.NatsSubjects;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.plugin.Plugin;
import org.bukkit.scheduler.BukkitRunnable;

import java.lang.management.ManagementFactory;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class StatusReporter extends BukkitRunnable {

    private final Plugin plugin;
    private final NatsClient nats;
    private final PluginConfig config;

    public StatusReporter(Plugin plugin, NatsClient nats, PluginConfig config) {
        this.plugin = plugin;
        this.nats = nats;
        this.config = config;
    }

    @Override
    public void run() {
        if (!nats.isConnected()) return;

        Map<String, Object> payload = new HashMap<>();
        
        // TPS (Bukkit.getTPS() is a Paper method)
        double[] tps = Bukkit.getTPS();
        payload.put("tps", tps[0]); // 1-minute average

        // Memory
        Runtime runtime = Runtime.getRuntime();
        long maxM = runtime.maxMemory() / (1024 * 1024);
        long usedM = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024);
        payload.put("memoryMax", maxM);
        payload.put("memoryUsed", usedM);

        // CPU
        com.sun.management.OperatingSystemMXBean osBean = 
            (com.sun.management.OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
        double cpu = osBean.getCpuLoad() * 100.0;
        if (cpu < 0) cpu = 0; // Fixes -1 on Windows sometimes
        payload.put("cpuUsage", cpu);

        // Players
        payload.put("playerCount", Bukkit.getOnlinePlayers().size());
        payload.put("maxPlayers", Bukkit.getMaxPlayers());
        
        List<Map<String, Object>> players = new ArrayList<>();
        for (Player p : Bukkit.getOnlinePlayers()) {
            Map<String, Object> pd = new HashMap<>();
            pd.put("name", p.getName());
            pd.put("uuid", p.getUniqueId().toString());
            pd.put("ping", p.getPing());
            pd.put("health", p.getHealth());
            players.add(pd);
        }
        payload.put("players", players);

        // Server info
        payload.put("version", Bukkit.getVersion());
        long uptime = ManagementFactory.getRuntimeMXBean().getUptime() / 1000;
        payload.put("uptime", uptime);

        // Envelope wrapping
        Map<String, Object> env = new HashMap<>();
        env.put("serverId", config.serverId);
        env.put("type", "status");
        env.put("timestamp", System.currentTimeMillis());
        env.put("payload", payload);

        nats.publish(NatsSubjects.status(config.serverId), env);
    }
}
