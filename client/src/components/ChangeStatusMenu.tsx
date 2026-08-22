import { RefreshCw } from 'lucide-react';
import { Popover } from './Popover';
import { Button } from './Button';
import { StatusUpdateControl } from './StatusUpdateControl';

interface ChangeStatusMenuProps<T extends string> {
  current: T;
  statuses: T[];
  onUpdate: (status: T) => Promise<void>;
}

export function ChangeStatusMenu<T extends string>({ current, statuses, onUpdate }: ChangeStatusMenuProps<T>) {
  return (
    <Popover
      align="right"
      trigger={
        <Button variant="secondary">
          <RefreshCw className="h-4 w-4" />
          Change Status
        </Button>
      }
    >
      {() => (
        <div>
          <p className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted">Change status</p>
          <StatusUpdateControl current={current} statuses={statuses} onUpdate={onUpdate} />
        </div>
      )}
    </Popover>
  );
}
