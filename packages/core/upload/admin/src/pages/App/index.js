import React, { lazy, Suspense, useEffect } from 'react';

import { Main } from '@strapi/design-system';
import { LoadingIndicatorPage, useFocusWhenNavigate, useQueryParams } from '@strapi/helper-plugin';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { Route, Routes } from 'react-router-dom';

import { useConfig } from '../../hooks/useConfig';
import pluginID from '../../pluginId';
import { getTrad } from '../../utils';

import { MediaLibrary } from './MediaLibrary';

const ConfigureTheView = lazy(() =>
  import(/* webpackChunkName: "Upload_ConfigureTheView" */ './ConfigureTheView')
);

const Upload = () => {
  const {
    config: { isLoading, isError, data: config },
  } = useConfig();

  const [{ rawQuery }, setQuery] = useQueryParams();
  const { formatMessage } = useIntl();
  const title = formatMessage({ id: getTrad('plugin.name'), defaultMessage: 'Media Library' });

  useEffect(() => {
    if (isLoading || isError || rawQuery) {
      return;
    }
    setQuery({ sort: config.sort, page: 1, pageSize: config.pageSize });
  }, [isLoading, isError, config, rawQuery, setQuery]);

  useFocusWhenNavigate();

  return (
    <Main aria-busy={isLoading}>
      <Helmet title={title} />
      {isLoading && <LoadingIndicatorPage />}
      {rawQuery ? (
        <Suspense fallback={<LoadingIndicatorPage />}>
          <Routes>
            <Route path={`/plugins/${pluginID}`} Component={MediaLibrary} />
            <Route
              path={`/plugins/${pluginID}/configuration`}
              element={<ConfigureTheView config={config} />}
            />
          </Routes>
        </Suspense>
      ) : null}
    </Main>
  );
};

export default Upload;
