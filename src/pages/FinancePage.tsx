import { useSearchParams } from "react-router-dom";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/ui/SegmentedControl";
import { CashbookSection } from "@/features/finance/components/CashbookSection";
import { RecurringExpensesSection } from "@/features/finance/components/RecurringExpensesSection";

type FinanceTab = "cashbook" | "recurring";

const FINANCE_TAB_OPTIONS: readonly SegmentedOption<FinanceTab>[] = [
  { value: "cashbook", label: "Livro-Caixa" },
  { value: "recurring", label: "Despesas Fixas" },
];

function parseFinanceTab(raw: string | null): FinanceTab {
  if (raw === "recurring") {
    return "recurring";
  }

  return "cashbook";
}

export function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseFinanceTab(searchParams.get("tab"));

  function handleTabChange(nextTab: FinanceTab) {
    setSearchParams(
      nextTab === "cashbook" ? {} : { tab: nextTab },
      { replace: true },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        ariaLabel="Seções do financeiro"
        options={FINANCE_TAB_OPTIONS}
        value={activeTab}
        onChange={handleTabChange}
        idBase="finance"
        getTabId={(tab) => `finance-tab-${tab}`}
        getPanelId={(tab) => `finance-panel-${tab}`}
      />

      <div
        role="tabpanel"
        id={`finance-panel-${activeTab}`}
        aria-labelledby={`finance-tab-${activeTab}`}
        className="outline-none"
      >
        {activeTab === "cashbook" ? <CashbookSection /> : null}
        {activeTab === "recurring" ? <RecurringExpensesSection /> : null}
      </div>
    </div>
  );
}
