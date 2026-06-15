import { prisma } from '../index';

export class DocumentSeriesService {
  /**
   * Generates the next sequential document number for a given module.
   * Uses row-level locking (SELECT ... FOR UPDATE) to ensure concurrency safety.
   */
  static async generateNextNumber(module: string, txClient?: any): Promise<string> {
    const client = txClient || prisma;

    // Get current financial year format e.g. "26-27" for 2026-2027
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-indexed
    
    // FY in India starts in April (Month 4)
    let fy = '';
    if (currentMonth >= 4) {
      fy = `${String(currentYear).substring(2)}-${String(currentYear + 1).substring(2)}`;
    } else {
      fy = `${String(currentYear - 1).substring(2)}-${String(currentYear).substring(2)}`;
    }

    // Default prefix configuration
    const PREFIX_MAP: { [key: string]: string } = {
      'Invoice': 'INV',
      'PurchaseOrder': 'PO',
      'Quotation': 'QUO',
      'DeliveryChallan': 'DC',
      'Repair': 'REP'
    };

    const prefix = PREFIX_MAP[module] || 'DOC';

    // 1. Perform database row-level locking
    // We execute raw SQL to lock the row for updates
    const series = (await client.$queryRawUnsafe(
      'SELECT id, prefix, current_number, financial_year FROM document_series WHERE module = $1 FOR UPDATE',
      module
    )) as any[];

    let nextNum = 1;
    let seriesId = 0;

    if (!series || series.length === 0) {
      try {
        // Create new series row if not exists
        const newRow = await client.documentSeries.create({
          data: {
            module,
            prefix,
            financial_year: fy,
            current_number: 1,
            reset_policy: 'yearly'
          }
        });
        seriesId = newRow.id;
        nextNum = 1;
      } catch (err: any) {
        // Handle race condition: query again under lock
        const retrySeries = (await client.$queryRawUnsafe(
          'SELECT id, prefix, current_number, financial_year FROM document_series WHERE module = $1 FOR UPDATE',
          module
        )) as any[];
        if (retrySeries && retrySeries.length > 0) {
          const row = retrySeries[0];
          seriesId = row.id;
          if (row.financial_year !== fy) {
            await client.documentSeries.update({
              where: { id: seriesId },
              data: {
                financial_year: fy,
                current_number: 1
              }
            });
            nextNum = 1;
          } else {
            nextNum = Number(row.current_number) + 1;
            await client.documentSeries.update({
              where: { id: seriesId },
              data: { current_number: nextNum }
            });
          }
        } else {
          throw err;
        }
      }
    } else {
      const row = series[0];
      seriesId = row.id;

      // Handle yearly reset policy
      if (row.financial_year !== fy) {
        // Reset sequence for the new Financial Year
        await client.documentSeries.update({
          where: { id: seriesId },
          data: {
            financial_year: fy,
            current_number: 1
          }
        });
        nextNum = 1;
      } else {
        nextNum = Number(row.current_number) + 1;
        await client.documentSeries.update({
          where: { id: seriesId },
          data: {
            current_number: nextNum
          }
        });
      }
    }

    // Format target sequence number e.g. "INV-2627-000001"
    const formattedFy = fy.replace('-', '');
    const paddedNumber = String(nextNum).padStart(6, '0');
    return `${prefix}-${formattedFy}-${paddedNumber}`;
  }

  /**
   * Generates a safe sequential integer sequence (e.g. for StockTransfer referenceId).
   */
  static async generateNextSequence(module: string, txClient?: any): Promise<number> {
    const client = txClient || prisma;
    const series = (await client.$queryRawUnsafe(
      'SELECT id, current_number FROM document_series WHERE module = $1 FOR UPDATE',
      module
    )) as any[];

    let nextNum = 1;
    let seriesId = 0;

    if (!series || series.length === 0) {
      try {
        const newRow = await client.documentSeries.create({
          data: {
            module,
            prefix: 'SEQ',
            financial_year: 'ALL',
            current_number: 1,
            reset_policy: 'none'
          }
        });
        nextNum = 1;
      } catch (err: any) {
        // Handle race condition: query again under lock
        const retrySeries = (await client.$queryRawUnsafe(
          'SELECT id, current_number FROM document_series WHERE module = $1 FOR UPDATE',
          module
        )) as any[];
        if (retrySeries && retrySeries.length > 0) {
          const row = retrySeries[0];
          seriesId = row.id;
          nextNum = Number(row.current_number) + 1;
          await client.documentSeries.update({
            where: { id: seriesId },
            data: { current_number: nextNum }
          });
        } else {
          throw err;
        }
      }
    } else {
      const row = series[0];
      seriesId = row.id;
      nextNum = Number(row.current_number) + 1;
      await client.documentSeries.update({
        where: { id: seriesId },
        data: {
          current_number: nextNum
        }
      });
    }

    return nextNum;
  }
}