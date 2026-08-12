type StopProjectStream = () => void | Promise<void>;

class ProjectScopedStreamRegistry {
  private readonly stops = new Set<StopProjectStream>();

  register(stop: StopProjectStream): () => void {
    this.stops.add(stop);
    return () => this.stops.delete(stop);
  }

  async stopAll(): Promise<void> {
    const active = [...this.stops];
    this.stops.clear();
    await Promise.allSettled(active.map((stop) => Promise.resolve(stop())));
  }

  size(): number {
    return this.stops.size;
  }
}

export const projectScopedStreams = new ProjectScopedStreamRegistry();
