export class SupplierTemplateService {
  /**
   * Detects the supplier template based on keywords in the text.
   */
  public static detectTemplate(text: string): 'HIKVISION' | 'DAHUA' | 'CP_PLUS' | 'ZKTECO' | 'ESSL' | 'UNKNOWN' {
    if (!text) return 'UNKNOWN';
    const lowerText = text.toLowerCase();

    if (lowerText.includes('hikvision') || lowerText.includes('hik vision')) {
      return 'HIKVISION';
    }
    if (lowerText.includes('dahua')) {
      return 'DAHUA';
    }
    if (lowerText.includes('cp plus') || lowerText.includes('cpplus')) {
      return 'CP_PLUS';
    }
    if (lowerText.includes('zkteco') || lowerText.includes('zkte co') || lowerText.includes('zk access') || lowerText.includes('zkaccess')) {
      return 'ZKTECO';
    }
    if (lowerText.includes('essl') || lowerText.includes('e-ssl') || lowerText.includes('security solutions')) {
      // Check for essl specific biometric indicators if necessary, but "essl" or "e-ssl" is standard
      if (lowerText.includes('essl') || lowerText.includes('e-ssl')) {
        return 'ESSL';
      }
    }

    return 'UNKNOWN';
  }

  /**
   * Retrieves prompt hints for the detected template to assist NIM AI extraction.
   */
  public static getPromptHint(template: 'HIKVISION' | 'DAHUA' | 'CP_PLUS' | 'ZKTECO' | 'ESSL' | 'UNKNOWN'): string {
    switch (template) {
      case 'HIKVISION':
        return `Hint: Hikvision catalogs typically list security cameras, NVRs, and accessories.
- Model numbers usually start with "DS-2", "DS-7", "DS-9", "DS-K", or "DS-P" (e.g. DS-2CD2043G2-I).
- Cost price is usually under column "Recommended Retail Price (INR)", "MRP", or "Dealer Price".
- Brand must always be set to "Hikvision".`;
        
      case 'DAHUA':
        return `Hint: Dahua catalogs list IP cameras, HDCVI cameras, and recorders.
- Model numbers usually start with "DH-" (e.g. DH-HAC-HFW1200RP, DH-IPC-HFW2431SP).
- Extract matching prices for each model.
- Brand must always be set to "Dahua".`;

      case 'CP_PLUS':
        return `Hint: CP Plus catalogs list cameras, DVRs, and NVRs.
- Model numbers usually start with "CP-" (e.g. CP-UNC-DA41L2-V2, CP-UVR-0401E1-CS).
- Price might be listed under "Dealer Price" or "MRP".
- Brand must always be set to "CP Plus".`;

      case 'ZKTECO':
        return `Hint: ZKTeco catalogs list biometric time attendance and access control systems.
- Model numbers include common devices like "MB20", "F18", "K40", "iClock9000", "uFace800".
- Brand must always be set to "ZKTeco".
- Category must map to "Biometric" or "Access Control".`;

      case 'ESSL':
        return `Hint: eSSL catalogs list biometric attendance and access control systems.
- Model numbers commonly include "eSSL K90", "H5", "X990", "F22", "K30", "Identix".
- Brand must always be set to "eSSL".
- Category must map to "Biometric" or "Access Control".`;

      default:
        return 'Hint: Extract all visible product name, model number, cost price (or MRP), and category if possible.';
    }
  }
}
