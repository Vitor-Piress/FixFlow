import { forwardRef } from "react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { formatQuoteNumber } from "@/features/quotes/constants/quoteStatus";
import { formatDateBR } from "@/lib/dates";
import { formatCentsToBRL } from "@/lib/money";
import { formatQuantityBR, formatUnitShort } from "@/lib/units";
import { formatDocumentBR, formatPhoneBR } from "@/lib/utils";
import type { BusinessProfile } from "@/services/businessProfile.service";
import type { QuoteItem, QuoteWithItems } from "@/services/quotes.service";

interface QuoteDocumentPreviewProps {
  quote: QuoteWithItems;
  profile?: BusinessProfile | null;
}

function renderItemRows(items: QuoteItem[], showItemPrices: boolean) {
  return (
    <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-start justify-between gap-3 py-2.5 text-sm"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium break-words text-neutral-950">
              {item.description_snapshot}
            </p>
            {showItemPrices ? (
              <p className="mt-0.5 text-xs text-neutral-600 tabular-nums">
                {formatQuantityBR(item.quantity)}{" "}
                {formatUnitShort(item.unit_snapshot)} ×{" "}
                {formatCentsToBRL(item.unit_price_snapshot_cents)}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 text-right tabular-nums">
            {showItemPrices ? (
              <p className="font-semibold text-neutral-950">
                {formatCentsToBRL(item.subtotal_cents)}
              </p>
            ) : (
              <p className="text-xs font-medium text-neutral-700">
                {formatQuantityBR(item.quantity)}{" "}
                {formatUnitShort(item.unit_snapshot)}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// Forwarded ref keeps this pure-JSX surface ready for Phase 6 PDF/Image capture.
export const QuoteDocumentPreview = forwardRef<
  HTMLElement,
  QuoteDocumentPreviewProps
>(function QuoteDocumentPreview({ quote, profile }, ref) {
  const serviceItems = quote.items.filter(
    (item) => item.item_type === "service",
  );
  const materialItems = quote.items.filter(
    (item) => item.item_type === "material",
  );

  const businessName = profile?.business_name?.trim() || "FixFlow";
  const ownerName = profile?.owner_name?.trim() || null;
  const specialties = profile?.specialties?.trim() || null;
  const subtitleLine = specialties ?? (ownerName !== businessName ? ownerName : null);

  const formattedDocument = formatDocumentBR(profile?.document);
  const formattedProviderPhone = formatPhoneBR(profile?.phone);
  const formattedClientPhone = formatPhoneBR(quote.client_phone);

  const providerMetaParts = [
    specialties && ownerName && ownerName !== businessName ? ownerName : null,
    formattedDocument || null,
    formattedProviderPhone || null,
    profile?.email?.trim() || null,
    profile?.city_state?.trim() || null,
  ].filter(Boolean) as string[];

  return (
    <article
      ref={ref}
      className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 text-neutral-950"
    >
      <header className="border-b border-neutral-950 pb-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <BrandLogo size="sm" className="mt-0.5 text-neutral-950" />
            <div className="min-w-0 flex-1">
              <p className="break-words text-base leading-tight font-semibold text-neutral-950">
                {businessName}
              </p>
              {subtitleLine ? (
                <p className="mt-0.5 break-words text-xs leading-snug text-neutral-600">
                  {subtitleLine}
                </p>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 text-right tabular-nums">
            <p className="text-[11px] font-medium text-neutral-500">
              Orçamento
            </p>
            <p className="text-base leading-tight font-semibold text-neutral-950">
              {formatQuoteNumber(quote.quote_number)}
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex flex-col gap-1 border-t border-neutral-200 pt-2 text-[11px] leading-snug text-neutral-600 tabular-nums">
          {providerMetaParts.length > 0 ? (
            <p className="break-words">{providerMetaParts.join(" · ")}</p>
          ) : null}
          <p>
            Emissão {formatDateBR(quote.created_at)}
            {quote.valid_until
              ? ` · Validade ${formatDateBR(quote.valid_until)}`
              : ""}
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-1">
        <p className="text-xs font-medium text-neutral-500">Cliente</p>
        <p className="break-words text-base font-semibold text-neutral-950">
          {quote.client_name}
        </p>

        {quote.title ? (
          <p className="break-words text-sm text-neutral-700">{quote.title}</p>
        ) : null}

        {formattedClientPhone || quote.client_address ? (
          <p className="mt-0.5 break-words text-xs leading-relaxed text-neutral-600 tabular-nums">
            {[formattedClientPhone, quote.client_address]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-4">
        {quote.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-4 text-center text-xs text-neutral-600">
            Nenhum item adicionado neste orçamento.
          </p>
        ) : (
          <>
            {serviceItems.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-950">
                  <span>Serviços</span>
                  <span className="font-normal text-neutral-500">
                    {quote.show_item_prices ? "Subtotal" : "Quantidade"}
                  </span>
                </div>
                {renderItemRows(serviceItems, quote.show_item_prices)}
              </div>
            ) : null}

            {materialItems.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-950">
                  <span>Materiais e peças</span>
                  <span className="font-normal text-neutral-500">
                    {quote.show_item_prices ? "Subtotal" : "Quantidade"}
                  </span>
                </div>
                {renderItemRows(materialItems, quote.show_item_prices)}
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-3">
        {quote.show_item_prices ? (
          <>
            {(quote.adversity_fee_cents > 0 || quote.discount_cents > 0) && (
              <div className="flex items-center justify-between gap-2 text-xs text-neutral-600">
                <span>Subtotal dos itens</span>
                <span className="tabular-nums">
                  {formatCentsToBRL(quote.subtotal_cents)}
                </span>
              </div>
            )}

            {quote.adversity_fee_cents > 0 ? (
              <div className="flex items-start justify-between gap-2 text-xs text-neutral-600">
                <span className="min-w-0 break-words">
                  Taxa de adversidades
                  {quote.adversity_reason ? ` (${quote.adversity_reason})` : ""}
                </span>
                <span className="shrink-0 tabular-nums">
                  + {formatCentsToBRL(quote.adversity_fee_cents)}
                </span>
              </div>
            ) : null}

            {quote.discount_cents > 0 ? (
              <div className="flex items-center justify-between gap-2 text-xs text-neutral-600">
                <span>Desconto</span>
                <span className="tabular-nums">
                  - {formatCentsToBRL(quote.discount_cents)}
                </span>
              </div>
            ) : null}
          </>
        ) : null}

        <div
          className={
            quote.show_item_prices &&
            (quote.adversity_fee_cents > 0 || quote.discount_cents > 0)
              ? "flex items-baseline justify-between gap-2 border-t border-neutral-200 pt-2"
              : "flex items-baseline justify-between gap-2"
          }
        >
          <span className="text-sm font-semibold text-neutral-950">
            Valor total
          </span>
          <span className="text-xl font-semibold text-neutral-950 tabular-nums">
            {formatCentsToBRL(quote.total_cents)}
          </span>
        </div>
      </section>

      {quote.payment_terms || profile?.pix_key || quote.notes ? (
        <section className="flex flex-col gap-2.5 border-t border-neutral-200 pt-3 text-xs leading-relaxed text-neutral-700">
          {quote.payment_terms ? (
            <div>
              <p className="font-semibold text-neutral-950">
                Condições de pagamento
              </p>
              <p className="mt-0.5 break-words">{quote.payment_terms}</p>
            </div>
          ) : null}

          {profile?.pix_key ? (
            <div>
              <p className="font-semibold text-neutral-950">Chave Pix</p>
              <p className="mt-0.5 break-all tabular-nums">{profile.pix_key}</p>
            </div>
          ) : null}

          {quote.notes ? (
            <div>
              <p className="font-semibold text-neutral-950">Observações</p>
              <p className="mt-0.5 break-words whitespace-pre-line">
                {quote.notes}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <footer className="flex items-center justify-between gap-2 border-t border-neutral-200 pt-3 text-xs text-neutral-500">
        <BrandLogo size="sm" className="text-neutral-600" />
        <span className="truncate">{businessName}</span>
      </footer>
    </article>
  );
});
