import { Menu } from '@strapi/design-system/v2';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { useDataManager } from '../../../../hooks/useDataManager';
import { isAllowedContentTypesForRelations } from '../../../../utils';
import { ON_CHANGE_RELATION_TARGET } from '../../../FormModal/constants';

interface RelationTargetPickerProps {
  oneThatIsCreatingARelationWithAnother: string;
  target: string;
}

export const RelationTargetPicker = ({
  oneThatIsCreatingARelationWithAnother,
  target,
}: RelationTargetPickerProps) => {
  const { contentTypes, sortedContentTypesList } = useDataManager();
  const dispatch = useDispatch();
  // TODO: replace with an obj { relation: 'x', bidirctional: true|false }
  const allowedContentTypesForRelation = sortedContentTypesList.filter(
    isAllowedContentTypesForRelations
  );

  const { plugin = null, schema: { displayName } = { displayName: 'error' } } =
    contentTypes?.[target] ?? {};

  const handleSelect =
    ({
      uid,
      plugin,
      title,
      restrictRelationsTo,
    }: {
      uid: string;
      plugin: boolean;
      title: string;
      restrictRelationsTo: any;
    }) =>
    () => {
      const selectedContentTypeFriendlyName = plugin ? `${plugin}_${title}` : title;

      dispatch({
        type: ON_CHANGE_RELATION_TARGET,
        target: {
          value: uid,
          oneThatIsCreatingARelationWithAnother,
          selectedContentTypeFriendlyName,
          targetContentTypeAllowedRelations: restrictRelationsTo,
        },
      });
    };

  /**
   * TODO: This should be a Select but the design doesn't match the
   * styles of the select component and there isn't the ability to
   * change it correctly.
   */
  return (
    <Menu.Root>
      <MenuTrigger>{`${displayName} ${plugin ? `(from: ${plugin})` : ''}`}</MenuTrigger>
      <Menu.Content zIndex={5}>
        {allowedContentTypesForRelation.map(({ uid, title, restrictRelationsTo, plugin }) => (
          <Menu.Item key={uid} onSelect={handleSelect({ uid, plugin, title, restrictRelationsTo })}>
            {title}&nbsp;
            {plugin && <>(from: {plugin})</>}
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
};

/**
 * TODO: this needs to be solved in the Design-System
 */
const MenuTrigger = styled(Menu.Trigger)`
  svg {
    width: ${6 / 16}rem;
    height: ${4 / 16}rem;
  }
`;
