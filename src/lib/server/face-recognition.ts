// Face recognition wrapper - calls Python InsightFace script
// Runs in the Node container (python3 + insightface installed in Dockerfile)

import { spawn } from 'child_process';
import { resolve } from 'path';
import { env } from '$env/dynamic/private';

const SCRIPT_PATH = resolve('scripts/face_recognition.py');
const DB_PATH = resolve(env.DATABASE_PATH || './data/db.sqlite');

function runPythonScript(command: string): Promise<any> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('python3', [SCRIPT_PATH, command, DB_PATH], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, UPLOAD_DIR: env.UPLOAD_DIR || './data/uploads' }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Python script exited with code ${code}`));
        return;
      }
      try {
        resolvePromise(JSON.parse(stdout.trim()));
      } catch (e) {
        reject(new Error(`Failed to parse Python output: ${stdout}`));
      }
    });

    child.on('error', (err) => reject(err));
  });
}

export interface FaceRecognitionStats {
  totalPhotos: number;
  photosWithFaces: number;
  totalFaces: number;
  peopleWithReferences: number;
  aiTags: number;
}

export interface FaceRecognitionResult {
  tagged: number;
  processed: number;
}

export async function runFaceRecognitionBackfill(): Promise<FaceRecognitionResult> {
  return runPythonScript('backfill');
}

export async function getFaceRecognitionStats(): Promise<FaceRecognitionStats> {
  return runPythonScript('stats');
}