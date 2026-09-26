import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121E36]/40 backdrop-blur-sm animate-fadeIn">
      <div className={`relative w-full ${maxWidth} bg-[#FEFEFE] border border-[#B5C1C8] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#B5C1C8] bg-[#D6DCE0]">
          <h3 className="text-lg font-bold text-[#121E36] flex items-center gap-2">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#727A84] hover:text-[#121E36] hover:bg-[#C4CDD3] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-[#121E36]">
          {children}
        </div>
      </div>
    </div>
  );
}
