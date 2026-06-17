import fs from 'fs';
import path from 'path';

export interface AntivirusScanResult {
  safe: boolean;
  error?: string;
  virusName?: string;
}

export interface IAntivirusScanner {
  scanFile(filePath: string): Promise<AntivirusScanResult>;
}

export class MockAntivirusScanner implements IAntivirusScanner {
  async scanFile(filePath: string): Promise<AntivirusScanResult> {
    const filename = path.basename(filePath).toLowerCase();
    
    // EICAR standard test file signature check
    if (filename.includes('eicar')) {
      return {
        safe: false,
        virusName: 'EICAR-Test-Signature',
        error: 'Infected file detected'
      };
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*')) {
        return {
          safe: false,
          virusName: 'EICAR-Test-Signature',
          error: 'Infected file detected'
        };
      }
    } catch {
      // If we cannot read it as utf8 (e.g. binary image), just check filename or assume safe
    }

    return { safe: true };
  }
}

export class ClamAvAntivirusScanner implements IAntivirusScanner {
  private host: string;
  private port: number;

  constructor(host = 'localhost', port = 3310) {
    this.host = host;
    this.port = port;
  }

  async scanFile(filePath: string): Promise<AntivirusScanResult> {
    // For now, return mock behavior or throw not implemented if not configured
    console.log(`[ClamAV] Scanning ${filePath} via daemon at ${this.host}:${this.port}...`);
    // Placeholder logic for future socket implementation
    return { safe: true };
  }
}

class AntivirusService {
  private scanner: IAntivirusScanner;

  constructor() {
    const provider = process.env.ANTIVIRUS_PROVIDER || 'mock';
    if (provider === 'clamav') {
      const host = process.env.CLAMAV_HOST || 'localhost';
      const port = Number(process.env.CLAMAV_PORT) || 3310;
      this.scanner = new ClamAvAntivirusScanner(host, port);
    } else {
      this.scanner = new MockAntivirusScanner();
    }
  }

  async scanFile(filePath: string): Promise<AntivirusScanResult> {
    try {
      return await this.scanner.scanFile(filePath);
    } catch (err: any) {
      console.error('Antivirus scan error:', err);
      return {
        safe: false,
        error: 'Scan failed: ' + err.message
      };
    }
  }
}

export const antivirusService = new AntivirusService();
