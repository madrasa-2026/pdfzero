import { testCandidatePassword } from './recoveryTester';

export interface WorkerInitMsg {
  action: 'INIT';
  pdfBytes: ArrayBuffer;
}

export interface WorkerStartMsg {
  action: 'START';
  stageId: string;
  stageLabel: string;
  candidates: string[];
}

export interface WorkerControlMsg {
  action: 'PAUSE' | 'RESUME' | 'STOP';
}

export type WorkerInMessage = WorkerInitMsg | WorkerStartMsg | WorkerControlMsg;

export type WorkerOutMessage =
  | { type: 'READY'; isEncrypted: boolean }
  | {
      type: 'PROGRESS';
      stageId: string;
      stageLabel: string;
      tested: number;
      total: number;
      currentCandidate: string;
      speed: number;
    }
  | { type: 'FOUND'; password: string; stageId: string; testedTotal: number }
  | { type: 'STAGE_EXHAUSTED'; stageId: string; testedTotal: number }
  | { type: 'ERROR'; message: string };

let currentPdfBytes: Uint8Array | null = null;
let currentCandidates: string[] = [];
let currentIndex = 0;
let currentStageId = '';
let currentStageLabel = '';
let isRunning = false;
let isPaused = false;

let startTime = 0;
let stageTestedCount = 0;
let lastProgressPost = 0;

async function runTestLoop() {
  if (!isRunning || isPaused || !currentPdfBytes) return;

  const CHUNK_SIZE = 50;
  const chunkEnd = Math.min(currentIndex + CHUNK_SIZE, currentCandidates.length);

  for (let i = currentIndex; i < chunkEnd; i++) {
    if (!isRunning || isPaused) return;

    const candidate = currentCandidates[i];
    stageTestedCount++;
    currentIndex = i + 1;

    const isValid = await testCandidatePassword(currentPdfBytes, candidate);
    if (isValid) {
      isRunning = false;
      self.postMessage({
        type: 'FOUND',
        password: candidate,
        stageId: currentStageId,
        testedTotal: stageTestedCount,
      } as WorkerOutMessage);
      return;
    }

    const now = performance.now();
    // Post progress approximately every 80ms (around 12fps) to avoid main-thread saturation
    if (now - lastProgressPost > 80 || currentIndex === currentCandidates.length) {
      lastProgressPost = now;
      const elapsedSeconds = (now - startTime) / 1000;
      const speed = elapsedSeconds > 0 ? Math.round(stageTestedCount / elapsedSeconds) : 0;

      self.postMessage({
        type: 'PROGRESS',
        stageId: currentStageId,
        stageLabel: currentStageLabel,
        tested: stageTestedCount,
        total: currentCandidates.length,
        currentCandidate: candidate,
        speed,
      } as WorkerOutMessage);
    }
  }

  if (currentIndex < currentCandidates.length) {
    // Yield execution to allow processing incoming worker messages (e.g. PAUSE or STOP)
    setTimeout(runTestLoop, 0);
  } else {
    // Stage completed without finding password
    isRunning = false;
    self.postMessage({
      type: 'STAGE_EXHAUSTED',
      stageId: currentStageId,
      testedTotal: stageTestedCount,
    } as WorkerOutMessage);
  }
}

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const data = e.data;
  if (!data) return;

  switch (data.action) {
    case 'INIT': {
      try {
        currentPdfBytes = new Uint8Array(data.pdfBytes);
        // Quick probe with empty string
        const isOpen = await testCandidatePassword(currentPdfBytes, '');
        self.postMessage({
          type: 'READY',
          isEncrypted: !isOpen,
        } as WorkerOutMessage);
      } catch (err: any) {
        self.postMessage({
          type: 'ERROR',
          message: err?.message || 'Failed to initialize PDF in worker',
        } as WorkerOutMessage);
      }
      break;
    }

    case 'START': {
      currentStageId = data.stageId;
      currentStageLabel = data.stageLabel;
      currentCandidates = data.candidates || [];
      currentIndex = 0;
      stageTestedCount = 0;
      isRunning = true;
      isPaused = false;
      startTime = performance.now();
      lastProgressPost = startTime;
      runTestLoop();
      break;
    }

    case 'PAUSE': {
      isPaused = true;
      break;
    }

    case 'RESUME': {
      if (isPaused) {
        isPaused = false;
        runTestLoop();
      }
      break;
    }

    case 'STOP': {
      isRunning = false;
      isPaused = false;
      currentCandidates = [];
      currentIndex = 0;
      break;
    }
  }
};
