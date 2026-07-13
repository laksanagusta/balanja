import React from "react";
import { Icon } from "../components/primitives.jsx";
import { faqs } from "./content.js";

export default function FaqSection() {
  const [openIndex, setOpenIndex] = React.useState(0);

  return (
    <section id="faq" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">FAQ</p>
        <h2 className="mt-4 max-w-2xl text-[36px] font-semibold leading-[1.04] tracking-[-0.035em] text-text sm:text-[48px]">
          Pertanyaan yang sering ditanyakan.
        </h2>

        <div className="mt-10 border-t border-border">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const buttonId = `faq-button-${index}`;
            const panelId = `faq-panel-${index}`;

            return (
              <div key={faq.question} className="border-b border-border">
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="flex min-h-16 w-full items-center justify-between gap-6 py-5 text-left text-sm font-semibold text-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:text-base"
                >
                  {faq.question}
                  <Icon name={isOpen ? "minus" : "plus"} className="size-4 shrink-0 text-text-muted" />
                </button>
                {isOpen && (
                  <div id={panelId} role="region" aria-labelledby={buttonId} className="pb-5 pr-10 text-sm leading-7 text-text-muted sm:text-base">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
