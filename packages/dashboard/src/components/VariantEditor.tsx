import type { Variant } from '../types';

type VariantEditorProps = {
  variants: Variant[];
  onChange: (variants: Variant[]) => void;
  errors?: string;
};

export default function VariantEditor({ variants, onChange, errors }: VariantEditorProps) {
  function addVariant() {
    onChange([...variants, { name: '', value: '', weight: 0 }]);
  }

  function removeVariant(index: number) {
    onChange(variants.filter((_, i) => i !== index));
  }

  function updateVariant(index: number, field: keyof Variant, rawValue: string) {
    const updated = variants.map((v, i) => {
      if (i !== index) return v;
      if (field === 'weight') {
        const parsed = parseInt(rawValue, 10);
        return { ...v, weight: isNaN(parsed) ? 0 : parsed };
      }
      return { ...v, [field]: rawValue };
    });
    onChange(updated);
  }

  function moveVariant(index: number, direction: 'up' | 'down') {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= variants.length) return;
    const updated = [...variants];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onChange(updated);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">Variants</label>
      {variants.map((variant, index) => (
        <div key={index} className="flex items-center gap-2 mb-2">
          <input
            type="text"
            placeholder="Name"
            aria-label={`Variant ${index + 1} name`}
            value={variant.name}
            onChange={(e) => updateVariant(index, 'name', e.target.value)}
            className="flex-1 border border-gray-600 rounded-md px-2 py-1 text-sm bg-gray-800 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Value"
            aria-label={`Variant ${index + 1} value`}
            value={variant.value}
            onChange={(e) => updateVariant(index, 'value', e.target.value)}
            className="flex-1 border border-gray-600 rounded-md px-2 py-1 text-sm bg-gray-800 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="Weight"
            aria-label={`Variant ${index + 1} weight`}
            value={variant.weight}
            onChange={(e) => updateVariant(index, 'weight', e.target.value)}
            className="w-20 border border-gray-600 rounded-md px-2 py-1 text-sm bg-gray-800 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            aria-label={`Move variant ${index + 1} up`}
            onClick={() => moveVariant(index, 'up')}
            disabled={index === 0}
            className="text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-sm px-1"
          >
            &#9650;
          </button>
          <button
            type="button"
            aria-label={`Move variant ${index + 1} down`}
            onClick={() => moveVariant(index, 'down')}
            disabled={index === variants.length - 1}
            className="text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-sm px-1"
          >
            &#9660;
          </button>
          <button
            type="button"
            aria-label={`Remove variant ${index + 1}`}
            onClick={() => removeVariant(index)}
            className="text-red-400 hover:text-red-300 text-sm px-1"
          >
            &times;
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addVariant}
        className="text-sm text-blue-400 hover:text-blue-300"
      >
        + Add Variant
      </button>
      {errors && <p className="text-sm text-red-400 mt-1">{errors}</p>}
    </div>
  );
}
