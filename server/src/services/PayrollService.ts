import { PayrollRepository } from '../repositories/PayrollRepository';

export class PayrollService {
  private payrollRepo = new PayrollRepository();

  async getEntries() {
    return this.payrollRepo.findMany();
  }

  async getEntryById(id: number) {
    return this.payrollRepo.findById(id);
  }

  async createEntry(data: any) {
    return this.payrollRepo.create({
      employee_name: data.employee_name,
      month: Number(data.month),
      year: Number(data.year),
      basic_salary: Number(data.basic_salary),
      allowances: Number(data.allowances || 0),
      deductions: Number(data.deductions || 0),
      net_salary: Number(data.net_salary),
      payment_date: data.payment_date ? new Date(data.payment_date) : null,
      status: data.status || 'pending',
      notes: data.notes || null
    });
  }

  async updateEntry(id: number, data: any) {
    const { entry_id, created_at, ...updateData } = data;
    if (updateData.month !== undefined) updateData.month = Number(updateData.month);
    if (updateData.year !== undefined) updateData.year = Number(updateData.year);
    if (updateData.basic_salary !== undefined) updateData.basic_salary = Number(updateData.basic_salary);
    if (updateData.allowances !== undefined) updateData.allowances = Number(updateData.allowances);
    if (updateData.deductions !== undefined) updateData.deductions = Number(updateData.deductions);
    if (updateData.net_salary !== undefined) updateData.net_salary = Number(updateData.net_salary);
    if (updateData.payment_date !== undefined) updateData.payment_date = updateData.payment_date ? new Date(updateData.payment_date) : null;
    return this.payrollRepo.update(id, updateData);
  }

  async deleteEntry(id: number) {
    return this.payrollRepo.delete(id);
  }
}
