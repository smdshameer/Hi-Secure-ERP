import { QuotationRepository } from '../repositories/QuotationRepository';
import { InvoiceService } from './InvoiceService';

export class QuotationService {
  private quoteRepo = new QuotationRepository();
  private invoiceService = new InvoiceService();

  async getQuotations(query: any) {
    const { status, customer_id, search } = query;
    const where: any = {};
    if (status) where.status = String(status);
    if (customer_id) where.customer_id = Number(customer_id);
    if (search) {
      where.OR = [
        { quote_number: { contains: String(search), mode: 'insensitive' } },
        { notes: { contains: String(search), mode: 'insensitive' } },
        { customer: { name: { contains: String(search), mode: 'insensitive' } } },
        { customer: { phone: { contains: String(search), mode: 'insensitive' } } },
      ];
    }
    return this.quoteRepo.findMany(where);
  }

  async getQuotationById(id: number) {
    return this.quoteRepo.findById(id);
  }

  async createQuotation(data: any, userId?: number) {
    const { customer_id, quote_date, valid_until, terms, notes, items } = data;
    return this.quoteRepo.create({
      customer_id: Number(customer_id),
      quote_date: quote_date ? new Date(quote_date) : new Date(),
      valid_until: new Date(valid_until),
      terms: terms || 'This quotation is valid for 30 days from the date of issue.',
      notes: notes || null,
      created_by: userId || null,
      items: items?.length ? {
        create: items.map((i: any) => ({
          part_id: Number(i.part_id),
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          discount_percent: Number(i.discount_percent || 0),
          tax_rate: Number(i.tax_rate || 0),
          total: Number(i.total)
        }))
      } : undefined
    });
  }

  async updateQuotation(id: number, data: any) {
    const { customer_id, quote_date, valid_until, terms, notes, status, items } = data;
    
    // Calculate totals
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalAmount = 0;
    
    if (items && items.length) {
      items.forEach((i: any) => {
        const qty = Number(i.quantity || 1);
        const price = Number(i.unit_price || 0);
        const disc = Number(i.discount_percent || 0);
        const taxRate = Number(i.tax_rate || 0);
        
        const lineSub = qty * price;
        const lineDisc = lineSub * (disc / 100);
        const lineTaxable = lineSub - lineDisc;
        const lineTax = lineTaxable * (taxRate / 100);
        const lineTotal = lineTaxable + lineTax;
        
        subtotal += lineSub;
        totalDiscount += lineDisc;
        totalTax += lineTax;
        totalAmount += lineTotal;
      });
    }

    return this.quoteRepo.update(id, {
      customer_id: customer_id ? Number(customer_id) : undefined,
      quote_date: quote_date ? new Date(quote_date) : undefined,
      valid_until: valid_until ? new Date(valid_until) : undefined,
      terms,
      notes: notes || null,
      status,
      subtotal,
      total_discount: totalDiscount,
      total_tax: totalTax,
      total_amount: totalAmount,
      items: items?.length ? {
        create: items.map((i: any) => ({
          part_id: Number(i.part_id),
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          discount_percent: Number(i.discount_percent || 0),
          tax_rate: Number(i.tax_rate || 0),
          total: Number(i.total)
        }))
      } : undefined
    });
  }

  async updateQuotationStatus(id: number, status: string) {
    return this.quoteRepo.updateStatus(id, { status });
  }

  async deleteQuotation(id: number) {
    return this.quoteRepo.delete(id);
  }

  async convertQuotationToInvoice(id: number, userId?: number) {
    const quotation = await this.quoteRepo.findById(id);
    if (!quotation) {
      throw new Error('Quotation not found');
    }

    if (quotation.status === 'converted' || quotation.converted_to_invoice_id) {
      throw new Error('Quotation has already been converted to an invoice');
    }

    const invoiceData = {
      customer_id: quotation.customer_id,
      invoice_date: new Date(),
      due_date: new Date(Date.now() + 15 * 86400000), // 15 days default
      place_of_supply: quotation.customer?.state || null,
      tax_type: 'gst',
      status: 'draft',
      notes: `Converted from Quotation: ${quotation.quote_number}`,
      items: quotation.items.map(i => {
        const qty = Number(i.quantity);
        const rate = Number(i.unit_price);
        const discPercent = Number(i.discount_percent || 0);
        const taxRate = Number(i.tax_rate || 0);
        
        const discountedRate = rate * (1 - discPercent / 100);
        const taxable = qty * discountedRate;
        const tax = taxable * (taxRate / 100);
        const total = taxable + tax;
        
        return {
          part_id: i.part_id,
          quantity: qty,
          unit_price: discountedRate,
          tax_rate: taxRate,
          tax_amount: tax,
          total_amount: total
        };
      })
    };

    // Use InvoiceService as required
    const invoice = await this.invoiceService.createInvoice(invoiceData, userId);

    // Update quotation status
    await this.quoteRepo.updateStatus(id, {
      status: 'converted',
      converted_to_invoice_id: invoice.invoice_id
    });

    return invoice.invoice_id;
  }
}
