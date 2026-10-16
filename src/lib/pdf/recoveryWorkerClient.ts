import type { WorkerInMessage, WorkerOutMessage } from './recovery.worker';

export interface RecoveryBatch {
  stageId: string;
  stageLabel: string;
  candidates: string[];
}

export interface RecoveryProgress {
  stageId: string;
  stageLabel: string;
  stageIndex: number;
  totalStages: number;
  stageTested: number;
  stageTotal: number;
  overallTested: number;
  overallTotal: number;
  currentCandidate: string;
  speed: number; // tests per second
  percent: number;
  estimatedRemainingSeconds: number;
}

export interface WorkerClientCallbacks {
  onProgress?: (progress: RecoveryProgress) => void;
  onFound?: (password: string, stageId: string) => void;
  onStageComplete?: (stageId: string, stageLabel: string) => void;
  onAllExhausted?: (totalTested: number) => void;
  onError?: (err: string) => void;
}

export class RecoveryWorkerClient {
  private worker: Worker | null = null;
  private batches: RecoveryBatch[] = [];
  private currentBatchIndex = 0;
  private callbacks: WorkerClientCallbacks = {};
  private pdfBytes: ArrayBuffer | null = null;
  private isRunning = false;
  private isPaused = false;
  private totalCandidateCount = 0;
  private cumulativeTestedPrior = 0;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      this.worker = new Worker(new URL('./recovery.worker.ts', import.meta.url), {
        type: 'module',
      });
      this.worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => this.handleMessage(e.data);
      this.worker.onerror = (e) => {
        this.callbacks.onError?.(e.message || 'Worker runtime error');
      };
    } catch (err: any) {
      console.warn('Web Worker initialization failed, fallback required:', err);
    }
  }

  public async setPdfFile(file: File): Promise<boolean> {
    this.pdfBytes = await file.arrayBuffer();
    if (!this.worker) this.initWorker();

    return new Promise((resolve, reject) => {
      if (!this.worker || !this.pdfBytes) {
        resolve(true);
        return;
      }

      const handler = (e: MessageEvent<WorkerOutMessage>) => {
        if (e.data.type === 'READY') {
          this.worker?.removeEventListener('message', handler);
          resolve(e.data.isEncrypted);
        } else if (e.data.type === 'ERROR') {
          this.worker?.removeEventListener('message', handler);
          reject(new Error(e.data.message));
        }
      };

      this.worker.addEventListener('message', handler);
      this.worker.postMessage({
        action: 'INIT',
        pdfBytes: this.pdfBytes,
      } as WorkerInMessage);
    });
  }

  public start(batches: RecoveryBatch[], callbacks: WorkerClientCallbacks) {
    if (!this.worker || !this.pdfBytes) {
      callbacks.onError?.('No PDF loaded or worker not ready');
      return;
    }

    this.batches = batches;
    this.currentBatchIndex = 0;
    this.callbacks = callbacks;
    this.isRunning = true;
    this.isPaused = false;
    this.cumulativeTestedPrior = 0;

    this.totalCandidateCount = batches.reduce((sum, b) => sum + b.candidates.length, 0);

    this.startCurrentBatch();
  }

  private startCurrentBatch() {
    if (!this.isRunning || this.currentBatchIndex >= this.batches.length) {
      this.isRunning = false;
      this.callbacks.onAllExhausted?.(this.cumulativeTestedPrior);
      return;
    }

    const batch = this.batches[this.currentBatchIndex];
    this.worker?.postMessage({
      action: 'START',
      stageId: batch.stageId,
      stageLabel: batch.stageLabel,
      candidates: batch.candidates,
    } as WorkerInMessage);
  }

  private handleMessage(msg: WorkerOutMessage) {
    if (!this.isRunning && msg.type !== 'FOUND') return;

    switch (msg.type) {
      case 'PROGRESS': {
        const overallTested = this.cumulativeTestedPrior + msg.tested;
        const percent = this.totalCandidateCount > 0
          ? Math.min(100, Math.round((overallTested / this.totalCandidateCount) * 100))
          : 0;

        const remainingCount = Math.max(0, this.totalCandidateCount - overallTested);
        const eta = msg.speed > 0 ? Math.round(remainingCount / msg.speed) : 0;

        this.callbacks.onProgress?.({
          stageId: msg.stageId,
          stageLabel: msg.stageLabel,
          stageIndex: this.currentBatchIndex,
          totalStages: this.batches.length,
          stageTested: msg.tested,
          stageTotal: msg.total,
          overallTested,
          overallTotal: this.totalCandidateCount,
          currentCandidate: msg.currentCandidate,
          speed: msg.speed,
          percent,
          estimatedRemainingSeconds: eta,
        });
        break;
      }

      case 'FOUND': {
        this.isRunning = false;
        this.callbacks.onFound?.(msg.password, msg.stageId);
        break;
      }

      case 'STAGE_EXHAUSTED': {
        const batch = this.batches[this.currentBatchIndex];
        this.cumulativeTestedPrior += batch.candidates.length;
        this.callbacks.onStageComplete?.(msg.stageId, batch.stageLabel);

        this.currentBatchIndex++;
        if (this.currentBatchIndex < this.batches.length) {
          this.startCurrentBatch();
        } else {
          this.isRunning = false;
          this.callbacks.onAllExhausted?.(this.cumulativeTestedPrior);
        }
        break;
      }

      case 'ERROR': {
        this.isRunning = false;
        this.callbacks.onError?.(msg.message);
        break;
      }
    }
  }

  public pause() {
    if (this.isRunning && !this.isPaused) {
      this.isPaused = true;
      this.worker?.postMessage({ action: 'PAUSE' } as WorkerInMessage);
    }
  }

  public resume() {
    if (this.isRunning && this.isPaused) {
      this.isPaused = false;
      this.worker?.postMessage({ action: 'RESUME' } as WorkerInMessage);
    }
  }

  public stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.worker?.postMessage({ action: 'STOP' } as WorkerInMessage);
  }

  public terminate() {
    this.stop();
    this.worker?.terminate();
    this.worker = null;
  }
}
