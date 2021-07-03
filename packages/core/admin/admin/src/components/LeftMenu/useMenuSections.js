import { useEffect, useRef } from 'react';
import { useRBACProvider } from '@strapi/helper-plugin';
import { useSelector, useDispatch } from 'react-redux';
import getPluginSectionLinks from './utils/getPluginSectionLinks';
import getGeneralLinks from './utils/getGeneralLinks';
import { setSectionLinks, toggleIsLoading, unsetIsLoading } from './actions';
import toPluginLinks from './utils/toPluginLinks';
import selectMenuLinks from './selectors';

const useMenuSections = (plugins, shouldUpdateStrapi) => {
  const state = useSelector(selectMenuLinks);
  const dispatch = useDispatch();
  const { allPermissions } = useRBACProvider();

  // We are using a ref because we don't want our effect to have this in its dependencies array
  const generalSectionLinksRef = useRef(state.generalSectionLinks);
  const shouldUpdateStrapiRef = useRef(shouldUpdateStrapi);
  // Once in the app lifecycle the plugins should not be added into any dependencies array, in order to prevent
  // the effect to be run when another plugin is using one plugins internal api for instance
  // so it's definitely ok to use a ref here
  const pluginsRef = useRef(plugins);

  const toggleLoading = () => dispatch(toggleIsLoading());

  const resolvePermissions = async (permissions = allPermissions) => {
    const pluginsSectionLinks = toPluginLinks(pluginsRef.current);

    const authorizedPluginSectionLinks = await getPluginSectionLinks(
      permissions,
      pluginsSectionLinks
    );

    const authorizedGeneralSectionLinks = await getGeneralLinks(
      permissions,
      generalSectionLinksRef.current,
      shouldUpdateStrapiRef.current
    );

    dispatch(setSectionLinks(authorizedGeneralSectionLinks, authorizedPluginSectionLinks));
    dispatch(unsetIsLoading());
  };

  const resolvePermissionsRef = useRef(resolvePermissions);

  useEffect(() => {
    resolvePermissionsRef.current(allPermissions);
  }, [allPermissions, dispatch]);

  return { state, generateMenu: resolvePermissionsRef.current, toggleLoading };
};

export default useMenuSections;
