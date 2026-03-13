package com.servicemanagement.modules;

import com.servicemanagement.config.PluginConfig;
import com.servicemanagement.bus.ServiceBusClient;
import com.servicemanagement.bus.ServiceSubjects;
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
    private final ServiceBusClient bus;
    private final PluginConfig config;

    public StatusReporter(Plugin plugin, ServiceBusClient bus, PluginConfig config) {
        this.plugin = plugin;
        this.bus = bus;
        this.config = config;
    }

    @Override
    public void run() {
        if (!bus.isConnected()) return;

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
            Map<String, Object> pos = new HashMap<>();
            pos.put("x", p.getLocation().getX());
            pos.put("y", p.getLocation().getY());
            pos.put("z", p.getLocation().getZ());
            pd.put("position", pos);
            players.add(pd);
        }
        payload.put("players", players);

        // Server info
        payload.put("version", Bukkit.getVersion());
        payload.put("motd", Bukkit.getMotd());
        long uptime = ManagementFactory.getRuntimeMXBean().getUptime() / 1000;
        payload.put("uptime", uptime);

        // Envelope wrapping
        Map<String, Object> env = new HashMap<>();
        env.put("serverId", config.serverId);
        env.put("type", "status");
        env.put("timestamp", System.currentTimeMillis());
        env.put("payload", payload);

        bus.publish(ServiceSubjects.status(config.serverId), env);
    }
}
