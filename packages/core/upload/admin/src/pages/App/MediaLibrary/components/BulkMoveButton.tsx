import * as React from 'react';
import { Folder } from '@strapi/icons';
import { Button, Modal } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { BulkMoveDialog } from '../../../../components/BulkMoveDialog';
import type { Folder as FolderDefinition } from '../../../../../../shared/contracts/folders';
import type { File } from '../../../../../../shared/contracts/files';

interface FolderWithType extends FolderDefinition {
  type: string;
}

interface FileWithType extends File {
  type: string;
}

export interface BulkMoveButtonProps {
  onSuccess: () => void;
  currentFolder?: FolderWithType;
  selected?: Array<FolderWithType | FileWithType>;
}

export const BulkMoveButton = ({
  selected = [],
  onSuccess,
  currentFolder,
}: BulkMoveButtonProps) => {
  const { formatMessage } = useIntl();
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

  const handleConfirmMove = () => {
    setShowConfirmDialog(false);
    onSuccess();
  };

  return (
    <Modal.Root open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <Modal.Trigger>
        <Button variant="secondary" size="S" startIcon={<Folder />}>
          {formatMessage({ id: 'global.move', defaultMessage: 'Move' })}
        </Button>
      </Modal.Trigger>
      <BulkMoveDialog
        currentFolder={currentFolder}
        onClose={handleConfirmMove}
        selected={selected}
      />
    </Modal.Root>
  );
};
