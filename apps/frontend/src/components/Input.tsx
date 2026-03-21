import type { ReactNode } from "react";

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function Input({
  value,
  onChange,
  placeholder,
  className = "",
}: InputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-4 py-3 rounded-xl border-2 border-primary/30 bg-white text-text placeholder:text-text-light focus:outline-none focus:border-primary transition-colors ${className}`}
    />
  );
}

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-surface rounded-3xl shadow-xl p-6 ${className}`}
    >
      {children}
    </div>
  );
}
