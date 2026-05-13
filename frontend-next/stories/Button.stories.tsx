import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Download } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: { control: 'select', options: ['default', 'sm', 'lg', 'icon'] },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { children: 'Buat PO Baru', variant: 'default' } };
export const Outline: Story = { args: { children: 'Export', variant: 'outline' } };
export const Destructive: Story = { args: { children: 'Hapus', variant: 'destructive' } };
export const Disabled: Story = { args: { children: 'Simpan', disabled: true } };
export const Small: Story = { args: { children: 'Filter', variant: 'secondary', size: 'sm' } };

export const WithIcons: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button><Plus className="mr-2 h-4 w-4" />Buat PO</Button>
      <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
      <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Hapus</Button>
    </div>
  ),
};
