/**
 * Payment Processing & Billing Integration
 * ==========================================
 * Days 47-50: Advanced payment processing with PCI compliance
 */

import { logger } from './logger';

export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'credit_card' | 'debit_card' | 'bank_account';
  lastFour: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  verified: boolean;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';
  description: string;
  paymentMethodId: string;
  timestamp: Date;
  receiptUrl?: string;
}

export interface Invoice {
  id: string;
  userId: string;
  amount: number;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>;
  createdAt: Date;
  paidAt?: Date;
}

export class PaymentProcessor {
  private paymentMethods: Map<string, PaymentMethod> = new Map();
  private transactions: Map<string, PaymentTransaction> = new Map();
  private invoices: Map<string, Invoice> = new Map();

  /**
   * Tokenize payment method (PCI compliant)
   */
  public async tokenizePaymentMethod(
    userId: string,
    cardData: {
      cardNumber: string;
      expiryMonth: number;
      expiryYear: number;
      cvv: string;
      holderName: string;
    }
  ): Promise<{ success: boolean; tokenId?: string }> {
    // In production, this would call a payment gateway like Stripe
    // to tokenize the card securely without storing raw data

    const tokenId = `token_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

    const paymentMethod: PaymentMethod = {
      id: tokenId,
      userId,
      type: 'credit_card',
      lastFour: cardData.cardNumber.slice(-4),
      expiryMonth: cardData.expiryMonth,
      expiryYear: cardData.expiryYear,
      isDefault: false,
      verified: false
    };

    this.paymentMethods.set(tokenId, paymentMethod);

    logger.log('Payment method tokenized', {
      userId,
      tokenId,
      lastFour: paymentMethod.lastFour
    });

    return { success: true, tokenId };
  }

  /**
   * Process payment with PCI compliance
   */
  public async processPayment(
    userId: string,
    paymentMethodId: string,
    amount: number,
    description: string
  ): Promise<PaymentTransaction | null> {
    const paymentMethod = this.paymentMethods.get(
      paymentMethodId
    );
    if (!paymentMethod || paymentMethod.userId !== userId) {
      logger.error('Payment method not found or unauthorized', {
        userId,
        paymentMethodId
      });
      return null;
    }

    const transactionId = `txn_${Date.now()}`;

    const transaction: PaymentTransaction = {
      id: transactionId,
      userId,
      amount,
      currency: 'USD',
      status: 'pending',
      description,
      paymentMethodId,
      timestamp: new Date()
    };

    this.transactions.set(transactionId, transaction);

    // Simulate payment processing
    const success = Math.random() > 0.05; // 95% success rate

    transaction.status = success ? 'captured' : 'failed';
    if (success) {
      transaction.receiptUrl = `/receipts/${transactionId}.pdf`;
    }

    logger.log('Payment processed', {
      userId,
      transactionId,
      amount,
      status: transaction.status
    });

    return transaction;
  }

  /**
   * Create invoice
   */
  public createInvoice(
    userId: string,
    items: Array<{ description: string; amount: number; quantity: number }>,
    dueInDays: number = 30
  ): Invoice {
    const invoiceId = `inv_${Date.now()}`;
    const totalAmount = items.reduce(
      (sum, item) => sum + item.amount * item.quantity,
      0
    );

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueInDays);

    const invoice: Invoice = {
      id: invoiceId,
      userId,
      amount: totalAmount,
      dueDate,
      status: 'draft',
      items,
      createdAt: new Date()
    };

    this.invoices.set(invoiceId, invoice);

    logger.log('Invoice created', {
      userId,
      invoiceId,
      amount: totalAmount
    });

    return invoice;
  }

  /**
   * Get payment history
   */
  public getPaymentHistory(userId: string): PaymentTransaction[] {
    return Array.from(this.transactions.values()).filter(
      t => t.userId === userId
    );
  }

  /**
   * Refund transaction
   */
  public async refundTransaction(
    transactionId: string
  ): Promise<boolean> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.status !== 'captured') {
      return false;
    }

    transaction.status = 'refunded';

    logger.log('Transaction refunded', {
      transactionId,
      amount: transaction.amount
    });

    return true;
  }

  /**
   * Get billing statistics
   */
  public getBillingStats(userId: string): {
    totalTransactions: number;
    totalRevenue: number;
    successRate: number;
    outstandingInvoices: number;
  } {
    const transactions = this.getPaymentHistory(userId);
    const userInvoices = Array.from(this.invoices.values()).filter(
      i => i.userId === userId
    );

    const successful = transactions.filter(
      t => t.status === 'captured'
    ).length;

    return {
      totalTransactions: transactions.length,
      totalRevenue: transactions
        .filter(t => t.status === 'captured')
        .reduce((sum, t) => sum + t.amount, 0),
      successRate:
        transactions.length > 0
          ? (successful / transactions.length) * 100
          : 0,
      outstandingInvoices: userInvoices.filter(
        i => i.status === 'sent' || i.status === 'overdue'
      ).length
    };
  }
}

export const paymentProcessor = new PaymentProcessor();
