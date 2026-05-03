'use client'

import { useState } from 'react'
import { Reveal } from './reveal'

interface FAQItem {
  question: string
  answer: string
}

const FAQ_DATA: FAQItem[] = [
  {
    question: 'What is Chidi and who is it for?',
    answer:
      'Chidi is an AI business assistant for social sellers. You manage customers, orders, and inventory just by chatting with Chidi. We also give your business a self-service Telegram channel where customers browse, ask, and order on their own. Perfect for fashion brands, boutiques, beauty vendors, and retail.',
  },
  {
    question: 'Do you support WhatsApp and Instagram?',
    answer:
      "Telegram is our launch channel. WhatsApp Business and Instagram integrations are actively in the works and shipping very soon. They will plug into the same Chidi you already know, so your customers, inventory, and orders carry over automatically.",
  },
  {
    question: 'How does Chidi handle my customer conversations?',
    answer:
      'Chidi powers a Telegram channel for your business that automatically answers questions, takes orders, and keeps full context of every customer. Nothing slips through, even after hours.',
  },
  {
    question: 'Can Chidi really help me track sales and orders?',
    answer:
      'Yes. Chidi automatically turns chats into trackable orders, tracks payment status, and keeps customer records organized. Get real-time insights into your sales without manual data entry or spreadsheets.',
  },
  {
    question: 'What makes Chidi different from other tools?',
    answer:
      'Chidi is built specifically for businesses that sell through chat. It works offline and syncs later (perfect for unreliable internet), supports multiple languages including local dialects, and understands the unique challenges of social commerce in Africa.',
  },
  {
    question: 'Is my customer data secure with Chidi?',
    answer:
      'Yes. We use enterprise-grade encryption and comply with international data protection regulations. Your data is private, secure, and never shared with third parties.',
  },
  {
    question: 'How quickly can I get started?',
    answer:
      'In minutes. Sign up, connect your Telegram channel, upload your inventory, and Chidi starts answering customers and tracking orders right away.',
  },
]

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * FAQ accordion. Two-column layout on lg+ (header on the left, items on the
 * right). Items animate height + opacity on toggle. Multiple items can be open
 * at once — the user opted out of the "single accordion" pattern in earlier
 * waves of the app.
 */
export default function FAQSection() {
  const [openItems, setOpenItems] = useState<number[]>([0])

  const toggleItem = (index: number) => {
    setOpenItems((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  return (
    <div id="faq" className="w-full flex justify-center items-start">
      <div className="flex-1 px-4 md:px-12 py-16 md:py-20 flex flex-col lg:flex-row justify-start items-start gap-6 lg:gap-12">
        <Reveal className="w-full lg:flex-1 flex flex-col justify-center items-start gap-4 lg:py-5">
          <h2 className="w-full flex flex-col justify-center text-[var(--chidi-text-primary)] font-semibold leading-tight md:leading-[44px] font-sans text-4xl tracking-tight">
            Frequently asked questions
          </h2>
          <p className="w-full text-[var(--chidi-text-secondary)] text-sm font-normal leading-[1.55] font-sans">
            Everything you need to know about
            <br className="hidden md:block" />
            running your business with Chidi.
          </p>
        </Reveal>

        <div className="w-full lg:flex-1 flex flex-col justify-center items-center">
          <div className="w-full flex flex-col">
            {FAQ_DATA.map((item, index) => {
              const isOpen = openItems.includes(index)
              return (
                <div
                  key={index}
                  className="w-full border-b border-[var(--chidi-border-default)] overflow-hidden"
                >
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full px-5 py-[18px] flex justify-between items-center gap-5 text-left hover:bg-[var(--chidi-surface)]/50 transition-colors duration-200"
                    aria-expanded={isOpen}
                  >
                    <div className="flex-1 text-[var(--chidi-text-primary)] text-[15px] font-medium leading-[1.4] font-sans">
                      {item.question}
                    </div>
                    <div className="flex justify-center items-center">
                      <ChevronDownIcon
                        className={`w-6 h-6 text-[var(--chidi-text-secondary)] transition-transform duration-300 ease-in-out ${
                          isOpen ? 'rotate-180' : 'rotate-0'
                        }`}
                      />
                    </div>
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 pb-[18px] text-[var(--chidi-text-secondary)] text-sm font-normal leading-[1.6] font-sans">
                        {item.answer}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
