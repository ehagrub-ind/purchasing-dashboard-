import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Combobox } from '@/components/ui/combobox';

const meta: Meta<typeof Combobox> = {
  title: 'UI/Combobox',
  component: Combobox,
};

export default meta;
type Story = StoryObj<typeof Combobox>;

const supplierOptions = [
  { value: '1', label: 'Dani', group: 'Jawa Timur' },
  { value: '2', label: 'Topik', group: 'Jawa Timur' },
  { value: '3', label: 'Gandi', group: 'Jawa Timur' },
  { value: '4', label: 'Regen', group: 'Jawa Timur' },
  { value: '5', label: 'Indra', group: 'Jawa Tengah' },
  { value: '6', label: 'Feri', group: 'Jawa Tengah' },
  { value: '7', label: 'Solihin', group: 'Jawa Tengah' },
  { value: '8', label: 'Uyi', group: 'Jawa Barat' },
  { value: '9', label: 'Kosim', group: 'Jawa Barat' },
];

function ComboboxDemo({ disabled }: { disabled?: boolean }) {
  const [value, setValue] = useState('');
  return (
    <div className="w-80">
      <Combobox
        options={supplierOptions}
        value={value}
        onChange={setValue}
        placeholder="Cari supplier..."
        disabled={disabled}
      />
      <p className="mt-2 text-sm text-muted-foreground">
        Selected: {value ? supplierOptions.find(o => o.value === value)?.label : '(kosong)'}
      </p>
    </div>
  );
}

export const Default: Story = { render: () => <ComboboxDemo /> };
export const Disabled: Story = { render: () => <ComboboxDemo disabled /> };
