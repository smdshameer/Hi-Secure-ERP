import { PartsRepository } from '../repositories/PartsRepository';
import { prisma } from '../index';
import { AuditService } from './AuditService';
import { DocumentSeriesService } from './DocumentSeriesService';

export class InventoryService {
  private partsRepo = new PartsRepository();

  async getParts(query: any) {
    const { search, brand_id } = query;
    const where: any = { is_active: true };
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { part_number: { contains: String(search), mode: 'insensitive' } },
        { hsn_code: { contains: String(search), mode: 'insensitive' } }
      ];
    }
    if (brand_id) where.brand_id = Number(brand_id);
    
    const parts = await this.partsRepo.findMany(where);
    return parts.map((p: any) => {
      const qty = p.stocks?.reduce((acc: number, curr: any) => acc + curr.quantity, 0) ?? 0;
      return {
        ...p,
        stock_quantity: qty
      };
    });
  }

  async getStats() {
    const allParts = await this.partsRepo.findMany({ is_active: true });
    const total = allParts.length;

    const partsWithQty = allParts.map((p: any) => {
      const qty = p.stocks?.reduce((acc: number, curr: any) => acc + curr.quantity, 0) ?? 0;
      return { ...p, stock_quantity: qty };
    });

    const outOfStock = partsWithQty.filter((p: any) => p.stock_quantity === 0).length;
    const lowStock = partsWithQty.filter((p: any) => p.stock_quantity > 0 && p.stock_quantity < p.reorder_level).length;
    return { total, lowStock, outOfStock };
  }

  async getBrands() {
    return prisma.brand.findMany({ orderBy: { name: 'asc' }, select: { brand_id: true, name: true } });
  }

  async getPartById(id: number) {
    const part = await this.partsRepo.findById(id);
    if (!part) return null;
    const qty = part.stocks?.reduce((acc: number, curr: any) => acc + curr.quantity, 0) ?? 0;
    return {
      ...part,
      stock_quantity: qty
    };
  }

  async createPart(data: any, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const part = await tx.parts.create({
        data: {
          part_number: data.part_number,
          name: data.name,
          description: data.description || null,
          brand_id: data.brand_id ? Number(data.brand_id) : null,
          hsn_code: data.hsn_code || null,
          cost_price: data.cost_price ? Number(data.cost_price) : 0,
          selling_price: data.selling_price ? Number(data.selling_price) : 0,
          tax_rate: data.tax_rate ? Number(data.tax_rate) : 0,
          reorder_level: data.reorder_level ? Number(data.reorder_level) : 5,
          is_active: data.is_active !== false
        }
      });

      if (data.stock_quantity && Number(data.stock_quantity) > 0) {
        await tx.partStock.create({
          data: {
            part_id: part.part_id,
            location_id: 1,
            quantity: Number(data.stock_quantity)
          }
        });

        await tx.stockMovement.create({
          data: {
            partId: part.part_id,
            locationId: 1,
            movementType: 'ADJUSTMENT',
            quantity: Number(data.stock_quantity),
            referenceType: 'InitialStock',
            referenceId: part.part_id
          }
        });
      }

      await AuditService.log(
        userId || null,
        null,
        'CREATE',
        'Parts',
        part.part_id,
        null,
        part
      );

      return part;
    });
  }

  async updatePart(id: number, data: any, userId?: number) {
    const existing = await this.partsRepo.findById(id);
    if (!existing) throw new Error('Part not found');

    // Avoid updating stock_quantity directly if supplied in PUT body
    const { stock_quantity, ...rest } = data;
    const updated = await this.partsRepo.update(id, rest);

    await AuditService.log(
      userId || null,
      null,
      'UPDATE',
      'Parts',
      id,
      existing,
      updated
    );

    return updated;
  }

  async deletePart(id: number, userId?: number) {
    const existing = await prisma.parts.findUnique({
      where: { part_id: id }
    });
    if (!existing) throw new Error('Part not found');

    let deleted;
    try {
      // Try hard delete first, cascading to local stock tables
      await prisma.stockMovement.deleteMany({ where: { partId: id } });
      await prisma.partStock.deleteMany({ where: { part_id: id } });
      deleted = await this.partsRepo.delete(id);
    } catch (err: any) {
      console.log(`[InventoryService] Hard delete failed for part ${id}, falling back to soft delete:`, err.message);
      // Fallback to soft delete
      deleted = await prisma.parts.update({
        where: { part_id: id },
        data: { is_active: false }
      });
    }

    await AuditService.log(
      userId || null,
      null,
      'DELETE',
      'Parts',
      id,
      existing,
      null
    );

    return deleted;
  }

  async adjustStock(partId: number, quantityChange: number, refType: string, refId: number, locationId: number = 1) {
    return prisma.$transaction(async (tx) => {
      const part = await this.partsRepo.findById(partId, tx);
      if (!part) throw new Error('Part not found');
      
      const partStock = await tx.partStock.findUnique({
        where: {
          part_id_location_id: {
            part_id: partId,
            location_id: locationId
          }
        }
      });

      const currentStock = partStock ? Number(partStock.quantity) : 0;
      const newQty = currentStock + Number(quantityChange);
      if (newQty < 0) {
        throw new Error(`Insufficient stock for "${part.name}". Available: ${currentStock}, requested change: ${quantityChange}`);
      }

      await tx.partStock.upsert({
        where: {
          part_id_location_id: {
            part_id: partId,
            location_id: locationId
          }
        },
        update: { quantity: newQty },
        create: {
          part_id: partId,
          location_id: locationId,
          quantity: newQty
        }
      });

      return tx.stockMovement.create({
        data: {
          partId,
          locationId,
          movementType: 'ADJUSTMENT',
          quantity: Number(quantityChange),
          referenceType: refType,
          referenceId: refId
        }
      });
    });
  }

  async transferStock(partId: number, fromLocationId: number, toLocationId: number, quantity: number, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const qty = Number(quantity);
      if (qty <= 0) throw new Error('Transfer quantity must be greater than zero');

      const part = await this.partsRepo.findById(partId, tx);
      if (!part) throw new Error('Part not found');

      // Get origin stock
      const originStock = await tx.partStock.findUnique({
        where: {
          part_id_location_id: {
            part_id: partId,
            location_id: fromLocationId
          }
        }
      });

      const originQty = originStock ? Number(originStock.quantity) : 0;
      if (originQty < qty) {
        throw new Error(`Insufficient stock for "${part.name}" at origin location. Available: ${originQty}, requested transfer: ${qty}`);
      }

      // Decrement origin
      await tx.partStock.update({
        where: {
          part_id_location_id: {
            part_id: partId,
            location_id: fromLocationId
          }
        },
        data: { quantity: { decrement: qty } }
      });

      // Increment target
      await tx.partStock.upsert({
        where: {
          part_id_location_id: {
            part_id: partId,
            location_id: toLocationId
          }
        },
        update: { quantity: { increment: qty } },
        create: {
          part_id: partId,
          location_id: toLocationId,
          quantity: qty
        }
      });

      // Log stock movements
      const transferId = await DocumentSeriesService.generateNextSequence('StockTransfer', tx); // Unique transfer ID

      await tx.stockMovement.create({
        data: {
          partId,
          locationId: fromLocationId,
          movementType: 'TRANSFER_OUT',
          quantity: -qty,
          referenceType: 'StockTransfer',
          referenceId: transferId
        }
      });

      await tx.stockMovement.create({
        data: {
          partId,
          locationId: toLocationId,
          movementType: 'TRANSFER_IN',
          quantity: qty,
          referenceType: 'StockTransfer',
          referenceId: transferId
        }
      });

      await AuditService.log(
        userId || null,
        null,
        'UPDATE',
        'Parts',
        partId,
        { info: 'Stock Transfer', fromLocationId, quantity },
        { info: 'Stock Transfer', toLocationId, quantity }
      );
    });
  }

  async getMovements(partId: number) {
    return prisma.stockMovement.findMany({
      where: { partId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async importPartsInBulk(products: any[], userId?: number) {
    let importedCount = 0;
    let skippedCount = 0;
    const details: string[] = [];

    // Cache existing brands to optimize DB calls
    const brandMap = new Map<string, number>();
    try {
      const brands = await prisma.brand.findMany();
      brands.forEach(b => brandMap.set(b.name.toLowerCase(), b.brand_id));
    } catch (e) {
      console.warn('[InventoryService] Failed to load brand cache:', e);
    }

    for (const item of products) {
      try {
        const sku = String(item.part_number || item.sku || '').trim();
        const name = String(item.name || '').trim();

        if (!sku || !name) {
          skippedCount++;
          details.push(`Skipped row: missing required SKU or Name.`);
          continue;
        }

        // Check if SKU already exists
        const exists = await prisma.parts.findUnique({
          where: { part_number: sku }
        });
        if (exists) {
          skippedCount++;
          details.push(`Skipped SKU "${sku}": already exists in inventory.`);
          continue;
        }

        // Handle Brand mapping/creation dynamically
        let brandId: number | null = null;
        const rawBrandName = String(item.brand || item.brand_name || '').trim();
        if (rawBrandName) {
          const brandKey = rawBrandName.toLowerCase();
          if (brandMap.has(brandKey)) {
            brandId = brandMap.get(brandKey) || null;
          } else {
            // Create brand on the fly
            const newBrand = await prisma.brand.create({
              data: { name: rawBrandName }
            });
            brandId = newBrand.brand_id;
            brandMap.set(brandKey, brandId);
            details.push(`Created new brand: "${rawBrandName}"`);
          }
        }

        // Create the part
        const costVal = item.cost_price !== undefined ? Number(item.cost_price) : 0;
        const sellVal = item.selling_price !== undefined ? Number(item.selling_price) : 0;
        const taxVal = item.tax_rate !== undefined ? Number(item.tax_rate) : 18;
        const reorderVal = item.reorder_level !== undefined ? Number(item.reorder_level) : 5;

        // Run transaction for each product individually so one failure does not halt other successful ones
        await prisma.$transaction(async (tx) => {
          const part = await tx.parts.create({
            data: {
              part_number: sku,
              name,
              description: item.description || null,
              brand_id: brandId,
              hsn_code: String(item.hsn_code || '').trim() || null,
              cost_price: isNaN(costVal) ? 0 : costVal,
              selling_price: isNaN(sellVal) ? 0 : sellVal,
              tax_rate: isNaN(taxVal) ? 18 : taxVal,
              reorder_level: isNaN(reorderVal) ? 5 : reorderVal,
              is_active: item.is_active !== false
            }
          });

          // Stock initialization
          const initialStock = Number(item.initial_stock || item.stock_quantity || 0);
          if (!isNaN(initialStock) && initialStock > 0) {
            await tx.partStock.create({
              data: {
                part_id: part.part_id,
                location_id: 1,
                quantity: initialStock
              }
            });

            await tx.stockMovement.create({
              data: {
                partId: part.part_id,
                locationId: 1,
                movementType: 'ADJUSTMENT',
                quantity: initialStock,
                referenceType: 'InitialStock',
                referenceId: part.part_id
              }
            });
          }

          // Write audit log
          await AuditService.log(
            userId || null,
            null,
            'CREATE',
            'Parts',
            part.part_id,
            null,
            part
          );
        });

        importedCount++;
        details.push(`Imported product: "${name}" (SKU: ${sku})`);
      } catch (err: any) {
        console.error(`Failed to import bulk product item:`, item, err);
        skippedCount++;
        details.push(`Failed to import SKU "${item.part_number || item.sku || 'Unknown'}": ${err.message || 'database error'}`);
      }
    }

    return {
      success: true,
      importedCount,
      skippedCount,
      details
    };
  }

  async deletePartsBulk(ids: number[], userId?: number) {
    let deletedCount = 0;
    for (const id of ids) {
      try {
        const existing = await prisma.parts.findUnique({ where: { part_id: id } });
        if (!existing) continue;

        // Write audit log before deletion
        try {
          await AuditService.log(userId || null, null, 'DELETE', 'Parts', id, { part_id: id }, null);
        } catch (_) {}

        try {
          // Try hard delete first
          await prisma.stockMovement.deleteMany({ where: { partId: id } });
          await prisma.partStock.deleteMany({ where: { part_id: id } });
          await prisma.parts.delete({ where: { part_id: id } });
          deletedCount++;
        } catch (err: any) {
          console.log(`[InventoryService] Bulk hard delete failed for part ${id}, falling back to soft delete:`, err.message);
          // Soft delete fallback
          await prisma.parts.update({
            where: { part_id: id },
            data: { is_active: false }
          });
          deletedCount++;
        }
      } catch (err) {
        console.error(`Failed to delete part ID ${id}:`, err);
      }
    }
    return { success: true, deletedCount };
  }
}
