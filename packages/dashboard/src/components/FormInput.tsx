import type { InputHTMLAttributes } from 'react';

export type InputStatus = 'idle' | 'error' | 'success' | 'warning';

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string;
  label: string;
  status?: InputStatus;
  messages?: { text: string; type?: 'error' | 'success' | 'warning' }[];
}

const borderColors: Record<InputStatus, string> = {
  idle: 'border-gray-600',
  error: 'border-red-500',
  success: 'border-green-500',
  warning: 'border-amber-500',
};

const messageColors: Record<string, string> = {
  error: 'text-red-400',
  success: 'text-green-400',
  warning: 'text-amber-400',
};

export default function FormInput({
  id,
  label,
  status = 'idle',
  messages,
  className,
  ...inputProps
}: FormInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
        {label}
      </label>
      <input
        id={id}
        className={`w-full border rounded-md px-3 py-2 text-sm bg-gray-800 text-gray-200 ${borderColors[status]} focus:outline-none focus:ring-1 ${
          status === 'error'
            ? 'focus:ring-red-500'
            : status === 'success'
              ? 'focus:ring-green-500'
              : status === 'warning'
                ? 'focus:ring-amber-500'
                : 'focus:ring-yellow-500'
        } ${className ?? ''}`}
        {...inputProps}
      />
      {messages && messages.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {messages.map((msg) => (
            <li
              key={msg.text}
              className={`text-xs ${messageColors[msg.type ?? 'error']}`}
            >
              {msg.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
