import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '@/components/ui/badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'success', 'warning', 'info', 'purple', 'jatim', 'jateng', 'jabar', 'india'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = { args: { children: 'Default', variant: 'default' } };
export const Success: Story = { args: { children: 'Lunas', variant: 'success' } };
export const Warning: Story = { args: { children: 'Belum Lunas', variant: 'warning' } };
export const Destructive: Story = { args: { children: 'Overdue', variant: 'destructive' } };
export const Purple: Story = { args: { children: 'Impor', variant: 'purple' } };

export const Wilayah: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge variant="jatim">Jawa Timur</Badge>
      <Badge variant="jateng">Jawa Tengah</Badge>
      <Badge variant="jabar">Jawa Barat</Badge>
      <Badge variant="india">India</Badge>
    </div>
  ),
};
