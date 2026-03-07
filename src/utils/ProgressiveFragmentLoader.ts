import * as OBC from "@thatopen/components";

export interface ProgressiveLoaderOptions {
  chunkSize: number;
  chunkDelayMs: number;
  maxRetries: number;
  onProgress?: (loaded: number, total: number, chunkIndex: number) => void;
  onChunkLoaded?: (chunkIndex: number, success: boolean) => void;
  onComplete?: (success: boolean, totalLoaded: number) => void;
  onError?: (error: Error, chunkIndex: number, retries: number) => void;
}

export class ProgressiveFragmentLoader {
  private fragments: OBC.FragmentsManager;
  private isLoading: boolean = false;
  private abortController: AbortController | null = null;

  constructor(fragments: OBC.FragmentsManager) {
    this.fragments = fragments;
  }

  async fetchModel(path: string): Promise<ArrayBuffer | null> {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        console.warn(
          `[ProgressiveLoader] Failed to fetch ${path}: ${response.status}`,
        );
        return null;
      }
      return await response.arrayBuffer();
    } catch (error) {
      console.warn(`[ProgressiveLoader] Error fetching ${path}:`, error);
      return null;
    }
  }

  async loadModel(
    path: string,
    modelId: string,
    options: ProgressiveLoaderOptions,
  ): Promise<boolean> {
    if (this.isLoading) {
      console.warn("[ProgressiveLoader] Already loading, please wait");
      return false;
    }

    this.isLoading = true;
    this.abortController = new AbortController();

    const {
      chunkSize = 5,
      chunkDelayMs = 100,
      maxRetries = 1,
      onProgress,
      onChunkLoaded,
      onComplete,
      onError,
    } = options;

    try {
      console.log(
        `[ProgressiveLoader] Starting: ${path}, chunkSize: ${chunkSize}`,
      );

      const buffer = await this.fetchModel(path);
      if (!buffer) {
        this.isLoading = false;
        onComplete?.(false, 0);
        return false;
      }

      const chunks = this.splitBuffer(buffer, chunkSize);
      let loadedChunks = 0;
      let totalRetries = 0;

      for (let i = 0; i < chunks.length; i++) {
        if (this.abortController?.signal.aborted) {
          console.log("[ProgressiveLoader] Loading aborted");
          break;
        }

        let success = false;
        let retries = 0;

        while (!success && retries <= maxRetries) {
          try {
            await this.fragments.core.load(new Uint8Array(chunks[i]), {
              modelId: `${modelId}_${i}`,
            });
            success = true;
          } catch (error) {
            retries++;
            totalRetries++;
            const err = error as Error;
            console.warn(
              `[ProgressiveLoader] Chunk ${i} failed (attempt ${retries}):`,
              err.message,
            );
            onError?.(err, i, retries);

            if (retries > maxRetries) {
              console.error(
                `[ProgressiveLoader] Chunk ${i} failed after ${maxRetries} retries`,
              );
              break;
            }

            await this.delay(chunkDelayMs * 2);
          }
        }

        loadedChunks += success ? 1 : 0;
        onProgress?.(loadedChunks, chunks.length, i);
        onChunkLoaded?.(i, success);

        if (i < chunks.length - 1) {
          await this.delay(chunkDelayMs);
        }
      }

      const success = loadedChunks === chunks.length;
      console.log(
        `[ProgressiveLoader] Complete: ${loadedChunks}/${chunks.length} chunks loaded, retries: ${totalRetries}`,
      );

      this.isLoading = false;
      onComplete?.(success, loadedChunks);
      return success;
    } catch (error) {
      console.error("[ProgressiveLoader] Fatal error:", error);
      this.isLoading = false;
      onComplete?.(false, 0);
      return false;
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.isLoading = false;
      console.log("[ProgressiveLoader] Loading aborted by user");
    }
  }

  private splitBuffer(buffer: ArrayBuffer, chunkSize: number): ArrayBuffer[] {
    const chunks: ArrayBuffer[] = [];
    const totalSize = buffer.byteLength;
    const step = Math.ceil(totalSize / chunkSize);

    for (let i = 0; i < chunkSize; i++) {
      const start = i * step;
      const end = Math.min(start + step, totalSize);

      if (start < totalSize) {
        const chunk = buffer.slice(start, end);
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function createProgressiveLoader(
  fragments: OBC.FragmentsManager,
): ProgressiveFragmentLoader {
  return new ProgressiveFragmentLoader(fragments);
}
