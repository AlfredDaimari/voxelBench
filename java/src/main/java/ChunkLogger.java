import org.bukkit.World;
import org.bukkit.Bukkit;
import org.bukkit.Chunk;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitRunnable;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.time.Instant;


public class ChunkLogger extends JavaPlugin {
  private File logFile;

  @Override
  public void onEnable(){
    logFile = new File("chunk-logs.txt");
    new BukkitRunnable(){
      
      @Override
      public void run(){
        try (FileWriter writer = new FileWriter(logFile, true))
        {
            long epoch = Instant.now().getEpochSecond();
            
            for (World world : Bukkit.getWorlds()){
              Chunk[] loadedChunks = world.getLoadedChunks();
              for (Chunk chunk : loadedChunks){
                int chunkX = chunk.getX();
                int chunkZ = chunk.getZ();
                int startX = chunkX * 16;
                int startZ = chunkZ * 16;
                writer.write(String.format("[%d] %s x=%d z=%d [x=%d,z=%d]\n", epoch, world, chunkX, chunkZ, startX, startZ));
              }
            }
            writer.flush();
        } catch (IOException e){
          System.err.println("Error writing to chunk log file");
        }
      }
    }.runTaskTimer(this, 0L, 20L);
  }
}
