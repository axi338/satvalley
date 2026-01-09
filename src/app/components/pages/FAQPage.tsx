import { HelpCircle, MessageSquare, Send, Sparkles, Zap } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';

export function FAQPage() {
  const faqs = [
    {
      question: 'What is SAT Valley Architecture?',
      answer: 'SAT Valley is a premium, data-driven preparation platform calibrated for the official Digital SAT format. Our system focuses on precision-engineered practice nodes and granular performance analytics to help students achieve elite-tier results.',
    },
    {
      question: 'How do the adaptive practice nodes work?',
      answer: "Our engine mirrors the official adaptive logic. Performance in 'Module 1' determines the difficulty level of 'Module 2', providing a 100% realistic simulation of the actual test experience.",
    },
    {
      question: 'What defines the platform delta?',
      answer: 'We treat SAT preparation as an engineering problem. Our platform features native full-screen test modes, official-grade diagnostic tools, and a high-fidelity score report that matches the official Bluebook application exactly.',
    },
    {
      question: 'How is the final index calculated?',
      answer: 'We use official SAT equating algorithms. Raw points are converted to scaled scores (200-800 per section) based on module difficulty weighting, ensuring your practice results are statistically significant.',
    },
    {
      question: 'Is the content verified for logic accuracy?',
      answer: 'Yes. All instructional content and practice questions are audited by a panel of top 1% SAT specialists to ensure they align with official difficulty distributions and question architecture.',
    },
    {
      question: 'Can I review my logic mismatches?',
      answer: 'Absolutely. Every test session generates a comprehensive analytical report with item-by-item analysis, domain-specific performance bars, and detailed explanations for every response.',
    },
    {
      question: 'Is there a limit to session initialization?',
      answer: 'Platform access includes unlimited sessions for all active practice modules. Your performance history is preserved chronologically to track improvement over time.',
    },
    {
      question: 'Do you support mobile protocol?',
      answer: 'To maintain the integrity of the official Digital SAT experience, we strictly recommend desktop interface usage. Our high-fidelity testing interface is designed for standard screen dimensions.',
    },
  ];

  return (
    <div className="min-h-screen pt-40 pb-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border-white/20 shadow-xl mb-10 animate-in fade-in slide-in-from-bottom-4 bg-white/5">
            <HelpCircle className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.3em]">Knowledge Base & Support</span>
          </div>
          <h1 className="text-7xl lg:text-9xl font-black text-white mb-8 tracking-tighter leading-none italic">
            Support <span className="opacity-20 not-italic">Matrix.</span>
          </h1>
          <p className="text-2xl text-white/50 max-w-2xl mx-auto leading-relaxed font-bold">
            Find technical specifications and operational details
            regarding the SAT|Valley preparation architecture.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="glass-card p-10 lg:p-16 border-white/10 bg-white/[0.02]">
          <Accordion type="single" collapsible className="space-y-6">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white/5 border-white/10 rounded-3xl px-8 transition-all duration-500 overflow-hidden group/item data-[state=open]:bg-white/10 data-[state=open]:border-indigo-500/20 hover:bg-white/10"
              >
                <AccordionTrigger className="hover:no-underline py-8">
                  <span className="text-left font-black text-white tracking-tighter text-xl group-data-[state=open]/item:text-indigo-400 transition-colors uppercase leading-none">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-white/50 font-bold leading-relaxed pb-10 pl-1 border-t border-white/10 pt-8 text-lg">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Still have questions CTA */}
        <div className="mt-24">
          <div className="glass-card p-16 lg:p-24 text-center border-indigo-500/20 relative overflow-hidden group/support">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 -mr-32 -mt-32 rounded-full blur-3xl opacity-30 group-hover/support:scale-150 transition-transform duration-1000" />

            <h3 className="text-5xl font-black text-white mb-6 tracking-tighter italic">Technical Support <span className="opacity-20">Link.</span></h3>
            <p className="text-white/50 font-bold mb-12 max-w-md mx-auto text-lg leading-relaxed">
              If your query is not addressed above, our engineering support
              team is available via our official communication channels.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 relative z-10">
              <a
                href="mailto:ibroximovaxliddin6.5@gmail.com?subject=SAT Valley Technical Support"
                className="h-16 px-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl flex items-center gap-4 font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 hover:scale-105"
              >
                <MessageSquare className="w-5 h-5" />
                Direct Interface
              </a>
              <a
                href="https://t.me/satvalley_admin"
                target="_blank"
                rel="noopener noreferrer"
                className="h-16 px-10 border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-2xl flex items-center gap-4 font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105"
              >
                <Send className="w-5 h-5 text-indigo-400" />
                Telegram Node
              </a>
            </div>

            <div className="mt-16 flex items-center justify-center gap-8 opacity-20">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.4em]">Official SAT|Valley Protocol</span>
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
