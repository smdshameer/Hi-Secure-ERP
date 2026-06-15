import { DeliveryChallanRepository } from '../repositories/DeliveryChallanRepository';

export class DeliveryChallanService {
  private challanRepo = new DeliveryChallanRepository();

  async getChallans(query: any) {
    const { status, customer_id, search } = query;
    const where: any = {};
    if (status) where.status = String(status);
    if (customer_id) where.customer_id = Number(customer_id);
    if (search) {
      where.OR = [
        { challan_number: { contains: String(search), mode: 'insensitive' } },
        { notes: { contains: String(search), mode: 'insensitive' } },
        { customer: { name: { contains: String(search), mode: 'insensitive' } } },
        { customer: { phone: { contains: String(search), mode: 'insensitive' } } },
        { supplier: { name: { contains: String(search), mode: 'insensitive' } } },
        { supplier: { phone: { contains: String(search), mode: 'insensitive' } } },
      ];
    }
    return this.challanRepo.findMany(where);
  }

  async getChallanById(id: number) {
    return this.challanRepo.findById(id);
  }

  async createChallan(data: any, userId?: number) {
    const { customer_id, supplier_id, from_location_id, to_location_id, challan_date, expected_delivery_date, vehicle_number, driver_name, transporter_name, eway_bill_number, purposes, notes, items } = data;
    return this.challanRepo.create({
      customer_id: customer_id ? Number(customer_id) : null,
      supplier_id: supplier_id ? Number(supplier_id) : null,
      from_location_id: from_location_id ? Number(from_location_id) : null,
      to_location_id: to_location_id ? Number(to_location_id) : null,
      challan_date: challan_date ? new Date(challan_date) : new Date(),
      expected_delivery_date: expected_delivery_date ? new Date(expected_delivery_date) : null,
      vehicle_number: vehicle_number || null,
      driver_name: driver_name || null,
      transporter_name: transporter_name || null,
      eway_bill_number: eway_bill_number || null,
      purposes: purposes || null,
      notes: notes || null,
      created_by: userId || null,
      items: items?.length ? {
        create: items.map((i: any) => ({
          part_id: Number(i.part_id),
          quantity: Number(i.quantity),
          unit_price: i.unit_price ? Number(i.unit_price) : null,
          batch_number: i.batch_number || null,
          expiry_date: i.expiry_date ? new Date(i.expiry_date) : null,
          remarks: i.remarks || null
        }))
      } : undefined
    });
  }

  async updateChallan(id: number, data: any) {
    const { customer_id, supplier_id, from_location_id, to_location_id, challan_date, expected_delivery_date, vehicle_number, driver_name, transporter_name, eway_bill_number, purposes, status, notes, items } = data;
    return this.challanRepo.update(id, {
      customer_id: customer_id ? Number(customer_id) : null,
      supplier_id: supplier_id ? Number(supplier_id) : null,
      from_location_id: from_location_id ? Number(from_location_id) : null,
      to_location_id: to_location_id ? Number(to_location_id) : null,
      challan_date: challan_date ? new Date(challan_date) : undefined,
      expected_delivery_date: expected_delivery_date ? new Date(expected_delivery_date) : null,
      vehicle_number: vehicle_number || null,
      driver_name: driver_name || null,
      transporter_name: transporter_name || null,
      eway_bill_number: eway_bill_number || null,
      purposes: purposes || null,
      status: status || undefined,
      notes: notes || null,
      items: items?.length ? {
        create: items.map((i: any) => ({
          part_id: Number(i.part_id),
          quantity: Number(i.quantity),
          unit_price: i.unit_price ? Number(i.unit_price) : null,
          batch_number: i.batch_number || null,
          expiry_date: i.expiry_date ? new Date(i.expiry_date) : null,
          remarks: i.remarks || null
        }))
      } : undefined
    });
  }

  async updateChallanStatus(id: number, status: string) {
    return this.challanRepo.updateStatus(id, status);
  }

  async deleteChallan(id: number) {
    return this.challanRepo.delete(id);
  }
}
