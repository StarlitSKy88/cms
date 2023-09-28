import React, { useEffect } from 'react';

import { useQueryParams } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { useFindRedirectionLink, useSyncRbac } from '../../hooks';
import { resetProps, setLayout } from '../ListView/actions';

import Permissions from './Permissions';

const ListViewLayout = ({ layout, ...props }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [{ query, rawQuery }] = useQueryParams();
  const { permissions, isValid: isValidPermissions } = useSyncRbac(query, props.slug, 'listView');
  const redirectionLink = useFindRedirectionLink(props.slug);

  useEffect(() => {
    if (!rawQuery) {
      navigate(redirectionLink, { replace: true });
    }
  }, [rawQuery, redirectionLink, navigate]);

  useEffect(() => {
    dispatch(setLayout(layout));
  }, [dispatch, layout]);

  useEffect(() => {
    return () => {
      dispatch(resetProps());
    };
  }, [dispatch]);

  if (!isValidPermissions) {
    return null;
  }

  return <Permissions {...props} layout={layout} permissions={permissions} />;
};

ListViewLayout.propTypes = {
  layout: PropTypes.exact({
    components: PropTypes.object.isRequired,
    contentType: PropTypes.shape({
      attributes: PropTypes.object.isRequired,
      metadatas: PropTypes.object.isRequired,
      layouts: PropTypes.shape({
        list: PropTypes.array.isRequired,
      }).isRequired,
      options: PropTypes.object.isRequired,
      settings: PropTypes.object.isRequired,
      pluginOptions: PropTypes.object,
    }).isRequired,
  }).isRequired,
  slug: PropTypes.string.isRequired,
};

export default ListViewLayout;
