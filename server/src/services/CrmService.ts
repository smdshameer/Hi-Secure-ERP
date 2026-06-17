import { prisma } from '../index';
import { DocumentSeriesService } from './DocumentSeriesService';
import { BusinessEventService } from './BusinessEventService';

export class CrmService {
  // ─── LEADS ───────────────────────────────────────────────────────────────
  async createLead(data: {
    first_name: string;
    last_name?: string;
    company_name?: string;
    email: string;
    phone: string;
    assigned_to?: number;
    source?: string;
    notes?: string;
  }, userId?: number) {
    const lead_number = await DocumentSeriesService.generateNextNumber('Lead');

    return prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          lead_number,
          first_name: data.first_name,
          last_name: data.last_name || null,
          company_name: data.company_name || null,
          email: data.email,
          phone: data.phone,
          status: 'NEW',
          assigned_to: data.assigned_to || null,
          source: data.source || null,
          notes: data.notes || null
        }
      });

      await BusinessEventService.logEvent({
        event_type: 'CRM_LEAD_CREATED',
        entity_type: 'Lead',
        entity_id: lead.lead_id,
        user_id: userId,
        description: `Lead ${lead_number} for ${data.first_name} ${data.last_name || ''} created.`
      }, tx);

      return lead;
    });
  }

  async getLeads(query: { status?: string; assigned_to?: number }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.assigned_to) where.assigned_to = Number(query.assigned_to);

    return prisma.lead.findMany({
      where,
      include: {
        assignedUser: true,
        activities: true,
        opportunities: true,
        followUps: true
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getLeadById(id: number) {
    return prisma.lead.findUnique({
      where: { lead_id: id },
      include: {
        assignedUser: true,
        activities: true,
        opportunities: true,
        followUps: true
      }
    });
  }

  // ─── ACTIVITIES ──────────────────────────────────────────────────────────
  async logLeadActivity(data: {
    lead_id: number;
    activity_type: string; // CALL, EMAIL, MEETING, NOTE
    notes: string;
  }, userId: number) {
    return prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { lead_id: data.lead_id } });
      if (!lead) throw new Error('LEAD_NOT_FOUND');

      const activity = await tx.leadActivity.create({
        data: {
          lead_id: data.lead_id,
          activity_type: data.activity_type,
          notes: data.notes,
          created_by: userId
        }
      });

      // Update lead status to CONTACTED if it was NEW
      if (lead.status === 'NEW') {
        await tx.lead.update({
          where: { lead_id: data.lead_id },
          data: { status: 'CONTACTED' }
        });
      }

      await BusinessEventService.logEvent({
        event_type: 'CRM_ACTIVITY_LOGGED',
        entity_type: 'Lead',
        entity_id: data.lead_id,
        user_id: userId,
        description: `Activity ${data.activity_type} logged against lead ${lead.lead_number}.`
      }, tx);

      return activity;
    });
  }

  // ─── FOLLOW UPS ──────────────────────────────────────────────────────────
  async scheduleFollowUp(data: {
    lead_id?: number;
    opportunity_id?: number;
    scheduled_at: Date;
    notes?: string;
    assigned_to: number;
  }, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const followup = await tx.followUp.create({
        data: {
          lead_id: data.lead_id || null,
          opportunity_id: data.opportunity_id || null,
          scheduled_at: new Date(data.scheduled_at),
          status: 'SCHEDULED',
          notes: data.notes || null,
          assigned_to: data.assigned_to
        }
      });

      await BusinessEventService.logEvent({
        event_type: 'CRM_FOLLOWUP_SCHEDULED',
        entity_type: 'FollowUp',
        entity_id: followup.followup_id,
        user_id: userId,
        description: `Follow-up scheduled on ${new Date(data.scheduled_at).toDateString()}.`
      }, tx);

      return followup;
    });
  }

  async completeFollowUp(id: number, notes?: string, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const followup = await tx.followUp.findUnique({ where: { followup_id: id } });
      if (!followup) throw new Error('FOLLOWUP_NOT_FOUND');

      const updated = await tx.followUp.update({
        where: { followup_id: id },
        data: {
          status: 'COMPLETED',
          completed_at: new Date(),
          notes: notes || followup.notes
        }
      });

      await BusinessEventService.logEvent({
        event_type: 'CRM_FOLLOWUP_COMPLETED',
        entity_type: 'FollowUp',
        entity_id: id,
        user_id: userId,
        description: `Follow-up completed.`
      }, tx);

      return updated;
    });
  }

  // ─── OPPORTUNITIES ───────────────────────────────────────────────────────
  async createOpportunity(data: {
    lead_id?: number;
    customer_id?: number;
    name: string;
    estimated_revenue: number;
    close_date: Date;
    assigned_to?: number;
  }, userId?: number) {
    const opportunity_number = await DocumentSeriesService.generateNextNumber('Opportunity');

    return prisma.$transaction(async (tx) => {
      const opp = await tx.opportunity.create({
        data: {
          opportunity_number,
          lead_id: data.lead_id || null,
          customer_id: data.customer_id || null,
          name: data.name,
          stage: 'PROSPECTING',
          probability: 10,
          estimated_revenue: data.estimated_revenue,
          close_date: new Date(data.close_date),
          assigned_to: data.assigned_to || null
        }
      });

      await BusinessEventService.logEvent({
        event_type: 'CRM_OPPORTUNITY_CREATED',
        entity_type: 'Opportunity',
        entity_id: opp.opportunity_id,
        user_id: userId,
        description: `Opportunity ${opportunity_number} (${data.name}) created.`
      }, tx);

      return opp;
    });
  }

  async getOpportunities(query: { stage?: string; customer_id?: number }) {
    const where: any = {};
    if (query.stage) where.stage = query.stage;
    if (query.customer_id) where.customer_id = Number(query.customer_id);

    return prisma.opportunity.findMany({
      where,
      include: {
        lead: true,
        customer: true,
        followUps: true
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async updateOpportunityStage(id: number, stage: string, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const opp = await tx.opportunity.findUnique({ where: { opportunity_id: id } });
      if (!opp) throw new Error('OPPORTUNITY_NOT_FOUND');

      let probability = 10;
      if (stage === 'QUALIFICATION') probability = 30;
      else if (stage === 'PROPOSAL') probability = 60;
      else if (stage === 'NEGOTIATION') probability = 80;
      else if (stage === 'WON') probability = 100;
      else if (stage === 'LOST') probability = 0;

      const updated = await tx.opportunity.update({
        where: { opportunity_id: id },
        data: { stage, probability }
      });

      await BusinessEventService.logEvent({
        event_type: 'CRM_OPPORTUNITY_STAGE_UPDATED',
        entity_type: 'Opportunity',
        entity_id: id,
        user_id: userId,
        description: `Opportunity stage updated to ${stage} (probability: ${probability}%).`
      }, tx);

      return updated;
    });
  }

  // ─── QUOTATION TRACKING ──────────────────────────────────────────────────
  async trackQuotation(data: {
    quote_id: number;
    status: string; // SENT, VIEWED, ACCEPTED, REJECTED, EXPIRED
    feedback?: string;
  }, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const quote = await tx.quotation.findUnique({ where: { quote_id: data.quote_id } });
      if (!quote) throw new Error('QUOTATION_NOT_FOUND');

      const tracking = await tx.quotationTracking.create({
        data: {
          quote_id: data.quote_id,
          status: data.status,
          feedback: data.feedback || null,
          responded_at: ['ACCEPTED', 'REJECTED'].includes(data.status) ? new Date() : null
        }
      });

      // Update Quotation status accordingly
      await tx.quotation.update({
        where: { quote_id: data.quote_id },
        data: { status: data.status.toLowerCase() }
      });

      await BusinessEventService.logEvent({
        event_type: 'CRM_QUOTATION_TRACKED',
        entity_type: 'Quotation',
        entity_id: data.quote_id,
        user_id: userId,
        description: `Quotation tracking updated: ${data.status}.`
      }, tx);

      return tracking;
    });
  }

  // ─── LEAD TO CUSTOMER CONVERSION ─────────────────────────────────────────
  async convertLeadToCustomer(leadId: number, data: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
  }, userId?: number) {
    return prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { lead_id: leadId } });
      if (!lead) throw new Error('LEAD_NOT_FOUND');
      if (lead.status === 'CONVERTED') throw new Error('LEAD_ALREADY_CONVERTED');

      // 1. Create Customer
      const customer_code = `CUST-${Date.now()}`;
      const customer = await tx.customer.create({
        data: {
          customer_code,
          name: data.name,
          phone: data.phone,
          email: data.email || lead.email || null,
          address: data.address || lead.notes || null,
          city: data.city || null,
          state: data.state || null,
          pincode: data.pincode || null,
          gstin: data.gstin || null,
          is_active: true
        }
      });

      // 2. Update Lead Status
      await tx.lead.update({
        where: { lead_id: leadId },
        data: { status: 'CONVERTED' }
      });

      // 3. Log event
      await BusinessEventService.logEvent({
        event_type: 'CRM_LEAD_CONVERTED',
        entity_type: 'Lead',
        entity_id: leadId,
        user_id: userId,
        description: `Lead ${lead.lead_number} successfully converted to Customer ${customer_code}.`
      }, tx);

      return customer;
    });
  }

  // ─── OPPORTUNITY TO QUOTATION CONVERSION ─────────────────────────────────
  async convertOpportunityToQuotation(opportunityId: number, data: {
    valid_until: Date;
    items: Array<{ part_id: number; quantity: number; unit_price: number; discount_percent?: number; tax_rate?: number }>;
    terms?: string;
    notes?: string;
  }, userId: number) {
    return prisma.$transaction(async (tx) => {
      const opp = await tx.opportunity.findUnique({
        where: { opportunity_id: opportunityId },
        include: { customer: true }
      });
      if (!opp) throw new Error('OPPORTUNITY_NOT_FOUND');
      if (!opp.customer_id) throw new Error('OPPORTUNITY_NO_CUSTOMER_LINKED');

      const quote_number = await DocumentSeriesService.generateNextNumber('Quotation');

      // Compute totals
      let subtotal = 0;
      let total_discount = 0;
      let total_tax = 0;

      const quotationItemsData = [];

      for (const item of data.items) {
        const itemSubtotal = item.unit_price * item.quantity;
        const discountAmt = itemSubtotal * ((item.discount_percent || 0) / 100);
        const taxRate = item.tax_rate || 0;
        const taxableAmt = itemSubtotal - discountAmt;
        const taxAmt = taxableAmt * (taxRate / 100);

        subtotal += itemSubtotal;
        total_discount += discountAmt;
        total_tax += taxAmt;

        quotationItemsData.push({
          part_id: item.part_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent || 0,
          tax_rate: taxRate,
          total: taxableAmt + taxAmt
        });
      }

      const total_amount = subtotal - total_discount + total_tax;

      // Create Quotation
      const quotation = await tx.quotation.create({
        data: {
          quote_number,
          customer_id: opp.customer_id,
          quote_date: new Date(),
          valid_until: new Date(data.valid_until),
          status: 'draft',
          subtotal,
          total_discount,
          total_tax,
          total_amount,
          terms: data.terms || undefined,
          notes: data.notes || null,
          created_by: userId,
          items: {
            create: quotationItemsData
          }
        },
        include: { items: true }
      });

      // Update Opportunity Stage to proposal
      await tx.opportunity.update({
        where: { opportunity_id: opportunityId },
        data: { stage: 'PROPOSAL', probability: 60 }
      });

      // Track Quotation in CRM QuotationTracking
      await tx.quotationTracking.create({
        data: {
          quote_id: quotation.quote_id,
          status: 'SENT'
        }
      });

      await BusinessEventService.logEvent({
        event_type: 'CRM_OPPORTUNITY_CONVERTED_TO_QUOTE',
        entity_type: 'Opportunity',
        entity_id: opportunityId,
        user_id: userId,
        description: `Converted Opportunity ${opp.opportunity_number} to Quotation ${quote_number}.`
      }, tx);

      return quotation;
    });
  }
}
