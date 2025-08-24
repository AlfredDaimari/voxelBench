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

        Optional<RegisteredServer> target; 
        String username = event.getPlayer().getUsername();
        Integer nb = this.extractNumberBetweenNandB(username);

        if (nb != null){
          String targetName = "vm" + (nb + 2);
          target = proxyServer.getAllServers().stream()
            .filter(s -> s.getServerInfo().getName().equalsIgnoreCase(targetName))
            .findFirst();
        } else {
          // now this is the fallback option
          target = proxyServer.getAllServers().stream()
            .min(Comparator.comparingInt(s -> s.getPlayersConnected().size()));
        }

        proxyServer.getAllServers().forEach(server -> {
            String name = server.getServerInfo().getName();
            int count = server.getPlayersConnected().size();
            logger.info("Server '{}' has {} players online.", name, count);
        });

        RegisteredServer initialServer = event.getInitialServer().orElse(null);

        if (initialServer != null){
          logger.info("Velocity chosen server was {}", initialServer.getServerInfo().getName());
        }

        if (target.isEmpty()) {
            logger.warn("No valid lobby servers detected for player '{}'. Using default server.", event.getPlayer().getUsername());
            return;
        }

        RegisteredServer chosen = target.get();
        event.setInitialServer(chosen);
        logger.info("Player '{}' assigned to server '{}'.", event.getPlayer().getUsername(), chosen.getServerInfo().getName()); 
      }

    private Integer extractNumberBetweenNandB(String user){
      int n = user.indexOf('N');
      if (n < 0){
        logger.warn("Something went wrong with the player's Username. No N loc found!");
        return null;
      }

      int b = user.indexOf('B', n+1);
      if (b < 0 || b == n + 1){
        logger.warn("Something went wrong with the player's Username. No B loc found!");
        return null;
      }

      String bot_num = user.substring(n+1, b);

      try {
        return Integer.parseInt(bot_num);
      } catch (NumberFormatException e){
        return null;
      }

    }
}

