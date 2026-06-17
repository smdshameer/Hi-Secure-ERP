import { prisma } from '../index';
import { BusinessEventService } from './BusinessEventService';
import { WarehouseService } from './WarehouseService';

export class PartsConsumptionService {

  async consumeParts(data: {
    job_id: number;
    part_id: number;
    location_id: number;
    quantity: number;
  }, userId?: number) {
    if (data.quantity <= 0) {
      throw new Error('INVALID_QUANTITY: Consumption quantity must be greater than zero.');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Fetch Job and Part details
      const job = await tx.serviceJob.findUnique({ where: { job_id: data.job_id } });
      if (!job) throw new Error('SERVICE_JOB_NOT_FOUND');

      const part = await tx.parts.findUnique({ where: { part_id: data.part_id } });
      if (!part) throw new Error('PART_NOT_FOUND');

      const costPrice = part.cost_price ? Number(part.cost_price) : 0;
      const sellingPrice = part.selling_price ? Number(part.selling_price) : 0;

      // 2. Mutate stock with OCC version locking and negative stock protection
      // mutateStock will throw NEGATIVE_STOCK_PREVENTED or STOCK_CONFLICT_DETECTED on validation failures
      await WarehouseService.mutateStock(tx, data.part_id, data.location_id, -data.quantity, userId);

      // 3. Create StockMovement entry
      await tx.stockMovement.create({
        data: {
          partId: data.part_id,
          locationId: data.location_id,
          movementType: 'SERVICE_CONSUMPTION',
          quantity: -data.quantity,
          referenceType: 'ServiceJob',
          referenceId: data.job_id
        }
      });

      // 4. Create ServicePartsConsumption record
      const consumption = await tx.servicePartsConsumption.create({
        data: {
          job_id: data.job_id,
          part_id: data.part_id,
          location_id: data.location_id,
          quantity: data.quantity,
          cost_price: costPrice,
          selling_price: sellingPrice
        }
      });

      // 5. Emit PARTS_CONSUMED event inside the transaction
      await BusinessEventService.logEvent({
        event_type: 'PARTS_CONSUMED',
        entity_type: 'ServiceJob',
        entity_id: data.job_id,
        user_id: userId,
        description: `Consumed ${data.quantity} units of part #${data.part_id} at location #${data.location_id} for job ${job.job_number}.`
      }, tx);

      // 6. Update Service Job actual cost by adding parts cost (price_charged or selling_price)
      const costAddition = sellingPrice * data.quantity;
      await tx.serviceJob.update({
        where: { job_id: data.job_id },
        data: {
          actual_cost: { increment: costAddition }
        }
      });

      return consumption;
    });
  }
}
