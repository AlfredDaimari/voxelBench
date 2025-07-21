package me.bhop.velocityloadbalancer;

import com.google.inject.Inject;
import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.PostOrder;
import com.velocitypowered.api.event.connection.DisconnectEvent;
import com.velocitypowered.api.event.player.KickedFromServerEvent;
import com.velocitypowered.api.event.player.PlayerChooseInitialServerEvent;
import com.velocitypowered.api.event.proxy.ProxyInitializeEvent;
import com.velocitypowered.api.plugin.Plugin;
import com.velocitypowered.api.plugin.annotation.DataDirectory;
import com.velocitypowered.api.proxy.ProxyServer;
import com.velocitypowered.api.proxy.server.RegisteredServer;
import org.slf4j.Logger;

import java.nio.file.Path;
import java.util.*;
import java.util.stream.Collectors;

@Plugin(
        id = "loadbalancer",
        name = "LoadBalancer",
        version = "1.1",
        authors = {"bhop_", "AlfredDaimari"},
        description = "A player balancing load balancer for Velocity."
)
public class LoadBalancerPlugin {
    private final ProxyServer proxyServer;
    private final Logger logger;
    private final List<RegisteredServer> lobbies = new ArrayList<>();

    @Inject
    public LoadBalancerPlugin(ProxyServer proxyServer, Logger logger) {
        this.proxyServer = proxyServer;
        this.logger = logger;
    }

    @Subscribe
    public void onProxyInitalization(ProxyInitializeEvent event) {
        for (String serverName : proxyServer.getConfiguration().getAttemptConnectionOrder())
            proxyServer.getServer(serverName).ifPresent(lobbies::add);
        logger.info("Loaded LoadBalancer. The following servers are treated as lobbies: " + lobbies.stream().map(server -> server.getServerInfo().getName()).collect(Collectors.joining(", ")));
    }

    @Subscribe(order = PostOrder.LAST)
    public void onPlayerChooseInitialServer(PlayerChooseInitialServerEvent event) {
        // first print out the players each server has (to ensure it is working correctly)
        proxyServer.getAllServers().forEach(server -> {
            String name = server.getServerInfo().getName();
            int count = server.getPlayersConnected().size();
            logger.info("Server '{}' has {} players online.", name, count);
        });

        RegisteredServer initialServer = event.getInitialServer().orElse(null);

        if (initialServer != null){
          logger.info("Velocity chosen server was {}", initialServer.getServerInfo().getName());
        }

        Optional<RegisteredServer> target = proxyServer.getAllServers().stream()
            .min(Comparator.comparingInt(s -> s.getPlayersConnected().size()));

        if (target.isEmpty()) {
            logger.warn("No valid lobby servers detected for player '{}'. Using default server.", event.getPlayer().getUsername());
            return;
        }

        RegisteredServer chosen = target.get();
        event.setInitialServer(chosen);
        logger.info("Player '{}' assigned to server '{}'.", event.getPlayer().getUsername(), chosen.getServerInfo().getName()); 
      }
}

