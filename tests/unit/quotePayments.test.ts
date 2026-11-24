import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addMonthsToISODate,
  buildPaymentScheduleDraft,
  calculateInstallmentAmounts,
  calculateSplitAmounts,
  formatPaymentModeHeadline,
  formatPaymentScheduleSummaryLine,
  getQuotePaymentProgress,
  isQuotePaymentOverdue,
} from "../../src/lib/quotePayments.ts";

describe("calculateSplitAmounts", () => {
  it("splits even and odd cent amounts without losing cents", () => {
    assert.deepEqual(calculateSplitAmounts(100000, 50), [50000, 50000]);
    assert.deepEqual(calculateSplitAmounts(10001, 50), [5001, 5000]);
    assert.deepEqual(calculateSplitAmounts(122000, 30), [36600, 85400]);
    assert.deepEqual(calculateSplitAmounts(0, 50), [0, 0]);
  });

  it("clamps deposit percentage within 1..99", () => {
    assert.deepEqual(calculateSplitAmounts(10000, 0), [100, 9900]);
    assert.deepEqual(calculateSplitAmounts(10000, 120), [9900, 100]);
  });
});

describe("calculateInstallmentAmounts", () => {
  it("divides amounts exactly across installments putting remainder on first", () => {
    assert.deepEqual(calculateInstallmentAmounts(10000, 3), [3334, 3333, 3333]);
    assert.deepEqual(
      calculateInstallmentAmounts(10000, 7),
      [1432, 1428, 1428, 1428, 1428, 1428, 1428],
    );
    const twelve = calculateInstallmentAmounts(125003, 12);
    assert.equal(twelve.length, 12);
    assert.equal(
      twelve.reduce((sum, n) => sum + n, 0),
      125003,
    );
  });
});

describe("addMonthsToISODate", () => {
  it("advances months safely including month-end clamping without timezone drift", () => {
    assert.equal(addMonthsToISODate("2026-11-23", 1), "2026-12-23");
    assert.equal(addMonthsToISODate("2026-01-31", 1), "2026-02-28");
    assert.equal(addMonthsToISODate("2024-01-31", 1), "2024-02-29");
    assert.equal(addMonthsToISODate("", 1), null);
  });
});

describe("buildPaymentScheduleDraft", () => {
  it("builds split 50/50 schedule with two dates", () => {
    const draft = buildPaymentScheduleDraft({
      mode: "split",
      totalCents: 150000,
      depositPercent: 50,
      installmentsCount: 2,
      firstDueDate: "2026-11-25",
      secondDueDate: "2026-12-15",
    });

    assert.deepEqual(draft, [
      {
        installment_number: 1,
        label: "Entrada (50%)",
        amount_cents: 75000,
        due_date: "2026-11-25",
      },
      {
        installment_number: 2,
        label: "Saldo (50%)",
        amount_cents: 75000,
        due_date: "2026-12-15",
      },
    ]);
  });

  it("builds monthly installments advancing dates per month", () => {
    const draft = buildPaymentScheduleDraft({
      mode: "installments",
      totalCents: 10000,
      depositPercent: 50,
      installmentsCount: 3,
      firstDueDate: "2026-11-30",
    });

    assert.deepEqual(draft, [
      {
        installment_number: 1,
        label: "Parcela 1/3",
        amount_cents: 3334,
        due_date: "2026-11-30",
      },
      {
        installment_number: 2,
        label: "Parcela 2/3",
        amount_cents: 3333,
        due_date: "2026-12-30",
      },
      {
        installment_number: 3,
        label: "Parcela 3/3",
        amount_cents: 3333,
        due_date: "2027-01-30",
      },
    ]);
  });
});

describe("payment progress, overdue detection & formatting", () => {
  it("computes progress, next unpaid installment, and overdue counts", () => {
    const payments = [
      {
        id: "p2",
        installment_number: 2,
        label: "Saldo (50%)",
        amount_cents: 50000,
        due_date: "2026-11-20",
        status: "pending" as const,
      },
      {
        id: "p1",
        installment_number: 1,
        label: "Entrada (50%)",
        amount_cents: 50000,
        due_date: "2026-11-10",
        status: "paid" as const,
      },
    ];

    assert.equal(isQuotePaymentOverdue(payments[0], "2026-11-23"), true);
    assert.equal(isQuotePaymentOverdue(payments[1], "2026-11-23"), false);

    const progress = getQuotePaymentProgress(payments, 100000, "2026-11-23");
    assert.equal(progress.totalCount, 2);
    assert.equal(progress.paidCount, 1);
    assert.equal(progress.pendingCount, 1);
    assert.equal(progress.overdueCount, 1);
    assert.equal(progress.paidCents, 50000);
    assert.equal(progress.remainingCents, 50000);
    assert.equal(progress.isPartiallyPaid, true);
    assert.equal(progress.isFullyPaid, false);
    assert.equal(progress.nextUnpaid?.id, "p2");
  });

  it("formats headlines and schedule lines cleanly", () => {
    assert.equal(
      formatPaymentModeHeadline("split", 50, 2, null),
      "Entrada de 50% + Saldo de 50%",
    );
    assert.equal(
      formatPaymentModeHeadline("installments", 50, 4, null),
      "Parcelado em 4x",
    );
    assert.equal(
      formatPaymentScheduleSummaryLine(
        {
          installment_number: 1,
          label: "Entrada (50%)",
          amount_cents: 50000,
          due_date: "2026-11-25",
          status: "paid",
        },
        100000,
      ),
      "Entrada (50%): R$\u00a0500,00 · venc. 25/11/2026 · pago",
    );
  });
});
