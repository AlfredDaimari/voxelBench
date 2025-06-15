import org.bukkit.World;
import org.bukkit.Bukkit;
import org.bukkit.Chunk;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitRunnable;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;


public class ChunkLogger extends JavaPlugin {
  private File logFile;

  @Override
  public void onEnable(){
    logFile = new File("chunk_log.txt");
    new BukkitRunnable(){
      
      @Override
      public void run(){
        try (FileWriter writer = new FileWriter(logFile, true))
        {
            String cur_time = "[" + (System.currentTimeMillis() / 1000) + "]\n";
            for (World world : Bukkit.getWorlds()){
              Chunk[] loadedChunks = world.getLoadedChunks();
              for (Chunk chunk : loadedChunks){
                int chunkX = chunk.getX();
                int chunkZ = chunk.getZ();
                writer.write(String.format("%s %s x=%d z=%d\n", cur_time, world, chunkX, chunkZ));
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
