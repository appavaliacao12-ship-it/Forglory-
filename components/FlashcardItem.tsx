
import React from 'react';
import { Flashcard } from '../types';
import { CheckCircle2, Clock, Stars } from 'lucide-react';

interface FlashcardListItemProps {
  card: Flashcard;
  onClick: (card: Flashcard) => void;
}

const FlashcardListItem: React.FC<FlashcardListItemProps> = ({ card, onClick }) => {
  const getMasteryColor = () => {
    switch (card.masteryLevel) {
      case 'mastered': return 'bg-emerald-500';
      case 'learning': return 'bg-amber-500';
      default: return 'bg-indigo-400';
    }
  };

  const getMasteryIcon = () => {
    switch (card.masteryLevel) {
      case 'mastered': return <CheckCircle2 size={12} className="text-emerald-500" />;
      case 'learning': return <Clock size={12} className="text-amber-500" />;
      default: return <Stars size={12} className="text-indigo-400" />;
    }
  };

  return (
    <button 
      onClick={() => onClick(card)}
      className="w-full group relative flex items-center gap-4 px-6 py-5 bg-white/40 hover:bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all rounded-3xl text-left"
    >
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getMasteryColor()}`} />
      
      <div className="flex-1 min-w-0 pr-6">
        <div 
          className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors"
          dangerouslySetInnerHTML={{ __html: card.question }}
        />
        <div className="flex items-center gap-2 mt-1.5 opacity-60">
          {getMasteryIcon()}
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
            {card.masteryLevel === 'mastered' ? 'Dominado' : card.masteryLevel === 'learning' ? 'Estudando' : 'Novo Card'}
          </span>
        </div>
      </div>
    </button>
  );
};

export default FlashcardListItem;
