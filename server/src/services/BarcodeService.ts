import sharp from 'sharp';
import { MultiFormatReader, BinaryBitmap, HybridBinarizer, RGBLuminanceSource, DecodeHintType } from '@zxing/library';
import { prisma } from '../index';

export class BarcodeService {
  /**
   * Decodes barcode/QR code from image buffer.
   */
  static async detectBarcode(buffer: Buffer): Promise<{ text: string; format: string } | null> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height) return null;
      
      // Get raw pixel buffer
      const { data, info } = await image
        .raw()
        .toBuffer({ resolveWithObject: true });
        
      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      
      const reader = new MultiFormatReader();
      reader.setHints(hints);
      
      const len = info.width * info.height;
      const rgbArray = new Int32Array(len);
      for (let i = 0; i < len; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        rgbArray[i] = (r << 16) | (g << 8) | b;
      }
      
      const luminanceSource = new RGBLuminanceSource(rgbArray, info.width, info.height);
      const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
      
      const result = reader.decode(binaryBitmap);
      return {
        text: result.getText(),
        format: result.getBarcodeFormat().toString(),
      };
    } catch (err) {
      // ZXing throws when no barcode is found; return null gracefully
      return null;
    }
  }

  /**
   * Looks up a product in the database by barcode or part_number.
   */
  static async lookupProduct(barcode: string): Promise<any | null> {
    return prisma.parts.findFirst({
      where: {
        is_active: true,
        OR: [
          { barcode: barcode },
          { part_number: barcode }
        ]
      }
    });
  }
}
