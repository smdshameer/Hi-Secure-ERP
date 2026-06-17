import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export class AppMetadataService {
  private static applicationVersion = '1.0.0';
  private static gitCommit = 'N/A';
  private static buildDate = new Date().toISOString();
  private static initialized = false;

  public static initialize() {
    if (this.initialized) return;
    
    // 1. Read version from package.json
    try {
      const pkgPath = path.resolve(__dirname, '..', '..', 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        this.applicationVersion = pkg.version || '1.0.0';
      }
    } catch (err: any) {
      console.warn('[AppMetadataService] Failed to read version from package.json:', err.message);
    }

    // 2. Read git commit once at startup
    try {
      const commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
      this.gitCommit = commit || 'N/A';
    } catch (err: any) {
      this.gitCommit = 'N/A';
    }

    this.initialized = true;
    console.log(`[AppMetadataService] Initialized: Version=${this.applicationVersion}, Commit=${this.gitCommit}, BuildDate=${this.buildDate}`);
  }

  public static getMetadata() {
    this.initialize();
    return {
      applicationVersion: this.applicationVersion,
      gitCommit: this.gitCommit,
      buildDate: this.buildDate
    };
  }
}
